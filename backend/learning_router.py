from fastapi import APIRouter, Depends, HTTPException, Query

from medlineplus_service import MedlinePlusError, MedlinePlusService
from schemas import LearningContentResponse

router = APIRouter()
_service = MedlinePlusService()


def get_learning_service():
    return _service


@router.get("/learn", response_model=LearningContentResponse)
async def learn(
    query: str = Query(default="", max_length=200),
    limit: int = Query(default=3, ge=1, le=5),
    service: MedlinePlusService = Depends(get_learning_service),
):
    """Public education search. No account or assessment data is required."""
    query = " ".join(query.split())
    try:
        articles = await service.search(query, limit)
    except MedlinePlusError as error:
        headers = {"Retry-After": str(error.retry_after)} if error.retry_after else None
        raise HTTPException(error.status_code, str(error), headers=headers) from None
    return LearningContentResponse(query=query, articles=articles)
