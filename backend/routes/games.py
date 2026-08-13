import secrets
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from games.registry import get_game_logic, get_game_meta, list_games
from storage import store
from broadcast import broadcaster

router = APIRouter(prefix="/games", tags=["games"])


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

class JoinGameRequest(BaseModel):
    player_id: str
    name: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _game_or_404(game_id: str) -> dict:
    game = store.get(game_id)
    if not game:
        raise HTTPException(status_code=404, detail=f"Game {game_id!r} not found")
    return game


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("")
def get_all_games():
    return list_games()


@router.post("")
def create_game(body: CreateGameRequest):
    try:
        logic = get_game_logic(body.game_type)
        meta = get_game_meta(body.game_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    players = [p.model_dump() for p in body.players]
    game_id = secrets.token_urlsafe(6)
    state = logic.initial_state(players)

    game = {
        "id": game_id,
        "game_type": body.game_type,
        "label": meta["label"],
        "players": players,
        "state": state,
    }
    store.save(game)
    return game


@router.get("/{game_id}")
def get_game(game_id: str):
    return _game_or_404(game_id)


@router.post("/{game_id}/join")
async def join_game(game_id: str, body: JoinGameRequest):
    game = _game_or_404(game_id)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    for p in game["players"]:
        if p["id"] == body.player_id:
            p["name"] = name
            break
    else:
        raise HTTPException(status_code=400, detail=f"Unknown player_id {body.player_id!r}")

    store.save(game)
    await broadcaster.broadcast(game_id, game)
    return game


@router.post("/{game_id}/moves")
async def make_move(game_id: str, body: MakeMoveRequest):
    game = _game_or_404(game_id)
    logic = get_game_logic(game["game_type"])

    if not logic.is_valid_move(game["state"], body.move, body.player_id):
        raise HTTPException(status_code=400, detail="Invalid move")

    game["state"] = logic.apply_move(game["state"], body.move, body.player_id)
    store.save(game)
    await broadcaster.broadcast(game_id, game)
    return game


@router.post("/{game_id}/reset")
async def reset_game(game_id: str):
    game = _game_or_404(game_id)
    logic = get_game_logic(game["game_type"])
    game["state"] = logic.initial_state(game["players"])
    store.save(game)
    await broadcaster.broadcast(game_id, game)
    return game


@router.websocket("/{game_id}/ws")
async def game_ws(game_id: str, websocket: WebSocket):
    game = store.get(game_id)
    if not game:
        await websocket.close(code=1008)
        return

    await broadcaster.connect(game_id, websocket)
    try:
        await websocket.send_json(game)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        broadcaster.disconnect(game_id, websocket)
