"""
Connect Four — 2-player turn-based logic.

Rules:
  - Players alternate dropping a disc into a column; it falls to the lowest
    empty row (gravity).
  - First to connect four in a row (horizontal, vertical, or diagonal) wins.
  - Game ends in a draw if the board fills with no winner.

State shape:
{
    "rows":           int,
    "cols":           int,
    "board":          list[list[str|None]],  # [rows][cols], row 0 = top
    "players":        list[str],
    "current_player": str,
    "status":         str,   # "in_progress" | "win" | "draw"
    "winner":         str | None,
    "win_line":       list[[row, col]] | None,
}

Move shape:
{
    "col": int,
}
"""

ROWS = 6
COLS = 7

DIRECTIONS = [
    (0, 1),   # horizontal
    (1, 0),   # vertical
    (1, 1),   # diagonal ↘
    (1, -1),  # diagonal ↙
]


def initial_state(players: list) -> dict:
    ids = [p["id"] for p in players]
    return {
        "rows": ROWS,
        "cols": COLS,
        "board": [[None] * COLS for _ in range(ROWS)],
        "players": ids,
        "current_player": ids[0],
        "status": "in_progress",
        "winner": None,
        "win_line": None,
    }


def _lowest_empty_row(board: list, col: int) -> int | None:
    for row in range(len(board) - 1, -1, -1):
        if board[row][col] is None:
            return row
    return None


def is_valid_move(state: dict, move: dict, player_id: str) -> bool:
    if state["status"] != "in_progress":
        return False
    if state["current_player"] != player_id:
        return False
    col = move.get("col")
    if not isinstance(col, int) or not (0 <= col < state["cols"]):
        return False
    return _lowest_empty_row(state["board"], col) is not None


def _win_line_through(board: list, row: int, col: int, player_id: str, rows: int, cols: int):
    for dr, dc in DIRECTIONS:
        line = [(row, col)]
        for sign in (1, -1):
            r, c = row + dr * sign, col + dc * sign
            while 0 <= r < rows and 0 <= c < cols and board[r][c] == player_id:
                line.append((r, c))
                r += dr * sign
                c += dc * sign
        if len(line) >= 4:
            return [list(cell) for cell in line[:4]]
    return None


def apply_move(state: dict, move: dict, player_id: str) -> dict:
    rows, cols = state["rows"], state["cols"]
    board = [row[:] for row in state["board"]]

    col = move["col"]
    row = _lowest_empty_row(board, col)
    board[row][col] = player_id

    win_line = _win_line_through(board, row, col, player_id, rows, cols)
    if win_line:
        return {**state, "board": board, "status": "win", "winner": player_id, "win_line": win_line}

    if all(cell is not None for cell in board[0]):
        return {**state, "board": board, "status": "draw"}

    players = state["players"]
    next_player = players[(players.index(player_id) + 1) % len(players)]
    return {**state, "board": board, "current_player": next_player}
