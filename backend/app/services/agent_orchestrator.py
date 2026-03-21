import asyncio
import uuid
import datetime
from typing import Dict, Any, List
from app.utils.mongo import get_database
from app.utils.logger import logger
from app.models.fact_check import Claim

# Agents
from app.agents.claim_parser_agent import ClaimParserAgent
from app.agents.evidence_retrieval_agent import EvidenceRetrievalAgent
from app.agents.credibility_scoring_agent import CredibilityScoringAgent
from app.agents.verification_agent import VerificationAgent
from app.agents.debate_agent import DebateAgent
from app.agents.response_agent import ResponseAgent

class AgentOrchestrator:
    """
    Controls execution flow: User Input -> Parser -> Retriever -> Scorer -> Verifier -> (Debater) -> Responder -> Output
    """
    COLLECTION = "analysis_tasks"
    
    def __init__(self):
        self.parser = ClaimParserAgent()
        self.retriever = EvidenceRetrievalAgent()
        self.scorer = CredibilityScoringAgent()
        self.verifier = VerificationAgent()
        self.debater = DebateAgent()
        self.responder = ResponseAgent()

    @classmethod
    async def create_task(cls, text: str) -> str:
        logger.info("AgentOrchestrator: Creating new task...")
        db = get_database()
        task_id = str(uuid.uuid4())
        doc = {
            "task_id": task_id,
            "text": text,
            "status": "Initializing...",
            "claims": [],
            "created_at": datetime.datetime.utcnow()
        }
        await db[cls.COLLECTION].insert_one(doc)
        return task_id

    @classmethod
    async def update_task_status(cls, task_id: str, status: str):
        db = get_database()
        await db[cls.COLLECTION].update_one(
            {"task_id": task_id},
            {"$set": {"status": status}}
        )

    @classmethod
    async def update_claim(cls, task_id: str, claim_text: str, update_data: dict):
        db = get_database()
        doc = await db[cls.COLLECTION].find_one({"task_id": task_id})
        if not doc:
            return
            
        claims = doc.get("claims", [])
        updated = False
        for c in claims:
            if c["claim"] == claim_text:
                c.update(update_data)
                updated = True
                break
                
        if not updated:
            new_claim = {"claim": claim_text, **update_data}
            claims.append(new_claim)
            
        await db[cls.COLLECTION].update_one(
            {"task_id": task_id},
            {"$set": {"claims": claims}}
        )

    @classmethod
    async def get_task(cls, task_id: str) -> dict:
        db = get_database()
        doc = await db[cls.COLLECTION].find_one({"task_id": task_id}, {"_id": 0})
        return doc

    async def _process_single_claim(self, task_id: str, claim: Claim):
        try:
            # 1. Parse & Decompose
            await self.update_claim(task_id, claim.claim, {"status": "Generating queries..."})
            queries = await self.parser.decompose(claim.claim)
            
            # 2. Retrieve
            await self.update_claim(task_id, claim.claim, {"status": "Retrieving evidence..."})
            evidence_list = await self.retriever.run(queries)
            
            # 3. Score Credibility
            await self.update_claim(task_id, claim.claim, {"status": "Computing credibility..."})
            scored_evidence = await self.scorer.run(evidence_list)
            
            # 4. Verify
            await self.update_claim(task_id, claim.claim, {"status": "Verifying claim against evidence..."})
            verification_result = await self.verifier.run(claim.claim, scored_evidence)
            
            # 5. Debate (Optional, handles conflict)
            debate_results = None
            if verification_result["verdict"] == "CONFLICT" or verification_result["confidence"] < 0.6:
                await self.update_claim(task_id, claim.claim, {"status": "Conflict detected. Simulating multi-perspective debate..."})
                debate_results = await self.debater.run(claim.claim, scored_evidence)
            
            # 6. Final Response
            await self.update_claim(task_id, claim.claim, {"status": "Final verdict computation..."})
            final_output = await self.responder.run(
                claim=claim.claim,
                initial_verification=verification_result,
                evidence_list=scored_evidence,
                debate_results=debate_results
            )
            
            # Update DB
            await self.update_claim(task_id, claim.claim, {
                "status": "Completed",
                "verdict": final_output.verdict,
                "confidence": final_output.confidence,
                "reasoning": final_output.reasoning,
                "key_evidence": [e.model_dump() for e in final_output.key_evidence]
            })
            
        except Exception as e:
            logger.error(f"Error processing claim {claim.claim}: {e}")
            await self.update_claim(task_id, claim.claim, {"status": f"Failed: {str(e)}"})

    @classmethod
    async def analyze_claim_pipeline(cls, task_id: str, claim: Claim):
        """Classmethod bridge for background tasks"""
        orchestrator = cls()
        await orchestrator._process_single_claim(task_id, claim)

    @classmethod
    async def run_full_analysis(cls, task_id: str, text: str):
        logger.info(f"AgentOrchestrator: Kicking off full analysis for task: {task_id}")
        orchestrator = cls()
        try:
            await cls.update_task_status(task_id, "Extracting claims...")
            claims = await orchestrator.parser.run(text)
            
            valid_claims = [c for c in claims if c.status == "VALID"]
            
            if not valid_claims:
                await cls.update_task_status(task_id, "Completed - No valid claims found.")
                return

            await cls.update_task_status(task_id, "Analyzing claims...")
            
            for c in valid_claims:
                await cls.update_claim(task_id, c.claim, {"status": "Pending"})

            # Process all valid claims in parallel
            tasks = [orchestrator._process_single_claim(task_id, c) for c in valid_claims]
            await asyncio.gather(*tasks)

            await cls.update_task_status(task_id, "Completed")
            
        except Exception as e:
            logger.error(f"Full analysis failed: {e}")
            await cls.update_task_status(task_id, f"Failed: {str(e)}")
