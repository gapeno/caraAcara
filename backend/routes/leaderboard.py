from fastapi import APIRouter
from leaderboard import leaderboard_store

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("")
def get_leaderboard(limit: int = 5):
    return leaderboard_store.top(limit)
