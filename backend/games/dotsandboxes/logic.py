"""
Dots and Boxes — 2-player turn-based logic.

Rules:
  - Players alternate claiming edges between adjacent dots.
  - Completing the 4th side of a box claims it and earns an extra turn.
  - Game ends when all boxes are claimed.
  - Player with most boxes wins; equal scores are a draw.

State shape:
{
    "rows":           int,                   # number of dot rows
    "cols":           int,                   # number of dot cols
    "h_lines":        list[list[bool]],      # [rows][cols-1]  — horizontal edges
    "v_lines":        list[list[bool]],      # [rows-1][cols]  — vertical edges
    "boxes":          list[list[str|None]],  # [rows-1][cols-1] — owner player_id
    "players":        list[str],
    "current_player": str,
    "status":         str,                   # "in_progress" | "win" | "draw"
    "winner":         str | None,
    "scores":         dict[str, int],
}

Move shape:
{
    "type": "h" | "v",   # horizontal or vertical edge
    "row":  int,
    "col":  int,
}
"""

ROWS = 6   # dots
COLS = 6   # dots


def initial_state(players: list) -> dict:
    ids = [p["id"] for p in players]
    return {
        "rows": ROWS,
        "cols": COLS,
        "h_lines": [[False] * (COLS - 1) for _ in range(ROWS)],
        "v_lines": [[False] * COLS for _ in range(ROWS - 1)],
        "boxes":   [[None] * (COLS - 1) for _ in range(ROWS - 1)],
        "players": ids,
        "current_player": ids[0],
        "status": "in_progress",
        "winner": None,
        "scores": {pid: 0 for pid in ids},
    }


def is_valid_move(state: dict, move: dict, player_id: str) -> bool:
    if state["status"] != "in_progress":
        return False
    if state["current_player"] != player_id:
        return False
    t = move.get("type")
    row = move.get("row")
    col = move.get("col")
    if t not in ("h", "v") or not isinstance(row, int) or not isinstance(col, int):
        return False
    rows, cols = state["rows"], state["cols"]
    if t == "h":
        if not (0 <= row < rows and 0 <= col < cols - 1):
            return False
        return not state["h_lines"][row][col]
    else:
        if not (0 <= row < rows - 1 and 0 <= col < cols):
            return False
        return not state["v_lines"][row][col]


def apply_move(state: dict, move: dict, player_id: str) -> dict:
    rows, cols = state["rows"], state["cols"]
    h_lines = [r[:] for r in state["h_lines"]]
    v_lines = [r[:] for r in state["v_lines"]]
    boxes   = [r[:] for r in state["boxes"]]
    scores  = dict(state["scores"])

    t, row, col = move["type"], move["row"], move["col"]
    if t == "h":
        h_lines[row][col] = True
    else:
        v_lines[row][col] = True

    newly_completed = 0
    for r in range(rows - 1):
        for c in range(cols - 1):
            if boxes[r][c] is None:
                if (h_lines[r][c] and h_lines[r + 1][c] and
                        v_lines[r][c] and v_lines[r][c + 1]):
                    boxes[r][c] = player_id
                    scores[player_id] += 1
                    newly_completed += 1

    total_boxes = (rows - 1) * (cols - 1)
    total_claimed = sum(scores.values())

    # Completing a box earns another turn; otherwise pass to opponent
    if newly_completed > 0:
        next_player = player_id
    else:
        players = state["players"]
        next_player = players[(players.index(player_id) + 1) % len(players)]

    new_state = {
        **state,
        "h_lines": h_lines,
        "v_lines": v_lines,
        "boxes": boxes,
        "scores": scores,
        "current_player": next_player,
    }

    if total_claimed >= total_boxes:
        best = max(scores.values())
        winners = [p for p in state["players"] if scores[p] == best]
        if len(winners) == 1:
            return {**new_state, "status": "win", "winner": winners[0]}
        return {**new_state, "status": "draw", "winner": None}

    return new_state
