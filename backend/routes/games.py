from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from uuid import uuid4
from collections import defaultdict
from games.registry import get_game_logic, get_game_meta, list_games

router = APIRouter(prefix="/games", tags=["games"])

# In-memory store — replaced by DynamoDB in Phase 3
_store: dict = {}


# ── WebSocket connection manager ──────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self._rooms: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, game_id: str, ws: WebSocket):
        await ws.accept()
        self._rooms[game_id].append(ws)

    def disconnect(self, game_id: str, ws: WebSocket):
        try:
            self._rooms[game_id].remove(ws)
        except ValueError:
            pass

    async def broadcast(self, game_id: str, payload: dict):
        dead = []
        for ws in list(self._rooms[game_id]):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(game_id, ws)


manager = ConnectionManager()


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
    return list_games()


@router.post("")
def create_game(body: CreateGameRequest):
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
    return _game_or_404(game_id)


@router.post("/{game_id}/moves")
async def make_move(game_id: str, body: MakeMoveRequest):
    game = _game_or_404(game_id)
    logic = get_game_logic(game["game_type"])

    if not logic.is_valid_move(game["state"], body.move, body.player_id):
        raise HTTPException(status_code=400, detail="Invalid move")

    game["state"] = logic.apply_move(game["state"], body.move, body.player_id)
    await manager.broadcast(game_id, game)
    return game


@router.post("/{game_id}/reset")
async def reset_game(game_id: str):
    game = _game_or_404(game_id)
    logic = get_game_logic(game["game_type"])
    game["state"] = logic.initial_state(game["players"])
    await manager.broadcast(game_id, game)
    return game


@router.websocket("/{game_id}/ws")
async def game_ws(game_id: str, websocket: WebSocket):
    if game_id not in _store:
        await websocket.close(code=1008)
        return

    await manager.connect(game_id, websocket)
    try:
        await websocket.send_json(_store[game_id])
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(game_id, websocket)
