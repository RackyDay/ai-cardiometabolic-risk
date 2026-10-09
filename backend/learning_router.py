from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from medlineplus_service import MedlinePlusError, MedlinePlusService
from myhealthfinder_service import MyHealthfinderError, MyHealthfinderService
from schemas import LearningContentResponse, PreventionResponse

router = APIRouter()
_service = MedlinePlusService()
_prevention_service = MyHealthfinderService()


def get_learning_service():
    return _service


def get_prevention_service():
    return _prevention_service


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


@router.get("/prevention", response_model=PreventionResponse)
async def prevention(
    topic_ids: str = Query(default="", max_length=60, pattern=r"^(\d{1,6}(,\d{1,6}){0,5})?$"),
    age: Optional[int] = Query(default=None, ge=1, le=120),
    sex: Optional[Literal["male", "female"]] = None,
    tobacco_use: Optional[bool] = None,
    service: MyHealthfinderService = Depends(get_prevention_service),
):
    """Prevention recommendations for the Learn page's personalised section.

    topic_ids are curated MyHealthfinder topics for the user's flagged risk
    factors. Age and sex (both needed) add general recommendations; neither is
    stored or logged. No account data is read here.
    """
    ids = [int(topic_id) for topic_id in topic_ids.split(",") if topic_id]
    try:
        recommendations = await service.recommend(ids, age, sex, tobacco_use)
    except MyHealthfinderError as error:
        headers = {"Retry-After": str(error.retry_after)} if error.retry_after else None
        raise HTTPException(error.status_code, str(error), headers=headers) from None
    return PreventionResponse(recommendations=recommendations)
