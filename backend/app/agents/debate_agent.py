import asyncio
from typing import List, Tuple
from app.agents.base import BaseAgent
from app.models.fact_check import Evidence, ProponentOutput, OpponentOutput
from app.utils.llm import generate_llm_response
from app.tools.utils.text_processing import parse_json_from_llm
from app.utils.logger import logger

class DebateAgent(BaseAgent):
    """
    Agent responsible for handling conflicting evidence by simulating multi-perspective reasoning (Proponent vs Opponent).
    """
    
    async def _run_proponent(self, claim: str, evidence_list: List[Evidence]) -> ProponentOutput:
        evidence_str = "\n".join([f"[{e.url}] {e.snippet}" for e in evidence_list])
        prompt = f"""
        Role: Proponent
        Goal: Argue that the claim is TRUE based *only* on the provided evidence.
        Behavior: Use supporting evidence, ignore contradictions. Highlight high-credibility sources.
        
        Claim: "{claim}"
        Evidence:
        {evidence_str}
        
        Output JSON exactly in this format:
        {{
            "arguments": ["arg1", "arg2"],
            "evidence_urls": ["url1"],
            "confidence": <float 0-1>
        }}
        """
        raw_res = await generate_llm_response(prompt, temperature=0.2)
        parsed = parse_json_from_llm(raw_res)
        
        used_evidence_urls = parsed.get("evidence_urls", [])
        used_evidence = [e for e in evidence_list if e.url in used_evidence_urls]
        
        return ProponentOutput(
            arguments=parsed.get("arguments", []),
            evidence=used_evidence if used_evidence else [e for i, e in enumerate(evidence_list) if i < 2],
            confidence=float(parsed.get("confidence", 0.5))
        )

    async def _run_opponent(self, claim: str, evidence_list: List[Evidence]) -> OpponentOutput:
        evidence_str = "\n".join([f"[{e.url}] {e.snippet}" for e in evidence_list])
        prompt = f"""
        Role: Opponent
        Goal: Argue that the claim is FALSE based *only* on the provided evidence.
        Behavior: Find contradictions, highlight weak sources, identify logical flaws.
        
        Claim: "{claim}"
        Evidence:
        {evidence_str}
        
        Output JSON exactly in this format:
        {{
            "arguments": ["arg1", "arg2"],
            "evidence_urls": ["url1"],
            "confidence": <float 0-1>
        }}
        """
        raw_res = await generate_llm_response(prompt, temperature=0.2)
        parsed = parse_json_from_llm(raw_res)
        
        used_evidence_urls = parsed.get("evidence_urls", [])
        used_evidence = [e for e in evidence_list if e.url in used_evidence_urls]
        
        return OpponentOutput(
            arguments=parsed.get("arguments", []),
            evidence=used_evidence if used_evidence else [e for i, e in enumerate(evidence_list) if i < 2],
            confidence=float(parsed.get("confidence", 0.5))
        )

    async def run(self, claim: str, evidence_list: List[Evidence]) -> Tuple[ProponentOutput, OpponentOutput]:
        logger.info(f"DebateAgent: Running multi-perspective reasoning for '{claim}'.")
        prop_task = self._run_proponent(claim, evidence_list)
        opp_task = self._run_opponent(claim, evidence_list)
        
        prop_out, opp_out = await asyncio.gather(prop_task, opp_task)
        return prop_out, opp_out
