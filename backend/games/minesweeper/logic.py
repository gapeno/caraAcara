"""
Minesweeper — 2-player turn-based logic.

Rules:
  - Players alternate turns on the same board.
  - Flagging does NOT spend a turn (it's a helper action).
  - Revealing a safe cell(s) advances the turn to the next player.
  - Revealing a mine → current player loses, opponent wins.
  - All safe cells revealed → player with most reveals wins (ties go to the
    player who did NOT take the last turn, i.e. the one who didn't trigger it).

State shape:
{
    "board":             list[list[cell]],
    "players":           list[str],
    "current_player":    str,
    "status":            "in_progress" | "win" | "loss",
    "winner":            str | None,
    "rows":              int,
    "cols":              int,
    "mines_count":       int,
    "flags_count":       int,
    "cells_revealed":    int,
    "scores":            dict[str, int],   # player_id → cells revealed
    "total_safe_cells":  int,
    "initialized":       bool,
}

Cell shape:
{
    "revealed":        bool,
    "flagged":         bool,
    "is_mine":         bool,
    "adjacent_mines":  int,
}
"""

import random

ROWS = 15
COLS = 20
MINES_COUNT = 45


# ── Helpers ───────────────────────────────────────────────────────────────────

def _empty_cell() -> dict:
    return {"revealed": False, "flagged": False, "is_mine": False, "adjacent_mines": 0}


def _neighbors(row: int, col: int) -> list:
    return [
        (row + dr, col + dc)
        for dr in (-1, 0, 1)
        for dc in (-1, 0, 1)
        if not (dr == 0 and dc == 0)
        and 0 <= row + dr < ROWS
        and 0 <= col + dc < COLS
    ]


def _place_mines(board: list, safe_row: int, safe_col: int) -> list:
    safe = {(safe_row, safe_col)} | set(_neighbors(safe_row, safe_col))
    candidates = [(r, c) for r in range(ROWS) for c in range(COLS) if (r, c) not in safe]
    mine_positions = set(map(tuple, random.sample(candidates, MINES_COUNT)))

    def adj(r, c):
        return sum(1 for nr, nc in _neighbors(r, c) if (nr, nc) in mine_positions)

    return [
        [
            {**board[r][c], "is_mine": (r, c) in mine_positions, "adjacent_mines": adj(r, c)}
            for c in range(COLS)
        ]
        for r in range(ROWS)
    ]


def _flood_fill(board: list, row: int, col: int) -> tuple:
    board = [r[:] for r in board]
    stack = [(row, col)]
    visited = set()
    revealed = 0

    while stack:
        r, c = stack.pop()
        if (r, c) in visited:
            continue
        visited.add((r, c))
        cell = board[r][c]
        if cell["revealed"] or cell["flagged"] or cell["is_mine"]:
            continue
        board[r][c] = {**cell, "revealed": True}
        revealed += 1
        if cell["adjacent_mines"] == 0:
            stack.extend((nr, nc) for nr, nc in _neighbors(r, c) if (nr, nc) not in visited)

    return board, revealed


def _next_player(players: list, current: str) -> str:
    idx = players.index(current)
    return players[(idx + 1) % len(players)]


def _tiebreak_winner(scores: dict, players: list, last_player: str) -> str:
    """Return the player with the highest score; on a tie, the one who did NOT go last."""
    best_score = max(scores.values())
    candidates = [p for p in players if scores[p] == best_score]
    if len(candidates) == 1:
        return candidates[0]
    return next(p for p in candidates if p != last_player)


# ── Public API ────────────────────────────────────────────────────────────────

def initial_state(players: list) -> dict:
    ids = [p["id"] for p in players]
    return {
        "board": [[_empty_cell() for _ in range(COLS)] for _ in range(ROWS)],
        "players": ids,
        "current_player": ids[0],
        "status": "in_progress",
        "winner": None,
        "rows": ROWS,
        "cols": COLS,
        "mines_count": MINES_COUNT,
        "flags_count": 0,
        "cells_revealed": 0,
        "scores": {pid: 0 for pid in ids},
        "total_safe_cells": ROWS * COLS - MINES_COUNT,
        "initialized": False,
    }


def is_valid_move(state: dict, move: dict, player_id: str) -> bool:
    if state["status"] != "in_progress":
        return False
    if state["current_player"] != player_id:
        return False
    action = move.get("action")
    if action not in ("reveal", "flag"):
        return False
    row, col = move.get("row"), move.get("col")
    if not isinstance(row, int) or not isinstance(col, int):
        return False
    if not (0 <= row < state["rows"] and 0 <= col < state["cols"]):
        return False
    cell = state["board"][row][col]
    if cell["revealed"]:
        return False
    return True


def apply_move(state: dict, move: dict, player_id: str) -> dict:
    row, col, action = move["row"], move["col"], move["action"]
    board = state["board"]

    # ── Flag toggle (does not advance turn) ───────────────────────────────────
    if action == "flag":
        board = [r[:] for r in board]
        cell = board[row][col]
        board[row][col] = {**cell, "flagged": not cell["flagged"]}
        flags_count = sum(c["flagged"] for r in board for c in r)
        return {**state, "board": board, "flags_count": flags_count}

    # ── Reveal ────────────────────────────────────────────────────────────────
    if not state["initialized"]:
        board = _place_mines(board, row, col)
        state = {**state, "board": board, "initialized": True}

    cell = board[row][col]

    # Hit a mine — reveal all mines, opponent wins
    if cell["is_mine"]:
        board = [
            [{**c, "revealed": True} if c["is_mine"] else c for c in r]
            for r in board
        ]
        winner = _next_player(state["players"], player_id)
        return {**state, "board": board, "status": "loss", "winner": winner}

    # Safe reveal — flood fill, update score, advance turn
    board, newly_revealed = _flood_fill(board, row, col)
    cells_revealed = state["cells_revealed"] + newly_revealed
    scores = {**state["scores"], player_id: state["scores"][player_id] + newly_revealed}
    next_player = _next_player(state["players"], player_id)

    if cells_revealed >= state["total_safe_cells"]:
        winner = _tiebreak_winner(scores, state["players"], player_id)
        return {**state, "board": board, "cells_revealed": cells_revealed,
                "scores": scores, "status": "win", "winner": winner}

    return {**state, "board": board, "cells_revealed": cells_revealed,
            "scores": scores, "current_player": next_player}
