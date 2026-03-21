from pydantic import BaseModel, Field
from typing import List

class SummaryAgentOutput(BaseModel):
    summary: str
    key_points: List[str]

class HistoryRecord(BaseModel):
    id: str = Field(alias="_id", default=None)
    task_id: str
    claim: str
    verdict: str
    status: str
    confidence: float
    summary: str = ""
    key_points: List[str] = []
    sources: List[dict] = []
    timestamp: str
