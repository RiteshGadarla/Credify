from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List
from app.models.fact_check import ExtractClaimsRequest, ClaimExtractionResponse, AnalyzeClaimRequest, Claim
from app.agents.claim_parser_agent import ClaimParserAgent
from app.services.agent_orchestrator import AgentOrchestrator
from app.utils.logger import logger

router = APIRouter()

@router.post("/extract-claims", response_model=ClaimExtractionResponse)
async def extract_claims(req: ExtractClaimsRequest):
    try:
        logger.info(f"Extracting claims for text of length {len(req.text)}")
        parser = ClaimParserAgent()
        claims = await parser.run(req.text)
        logger.info(f"Extracted {len(claims)} claims successfully.")
        return ClaimExtractionResponse(claims=claims)
    except Exception as e:
        logger.error(f"Error during claim extraction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class AnalyzeRequest(BaseModel):
    text: str

@router.post("/analyze")
async def start_analysis(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    try:
        logger.info(f"Starting full analysis for text of length {len(req.text)}")
        task_id = await AgentOrchestrator.create_task(req.text)
        background_tasks.add_task(AgentOrchestrator.run_full_analysis, task_id, req.text)
        return {"task_id": task_id}
    except Exception as e:
        logger.error(f"Error starting full analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analyze/{task_id}")
async def get_analysis_status(task_id: str):
    logger.info(f"Fetching status for task {task_id}")
    task = await AgentOrchestrator.get_task(task_id)
    if not task:
        logger.warning(f"Task {task_id} not found.")
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("/analyze-claim")
async def analyze_single_claim(req: AnalyzeClaimRequest, background_tasks: BackgroundTasks):
    try:
        # For a single claim, we mock creating a task with a single predefined claim
        task_id = await AgentOrchestrator.create_task(req.claim)
        
        # Prepare the claim 
        claim_obj = Claim(claim=req.claim, status="VALID", confidence=1.0)
        
        # We need to initialize it in the task doc
        await AgentOrchestrator.update_task_status(task_id, "Analyzing claims...")
        await AgentOrchestrator.update_claim(task_id, claim_obj.claim, {"status": "Pending"})
        
        background_tasks.add_task(AgentOrchestrator.analyze_claim_pipeline, task_id, claim_obj)
        
        return {"task_id": task_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
