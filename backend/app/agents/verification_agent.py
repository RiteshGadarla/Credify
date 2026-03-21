import asyncio
from typing import List, Dict, Any
from app.agents.base import BaseAgent
from app.models.fact_check import Evidence
from app.utils.gemini import generate_gemini_response
from app.tools.utils.text_processing import parse_json_from_llm
from app.utils.logger import logger

class VerificationAgent(BaseAgent):
    """
    Agent responsible for comparing claim vs evidence and determining initial truthfulness.
    """
    async def run(self, claim: str, evidence_list: List[Evidence]) -> Dict[str, Any]:
        logger.info(f"VerificationAgent: Verifying claim '{claim}'.")
        
        evidence_str = "\n".join([f"[{e.url}] {e.snippet} (Score: {e.credibility_score:.2f})" for e in evidence_list])
        prompt = f"""
        Role: Verifier
        Compare the claim against the provided evidence.
        Claim: "{claim}"
        Evidence:
        {evidence_str}
        
        Output JSON exactly in this format:
        {{
            "verdict": "TRUE" | "FALSE" | "PARTIAL" | "CONFLICT",
            "confidence": <float 0-1>,
            "reasoning": "Brief explanation"
        }}
        """
        raw_res = await generate_gemini_response(prompt, temperature=0.1)
        parsed = parse_json_from_llm(raw_res)
        
        return {
            "verdict": parsed.get("verdict", "CONFLICT"),
            "confidence": float(parsed.get("confidence", 0.5)),
            "reasoning": parsed.get("reasoning", "")
        }
