from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
import logging
import io

from app.services.input_processor import extract_text_from_image, extract_content_from_url

router = APIRouter()
logger = logging.getLogger(__name__)

class TextProcessRequest(BaseModel):
    text: str

class URLProcessRequest(BaseModel):
    url: str

class ProcessedResponse(BaseModel):
    text: str
    title: Optional[str] = None
    images: Optional[List[str]] = None

@router.post("/process-text", response_model=ProcessedResponse)
async def process_text_endpoint(request: TextProcessRequest):
    """
    Handle plain text submissions.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
        
    return ProcessedResponse(text=request.text)

@router.post("/process-image", response_model=ProcessedResponse)
async def process_image_endpoint(file: UploadFile = File(...)):
    """
    Handle image uploads and perform OCR.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")
    
    try:
        contents = await file.read()
        extracted_text = extract_text_from_image(contents)
        
        if not extracted_text.strip():
            raise HTTPException(status_code=422, detail="No text detected in the image")
            
        return ProcessedResponse(text=extracted_text)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image processing endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-url", response_model=ProcessedResponse)
async def process_url_endpoint(request: URLProcessRequest):
    """
    Handle URL submissions and extract article content.
    """
    try:
        result = extract_content_from_url(request.url)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
            
        return ProcessedResponse(
            text=result.get("text", ""),
            title=result.get("title", ""),
            images=result.get("images", [])
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"URL processing endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
