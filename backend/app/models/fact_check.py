from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Literal

class Claim(BaseModel):
    claim: str
    status: Literal["VALID", "AMBIGUOUS"]
    confidence: float

class ClaimExtractionResponse(BaseModel):
    claims: List[Claim]

class ExtractClaimsRequest(BaseModel):
    text: str

class DecomposerOutput(BaseModel):
    queries: List[str]

class Evidence(BaseModel):
    source: str
    url: str
    content: str
    snippet: str
    credibility_score: float = 0.0
    domain_age_days: int = 0
    words_count: int = 0
    number_of_numbers: int = 0
    number_of_links: int = 0

class AgentArgumentOutput(BaseModel):
    arguments: List[str]
    evidence_urls: List[str]
    confidence: float

class ProponentOutput(BaseModel):
    arguments: List[str]
    evidence: List[Evidence] = []
    confidence: float

class OpponentOutput(BaseModel):
    arguments: List[str]
    evidence: List[Evidence] = []
    confidence: float

class JudgeOutput(BaseModel):
    verdict: Literal["TRUE", "FALSE", "UNCERTAIN"]
    confidence: float
    reasoning: str
    key_evidence: List[Evidence]

class AnalyzeClaimRequest(BaseModel):
    claim: str

class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    claims: List[dict]
