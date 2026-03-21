from typing import List
from app.agents.base import BaseAgent
from app.models.fact_check import Claim
from app.utils.gemini import generate_gemini_response
from app.tools.utils.text_processing import parse_json_from_llm
from app.utils.logger import logger

class ClaimParserAgent(BaseAgent):
    """
    Agent responsible for extracting claims and generating search queries.
    """
    async def run(self, text: str) -> List[Claim]:
        """Extracts claims from raw text."""
        logger.info("ClaimParserAgent: Extracting claims from text.")
        prompt = f"""
        Analyze the following text and extract high-quality atomic claims.
        - Resolve pronouns and entities.
        - Remove opinions and subjective statements.
        - Split compound sentences into atomic claims.
        - Mark unclear/subjective claims as "AMBIGUOUS", and factual ones as "VALID".
        
        Output JSON exactly in this format:
        {{
            "claims": [
                {{ "claim": "...", "status": "VALID" | "AMBIGUOUS", "confidence": <float 0-1> }}
            ]
        }}
        
        Text: {text}
        """
        raw_res = await generate_gemini_response(prompt, temperature=0.1)
        parsed = parse_json_from_llm(raw_res)
        claims_data = parsed.get("claims", [])
        return [Claim(**c) for c in claims_data]

    async def decompose(self, claim: str) -> List[str]:
        """Decomposes a single claim into search queries."""
        logger.info(f"ClaimParserAgent: Decomposing claim '{claim}'.")
        prompt = f"""
        Role: Decomposer
        Task: Generate 2-3 specific search queries to verify this claim.
        Claim: "{claim}"
        
        Output JSON exactly in this format:
        {{ "queries": ["query1", "query2"] }}
        """
        raw_res = await generate_gemini_response(prompt, temperature=0.2)
        parsed = parse_json_from_llm(raw_res)
        return parsed.get("queries", [])
