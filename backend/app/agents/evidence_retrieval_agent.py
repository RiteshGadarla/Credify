from typing import List
from app.agents.base import BaseAgent
from app.models.fact_check import Evidence
from app.tools.search.news_search import RealNewsRetrieval
from app.utils.logger import logger

class EvidenceRetrievalAgent(BaseAgent):
    """
    Agent responsible for fetching relevant articles/evidence using search tools.
    """
    async def run(self, queries: List[str]) -> List[Evidence]:
        logger.info(f"EvidenceRetrievalAgent: Retrieving evidence for {len(queries)} queries.")
        all_evidence = []
        for q in queries:
            res = await RealNewsRetrieval.search(q, 2)
            all_evidence.extend(res)
            
        # Deduplicate by url
        unique_evidence = {e.url: e for e in all_evidence}.values()
        return list(unique_evidence)
