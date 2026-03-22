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
from app.agents.summary_agent import SummaryAgent

# AI Text Detection
from app.services.winston_service import detect_ai_text

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
        self.summarizer = SummaryAgent()

    @classmethod
    async def create_task(cls, text: str, source_type: str = "text", user_id: str = "") -> str:
        logger.info("AgentOrchestrator: Creating new task...")
        db = get_database()
        task_id = str(uuid.uuid4())
        doc = {
            "task_id": task_id,
            "text": text,
            "source_type": source_type,
            "status": "Initializing...",
            "claims": [],
            "user_id": user_id,
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
        
        # Build atomic set updates for the matched array element
        set_fields = {f"claims.$.{k}": v for k, v in update_data.items()}
        
        # Try to update existing claim directly
        result = await db[cls.COLLECTION].update_one(
            {"task_id": task_id, "claims.claim": claim_text},
            {"$set": set_fields}
        )
        
        # If the claim was not in the array, push a new one atomically
        if result.matched_count == 0:
            new_claim = {"claim": claim_text, **update_data}
            await db[cls.COLLECTION].update_one(
                {"task_id": task_id},
                {"$push": {"claims": new_claim}}
            )

    @classmethod
    async def get_task(cls, task_id: str) -> dict:
        db = get_database()
        doc = await db[cls.COLLECTION].find_one({"task_id": task_id}, {"_id": 0})
        return doc

    @classmethod
    async def update_task_ai_detection(cls, task_id: str, detection_result) -> None:
        """Stores the Winston AI detection result on the task document."""
        db = get_database()
        await db[cls.COLLECTION].update_one(
            {"task_id": task_id},
            {"$set": {"ai_detection": detection_result.model_dump()}}
        )

    async def _process_single_claim(self, task_id: str, claim: Claim, user_id: str = ""):
        try:
            db = get_database()
            
            # 1. Parse & Decompose
            await self.update_claim(task_id, claim.claim, {"status": "Generating queries..."})
            queries = await self.parser.decompose(claim.claim)
            
            # 2. Retrieve
            await self.update_claim(task_id, claim.claim, {"status": "Retrieving evidence..."})
            evidence_list = await self.retriever.run(queries)
            
            # 3. Score Credibility
            await self.update_claim(task_id, claim.claim, {"status": "Computing credibility..."})
            scored_evidence = await self.scorer.run(evidence_list)
            
            # Start Fake Streaming URLs Queue Animation
            await self.update_claim(task_id, claim.claim, {"status": "Streaming sources...", "streaming_sources": []})
            queue = []
            for ev in scored_evidence:
                queue.append(ev.model_dump())
                if len(queue) > 5:
                    queue.pop(0)
                await self.update_claim(task_id, claim.claim, {"streaming_sources": queue})
                await asyncio.sleep(0.5) # Simulate retrieval animation
            
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
            
            # 7. Summary
            await self.update_claim(task_id, claim.claim, {"status": "Generating summary explanation..."})
            summary_output = await self.summarizer.run(
                claim=claim.claim,
                verdict=final_output.verdict,
                confidence=final_output.confidence,
                evidence_list=scored_evidence
            )
            
            key_evidence_dicts = [e.model_dump() for e in final_output.key_evidence]
            final_claim_update = {
                "status": "Completed",
                "verdict": final_output.verdict,
                "confidence": final_output.confidence,
                "reasoning": final_output.reasoning,
                "summary": summary_output.summary,
                "key_points": summary_output.key_points,
                "key_evidence": key_evidence_dicts,
                "streaming_sources": key_evidence_dicts
            }
            
            # Update DB
            await self.update_claim(task_id, claim.claim, final_claim_update)
            
            # Save to history (user-scoped)
            history_record = {
                "task_id": task_id,
                "user_id": user_id,
                "claim": claim.claim,
                "verdict": final_output.verdict,
                "confidence": final_output.confidence,
                "summary": summary_output.summary,
                "key_points": summary_output.key_points,
                "sources": key_evidence_dicts,
                "timestamp": datetime.datetime.utcnow().isoformat()
            }
            await db["history"].insert_one(history_record)
            
        except Exception as e:
            logger.error(f"Error processing claim {claim.claim}: {e}")
            await self.update_claim(task_id, claim.claim, {"status": f"Failed: {str(e)}"})

    @classmethod
    async def analyze_claim_pipeline(cls, task_id: str, claim: Claim, user_id: str = ""):
        """Classmethod bridge for background tasks"""
        orchestrator = cls()

        # ── Winston AI Text Detection Gate ────────────────────────────────────────
        detection_result = await detect_ai_text(claim.claim)
        await cls.update_task_ai_detection(task_id, detection_result)
        if detection_result.is_ai_generated:
            logger.warning(
                f"Winston AI: Claim flagged as AI-generated "
                f"(human_score={detection_result.human_score:.1f})."
            )
        # ─────────────────────────────────────────────────────────────────────────

        await orchestrator._process_single_claim(task_id, claim, user_id)

    @classmethod
    async def run_full_analysis(cls, task_id: str, text: str, source_type: str = "text", user_id: str = ""):
        logger.info(f"AgentOrchestrator: Kicking off full analysis for task: {task_id}")
        orchestrator = cls()
        try:
            db = get_database()

            # ── Step 0: Winston AI Text Detection Gate ────────────────────────────────
            # Run BEFORE any claim parsing so synthetic inputs are flagged immediately.
            await cls.update_task_status(task_id, "Running AI content detection...")
            detection_result = await detect_ai_text(text)
            await cls.update_task_ai_detection(task_id, detection_result)
            if detection_result.is_ai_generated:
                logger.warning(
                    f"Winston AI: Input flagged as AI-generated "
                    f"(human_score={detection_result.human_score:.1f}). "
                    "Proceeding with fact-check (detection is informational)."
                )
            # ─────────────────────────────────────────────────────────────────────────

            await cls.update_task_status(task_id, "Extracting claims...")
            claims = await orchestrator.parser.run(text, source_type)
            
            # Check for rejected input (not a fact-checking query)
            rejected_claims = [c for c in claims if c.status == "REJECTED"]
            if rejected_claims:
                logger.info("Input rejected — not a fact-checking query.")
                await cls.update_task_status(
                    task_id,
                    "Completed - This doesn't appear to be a fact-checkable claim. "
                    "Please enter a factual statement or claim you'd like verified."
                )
                return
            
            valid_claims = [c for c in claims if c.status == "VALID"]
            if not valid_claims:
                logger.info("No valid claims found.")
                ambiguous_count = len([c for c in claims if c.status == "AMBIGUOUS"])
                if ambiguous_count > 0:
                    await cls.update_task_status(task_id, f"Completed - {ambiguous_count} ambiguous statement(s) found, but zero verifiable claims.")
                else:
                    await cls.update_task_status(task_id, "Completed - No valid claims found.")
                return

            await cls.update_task_status(task_id, "Analyzing claims...")
            
            for c in valid_claims:
                await cls.update_claim(task_id, c.claim, {"status": "Pending"})

            # Process all valid claims in parallel
            tasks = [orchestrator._process_single_claim(task_id, c, user_id) for c in valid_claims]
            await asyncio.gather(*tasks)

            await cls.update_task_status(task_id, "Completed")
            
        except Exception as e:
            logger.error(f"Full analysis failed: {e}")
            await cls.update_task_status(task_id, f"Failed: {str(e)}")
