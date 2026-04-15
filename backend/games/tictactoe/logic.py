"""
Tic-Tac-Toe — pure game logic.

State shape (dict):
{
    "board": list,       # 9-cell flat array; None | player_id
    "players": list,     # [p1_id, p2_id]
    "current_player": str,
    "status": str,       # "in_progress" | "win" | "draw"
    "winner": str | None,
    "win_line": list | None,
}
"""
from typing import Optional

WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],  # rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8],  # cols
    [0, 4, 8], [2, 4, 6],             # diagonals
]


def _check_winner(board: list) -> Optional[dict]:
    for a, b, c in WIN_LINES:
        if board[a] and board[a] == board[b] == board[c]:
            return {"winner": board[a], "win_line": [a, b, c]}
    return None


def initial_state(players: list) -> dict:
    ids = [p["id"] for p in players]
    return {
        "board": [None] * 9,
        "players": ids,
        "current_player": ids[0],
        "status": "in_progress",
        "winner": None,
        "win_line": None,
    }


def is_valid_move(state: dict, move: dict, player_id: str) -> bool:
    if state["status"] != "in_progress":
        return False
    if state["current_player"] != player_id:
        return False
    index = move.get("index")
    if not isinstance(index, int) or not (0 <= index <= 8):
        return False
    return state["board"][index] is None


def apply_move(state: dict, move: dict, player_id: str) -> dict:
    board = state["board"].copy()
    board[move["index"]] = player_id

    win_result = _check_winner(board)
    if win_result:
        return {**state, "board": board, "status": "win", **win_result}

    if all(cell is not None for cell in board):
        return {**state, "board": board, "status": "draw"}

    players = state["players"]
    next_player = players[(players.index(player_id) + 1) % len(players)]
    return {**state, "board": board, "current_player": next_player}
