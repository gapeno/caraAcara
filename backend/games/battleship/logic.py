"""
Battleship — 2-player turn-based logic.

Rules:
  - Each player's fleet is placed randomly on their own board at game start.
  - Players alternate firing at a single cell on the opponent's board.
  - A cell is a hit if it holds part of a ship, a miss otherwise.
  - First to hit every ship cell on the opponent's board wins.

Ship positions are part of the shared state (there's no per-connection
filtering in this app), so hiding the opponent's unrevealed ships is done
client-side: the frontend only renders "ship" for cells it owns, or for
opponent cells that have already been hit.

State shape:
{
    "rows":           int,
    "cols":           int,
    "boards":         dict[str, list[list[cell]]],  # player_id → own board
    "players":        list[str],
    "current_player": str,
    "status":         str,   # "in_progress" | "win"
    "winner":         str | None,
}

Cell shape:
{
    "ship": bool,
    "hit":  bool,
}

Move shape:
{
    "row": int,
    "col": int,
}
"""

import random

ROWS = 8
COLS = 8
SHIP_SIZES = [4, 3, 3, 2]


def _empty_board(rows: int, cols: int) -> list:
    return [[{"ship": False, "hit": False} for _ in range(cols)] for _ in range(rows)]


def _place_ships(rows: int, cols: int) -> list:
    board = _empty_board(rows, cols)
    for size in SHIP_SIZES:
        while True:
            horizontal = random.choice([True, False])
            if horizontal:
                row = random.randint(0, rows - 1)
                col = random.randint(0, cols - size)
                cells = [(row, col + i) for i in range(size)]
            else:
                row = random.randint(0, rows - size)
                col = random.randint(0, cols - 1)
                cells = [(row + i, col) for i in range(size)]
            if all(not board[r][c]["ship"] for r, c in cells):
                for r, c in cells:
                    board[r][c] = {"ship": True, "hit": False}
                break
    return board


def _opponent(players: list, player_id: str) -> str:
    idx = players.index(player_id)
    return players[(idx + 1) % len(players)]


def initial_state(players: list) -> dict:
    ids = [p["id"] for p in players]
    return {
        "rows": ROWS,
        "cols": COLS,
        "boards": {pid: _place_ships(ROWS, COLS) for pid in ids},
        "players": ids,
        "current_player": ids[0],
        "status": "in_progress",
        "winner": None,
    }


def is_valid_move(state: dict, move: dict, player_id: str) -> bool:
    if state["status"] != "in_progress":
        return False
    if state["current_player"] != player_id:
        return False
    row, col = move.get("row"), move.get("col")
    if not isinstance(row, int) or not isinstance(col, int):
        return False
    if not (0 <= row < state["rows"] and 0 <= col < state["cols"]):
        return False
    opponent = _opponent(state["players"], player_id)
    return not state["boards"][opponent][row][col]["hit"]


def apply_move(state: dict, move: dict, player_id: str) -> dict:
    row, col = move["row"], move["col"]
    opponent = _opponent(state["players"], player_id)

    target_board = [r[:] for r in state["boards"][opponent]]
    target_board[row][col] = {**target_board[row][col], "hit": True}
    boards = {**state["boards"], opponent: target_board}

    all_sunk = all(cell["hit"] for r in target_board for cell in r if cell["ship"])
    if all_sunk:
        return {**state, "boards": boards, "status": "win", "winner": player_id}

    return {**state, "boards": boards, "current_player": opponent}
