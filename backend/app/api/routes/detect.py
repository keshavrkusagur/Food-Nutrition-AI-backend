from fastapi import APIRouter, HTTPException
from app.schemas.detection import DetectionRequest, DetectionResponse

router = APIRouter()

@router.post("/", response_model=DetectionResponse)
async def run_detection(request: DetectionRequest):
    # TODO: wire up InferenceService
    raise HTTPException(status_code=501, detail="InferenceService not yet initialised")

@router.get("/history")
async def get_history(page: int = 1, limit: int = 20):
    return {"page": page, "limit": limit, "results": []}
