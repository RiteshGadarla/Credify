from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
from app.services.pdf_generator import build_pdf_report
import datetime

router = APIRouter()

class ReportRequest(BaseModel):
    report_type: str
    data: Dict[str, Any]

@router.post("/generate")
async def generate_report(req: ReportRequest):
    try:
        data = req.data.copy()
        data['report_type'] = req.report_type
        pdf_buffer = build_pdf_report(data)
        
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"credify_report_{timestamp}.pdf"
        
        return StreamingResponse(
            pdf_buffer, 
            media_type="application/pdf", 
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
