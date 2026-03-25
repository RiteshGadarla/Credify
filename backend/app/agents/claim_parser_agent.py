from datetime import datetime, timezone, timedelta
from typing import List
from app.agents.base import BaseAgent
from app.models.fact_check import Claim
from app.utils.llm import generate_llm_response
from app.tools.utils.text_processing import parse_json_from_llm
from app.utils.logger import logger


class ClaimParserAgent(BaseAgent):
    """
    Agent responsible for extracting claims and generating search queries.
    Includes off-topic detection and injects current date for temporal context.
    """

    async def run(self, text: str, source_type: str = "text") -> List[Claim]:
        """Extracts claims from raw text."""
        logger.info("ClaimParserAgent: Extracting claims from text.")

        # Inject current date for temporal context
        utc_now = datetime.now(timezone.utc)

        # IST = UTC + 5:30
        ist_now = utc_now + timedelta(hours=5, minutes=30)

        # Format both
        utc_today = utc_now.strftime("%A, %B %d, %Y UTC")
        ist_today = ist_now.strftime("%A, %B %d, %Y IST")

        # Limit token usage for url
        if source_type == "url":
            text = text[:15000]

        system_instruction = ""
        if source_type == "image":
            system_instruction = "SYSTEM NOTE: This text is extracted from a image using OCR. There may be typos. Please accommodate.\n"
        elif source_type == "url":
            system_instruction = "SYSTEM NOTE: This text is extracted from a WebPage. Extract only useful text and be concise in order to get a MAX of 4 most important fact checks.\n"

        prompt = f"""
        Today's date is: {ist_today} ({utc_today})
        You are a claim extraction engine for a FACT-CHECKING system.
        
        STEP 1 — INPUT VALIDATION:
        First, determine if the user's text is a factual claim or statement that can be investigated.
        
        REJECT the input (status: "REJECTED") if it is:
        - A request to generate content (e.g., "write code", "create an image", "compose a poem")
        - A question asking for help (e.g., "how do I...", "what is the best way to...")
        - A conversational greeting or chitchat (e.g., "hello", "how are you")
        - A command or instruction (e.g., "translate this", "summarize this article")
        - Completely nonsensical or gibberish text
        
        If the input is REJECTED, return exactly:
        {{
            "claims": [
                {{ "claim": "<original text>", "status": "REJECTED", "confidence": 1.0 }}
            ]
        }}
        
        STEP 2 — CLAIM EXTRACTION (only if input is a valid fact-checking query):
        - Resolve pronouns and entities.
        - Split compound sentences into atomic claims.
        - Characterizations, accusations, and evaluative statements (e.g., "X is propaganda",
          "Y is corrupt", "Z is biased") ARE investigable — mark them as "VALID".
        - Only mark claims as "AMBIGUOUS" if they are purely personal preferences or
          completely vague with no investigable angle (e.g., "I like pizza", "things are bad").
        - When in doubt, lean toward "VALID" — let the evidence pipeline decide truthfulness.
        
        Output JSON exactly in this format:
        {{
            "claims": [
                {{ "claim": "...", "status": "VALID" | "AMBIGUOUS" | "REJECTED", "confidence": <float 0-1> }}
            ]
        }}
        
        {system_instruction}
        Text: {text}
        """
        raw_res = await generate_llm_response(prompt, temperature=0.1)
        logger.info(f"ClaimParserAgent raw llm output: {raw_res.strip()}")
        parsed = parse_json_from_llm(raw_res)
        claims_data = parsed.get("claims", [])

        for c in claims_data:
            if "status" in c and isinstance(c.get("status"), str):
                c["status"] = c["status"].strip().upper()

        return [Claim(**c) for c in claims_data]

    async def decompose(self, claim: str) -> List[str]:
        """Decomposes a single claim into search queries."""
        logger.info(f"ClaimParserAgent: Decomposing claim '{claim}'.")

        today = datetime.now(timezone.utc).strftime("%A, %B %d, %Y")

        prompt = f"""
        Today's date is: {today}
        
        Role: Decomposer
        Task: Generate 2-3 specific search queries to verify this claim.
        Use today's date for temporal context when relevant.
        Claim: "{claim}"
        
        Output JSON exactly in this format:
        {{ "queries": ["query1", "query2"] }}
        """
        raw_res = await generate_llm_response(prompt, temperature=0.2)
        parsed = parse_json_from_llm(raw_res)
        return parsed.get("queries", [])
