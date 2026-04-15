"""
Game registry — the single place to register new games.

Each entry:
    id           — unique key used in API routes
    label        — display name
    description  — shown on game selection screen
    icon         — emoji icon
    min_players  — minimum players required
    max_players  — maximum players allowed
    logic        — module with: initial_state, is_valid_move, apply_move
"""

from games.tictactoe import logic as tictactoe_logic

REGISTRY: dict = {
    "tictactoe": {
        "id": "tictactoe",
        "label": "Tic-Tac-Toe",
        "description": "Classic 3×3 strategy game. First to three in a row wins.",
        "icon": "⭕",
        "min_players": 2,
        "max_players": 2,
        "logic": tictactoe_logic,
    },
    # Phase 2 — add more games here:
    # "minesweeper": { ... },
    # "guess_who": { ... },
}


def get_game_logic(game_type: str):
    entry = REGISTRY.get(game_type)
    if not entry:
        raise ValueError(f'Unknown game type: "{game_type}"')
    return entry["logic"]


def get_game_meta(game_type: str) -> dict:
    entry = REGISTRY.get(game_type)
    if not entry:
        raise ValueError(f'Unknown game type: "{game_type}"')
    return {k: v for k, v in entry.items() if k != "logic"}


def list_games() -> list:
    return [get_game_meta(game_type) for game_type in REGISTRY]
