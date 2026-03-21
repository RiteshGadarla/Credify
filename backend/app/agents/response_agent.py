from typing import List, Dict, Any, Optional
from app.agents.base import BaseAgent
from app.models.fact_check import Evidence, JudgeOutput, ProponentOutput, OpponentOutput
from app.utils.gemini import generate_gemini_response
from app.utils.logger import logger

class ResponseAgent(BaseAgent):
    """
    Agent responsible for producing the final structured output and verdict.
    """
    async def run(self, 
                  claim: str, 
                  initial_verification: Dict[str, Any], 
                  evidence_list: List[Evidence], 
                  debate_results: Optional[tuple[ProponentOutput, OpponentOutput]] = None) -> JudgeOutput:
        
        logger.info(f"ResponseAgent: Producing final response for '{claim}'.")
        
        if debate_results:
            prop, opp = debate_results
            prop_score = sum([prop.confidence * e.credibility_score for e in prop.evidence])
            opp_score = sum([opp.confidence * e.credibility_score for e in opp.evidence])
            
            if prop_score > opp_score * 1.5:
                verdict = "TRUE"
            elif opp_score > prop_score * 1.5:
                verdict = "FALSE"
            else:
                verdict = "UNCERTAIN"
                
            confidence = abs(prop_score - opp_score) / max((prop_score + opp_score), 1)
            confidence = min(max(confidence, 0.0), 1.0)
            if verdict == "UNCERTAIN":
                confidence = 1.0 - confidence
                
            prompt = f"""
            Role: Aggregator (Judge)
            Summarize the final reasoning.
            Claim: {claim}
            Proponent Score: {prop_score}
            Opponent Score: {opp_score}
            Computed Verdict: {verdict}
            Computed Confidence: {confidence}
            
            Write a concise paragraph explaining this reasoning. Return ONLY the explanation text.
            """
            reasoning = await generate_gemini_response(prompt, temperature=0.1)
            
            return JudgeOutput(
                verdict=verdict,
                confidence=confidence,
                reasoning=reasoning.strip(),
                key_evidence=evidence_list
            )
        else:
            # Format based on VerificationAgent's initial response
            return JudgeOutput(
                verdict=initial_verification.get("verdict", "UNCERTAIN"),
                confidence=initial_verification.get("confidence", 0.5),
                reasoning=initial_verification.get("reasoning", "No detailed reasoning provided."),
                key_evidence=evidence_list
            )
