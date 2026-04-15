from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from uuid import uuid4
from games.registry import get_game_logic, get_game_meta, list_games

router = APIRouter(prefix="/games", tags=["games"])

# In-memory store — replaced by DynamoDB in Phase 3
_store: dict = {}


# ── Request models ────────────────────────────────────────────────────────────

class Player(BaseModel):
    id: str
    name: str

class CreateGameRequest(BaseModel):
    game_type: str
    players: list[Player]

class MakeMoveRequest(BaseModel):
    player_id: str
    move: dict


# ── Helpers ───────────────────────────────────────────────────────────────────

def _game_or_404(game_id: str) -> dict:
    game = _store.get(game_id)
    if not game:
        raise HTTPException(status_code=404, detail=f"Game {game_id!r} not found")
    return game


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("")
def get_all_games():
    """GET /games — list all available game types."""
    return list_games()


@router.post("")
def create_game(body: CreateGameRequest):
    """POST /games — create a new game session."""
    try:
        logic = get_game_logic(body.game_type)
        meta = get_game_meta(body.game_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    players = [p.model_dump() for p in body.players]
    game_id = str(uuid4())
    state = logic.initial_state(players)

    _store[game_id] = {
        "id": game_id,
        "game_type": body.game_type,
        "label": meta["label"],
        "players": players,
        "state": state,
    }
    return _store[game_id]


@router.get("/{game_id}")
def get_game(game_id: str):
    """GET /games/:id — get current game state."""
    return _game_or_404(game_id)


@router.post("/{game_id}/moves")
def make_move(game_id: str, body: MakeMoveRequest):
    """POST /games/:id/moves — apply a player move."""
    game = _game_or_404(game_id)
    logic = get_game_logic(game["game_type"])

    if not logic.is_valid_move(game["state"], body.move, body.player_id):
        raise HTTPException(status_code=400, detail="Invalid move")

    game["state"] = logic.apply_move(game["state"], body.move, body.player_id)
    return game


@router.post("/{game_id}/reset")
def reset_game(game_id: str):
    """POST /games/:id/reset — restart the game."""
    game = _game_or_404(game_id)
    logic = get_game_logic(game["game_type"])
    game["state"] = logic.initial_state(game["players"])
    return game
