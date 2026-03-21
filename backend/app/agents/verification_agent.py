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
    Now includes credibility score breakdowns so the LLM can reason about *why*
    each source scored the way it did.
    """

    async def run(self, claim: str, evidence_list: List[Evidence]) -> Dict[str, Any]:
        logger.info(f"VerificationAgent: Verifying claim '{claim}'.")

        evidence_lines = []
        for e in evidence_list:
            line = f"[{e.url}] {e.snippet} (Score: {e.credibility_score:.2f}"
            # Include key breakdown signals if available
            if e.credibility_breakdown and "components" in e.credibility_breakdown:
                comps = e.credibility_breakdown["components"]
                line += (
                    f" | Freshness: {comps.get('freshness', 'N/A')}"
                    f", Trust: {comps.get('domain_trust', 'N/A')}"
                    f", Agreement: {comps.get('agreement', 'N/A')}"
                )
            if e.credibility_breakdown and e.credibility_breakdown.get("is_outdated"):
                line += " | ⚠️ OUTDATED"
            line += ")"
            evidence_lines.append(line)

        evidence_str = "\n".join(evidence_lines)
        prompt = f"""
        Role: Verifier
        Compare the claim against the provided evidence.
        Each evidence item includes a credibility score breakdown — use it to weight
        your assessment. Prefer recent, high-trust, well-corroborated sources.
        
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
            "reasoning": parsed.get("reasoning", ""),
        }
