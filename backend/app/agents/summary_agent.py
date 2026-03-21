import json
from typing import List, Dict, Any
from app.agents.base import BaseAgent
from app.models.fact_check import Evidence
from app.models.history import SummaryAgentOutput
from app.utils.gemini import generate_gemini_response
from app.utils.logger import logger

class SummaryAgent(BaseAgent):
    """
    Agent responsible for converting the pipeline output into a clear explanation.
    """
    async def run(self, 
                  claim: str, 
                  verdict: str,
                  confidence: float,
                  evidence_list: List[Evidence]) -> SummaryAgentOutput:
        
        logger.info(f"SummaryAgent: Generating summary for '{claim}'.")
        
        sources_text = "\n".join([
            f"Source - Title: {e.source}, URL: {e.url}, Snippet: {e.snippet}, Credibility: {e.credibility_score}"
            for e in evidence_list
        ])

        prompt = f"""
        Role: Summary Agent for an AI Fact-Checking Pipeline.
        You must convert the pipeline output into a clear, reader-friendly explanation for a general audience.

        Claim: "{claim}"
        Verdict: {verdict}
        System Confidence in Verdict: {confidence:.2f}
        
        Evidence Provided:
        {sources_text}

        Instructions:
        1. Explain why the claim was given the {verdict} verdict in simple terms.
        2. If the verdict is UNCERTAIN or CONFLICT, explicitly clarify to the reader that the "high confidence" score means the system is *highly confident that the evidence is conflicting or inconclusive*, not that it is unsure of its own analysis.
        3. Combine multiple evidence sources into one coherent narrative. Highlight consensus or conflicts. Note high vs low credibility signals.
        4. NEVER hallucinate. Use ONLY the provided evidence. Do NOT add outside knowledge.
        5. Output strictly in the following JSON format:
        {{
            "summary": "3 to 6 sentences, clear and concise explanation for a non-technical reader",
            "key_points": ["bullet 1", "bullet 2", "bullet 3"]
        }}
        """
        response_text = await generate_gemini_response(prompt, temperature=0.1)
        
        try:
            # Strip markdown formatting like ```json ... ```
            clean_text = response_text.replace('```json', '').replace('```', '').strip()
            data = json.loads(clean_text)
            return SummaryAgentOutput(
                summary=data.get("summary", ""),
                key_points=data.get("key_points", [])
            )
        except Exception as e:
            logger.error(f"Failed to parse SummaryAgent output: {e}. Raw response: {response_text}")
            return SummaryAgentOutput(
                summary="Failed to generate a readable summary. Please refer to the raw verdict and sources.",
                key_points=[]
            )
