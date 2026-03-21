from typing import List
from app.agents.base import BaseAgent
from app.models.fact_check import Evidence
from app.tools.scoring.credibility_engine import CredibilityEngine
from app.utils.logger import logger

class CredibilityScoringAgent(BaseAgent):
    """
    Agent responsible for assigning dynamic credibility scores based on a mathematical formula.
    """
    async def run(self, evidence_list: List[Evidence]) -> List[Evidence]:
        logger.info(f"CredibilityScoringAgent: Scoring {len(evidence_list)} evidence items.")
        for ev in evidence_list:
            score = CredibilityEngine.compute_score(ev, evidence_list)
            ev.credibility_score = score
        return evidence_list
