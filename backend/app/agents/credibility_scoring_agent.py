from typing import List
from app.agents.base import BaseAgent
from app.models.fact_check import Evidence
from app.tools.scoring.credibility_engine import CredibilityEngine
from app.utils.logger import logger


class CredibilityScoringAgent(BaseAgent):
    """
    Agent responsible for assigning multi-dimensional credibility scores
    to each evidence item using the CredibilityEngine.

    Stores both the final scalar score and the full component breakdown
    on each Evidence object for downstream explainability.
    """

    async def run(self, evidence_list: List[Evidence]) -> List[Evidence]:
        logger.info(
            f"CredibilityScoringAgent: Scoring {len(evidence_list)} evidence items."
        )
        for ev in evidence_list:
            result = CredibilityEngine.compute_score(ev, evidence_list)
            ev.credibility_score = result.final_score
            ev.credibility_breakdown = result.model_dump()
        return evidence_list
