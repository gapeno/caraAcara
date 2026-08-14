"""
Guess Who? — 2-player secret-identity guessing game.

This app is for two people playing face to face, so the actual
"is your character wearing a hat?" questioning happens by voice between
the players — the server only needs to track two deterministic things:
who picked which secret character, and whose guesses are right or wrong.

Rules:
  - Both players secretly pick a character from the roster ("choosing").
  - Once both have picked, players alternate guessing the opponent's
    character. A correct guess wins immediately; a wrong guess passes
    the turn.

State shape:
{
    "roster":         list[{"id": str, "name": str, "emoji": str}],
    "players":        list[str],
    "secrets":        dict[str, str | None],   # player_id → chosen character id
    "current_player": str | None,              # None during "choosing"
    "status":         str,   # "choosing" | "in_progress" | "win"
    "winner":         str | None,
    "last_guess":     {"player": str, "character_id": str, "correct": bool} | None,
}

Move shape:
{
    "action":       "choose" | "guess",
    "character_id": str,
}
"""

import random

ROSTER = [
    {"id": "santa", "name": "Santa", "emoji": "🎅"},
    {"id": "mrs_claus", "name": "Mrs. Claus", "emoji": "🤶"},
    {"id": "wizard", "name": "Waldo the Wizard", "emoji": "🧙‍♂️"},
    {"id": "witch", "name": "Wanda the Witch", "emoji": "🧙‍♀️"},
    {"id": "dracula", "name": "Count Draculair", "emoji": "🧛‍♂️"},
    {"id": "draculina", "name": "Countess Fangula", "emoji": "🧛‍♀️"},
    {"id": "zombie_barry", "name": "Brains Barry", "emoji": "🧟‍♂️"},
    {"id": "zombie_zelda", "name": "Zelda the Zombie", "emoji": "🧟‍♀️"},
    {"id": "captain_obvious", "name": "Captain Obvious", "emoji": "🦸‍♂️"},
    {"id": "ultra_val", "name": "Ultra Val", "emoji": "🦸‍♀️"},
    {"id": "agent_nacho", "name": "Agent Nacho", "emoji": "🕵️‍♂️"},
    {"id": "agent_pickles", "name": "Agent Pickles", "emoji": "🕵️‍♀️"},
    {"id": "major_tom", "name": "Major Tom", "emoji": "👨‍🚀"},
    {"id": "commander_luna", "name": "Commander Luna", "emoji": "👩‍🚀"},
    {"id": "pirate", "name": "Captain Rusty", "emoji": "🏴‍☠️"},
    {"id": "mermaid", "name": "Marina the Mermaid", "emoji": "🧜‍♀️"},
]

ROSTER_IDS = {c["id"] for c in ROSTER}


def _opponent(players: list, player_id: str) -> str:
    idx = players.index(player_id)
    return players[(idx + 1) % len(players)]


def initial_state(players: list) -> dict:
    ids = [p["id"] for p in players]
    return {
        "roster": random.sample(ROSTER, len(ROSTER)),
        "players": ids,
        "secrets": {pid: None for pid in ids},
        "current_player": None,
        "status": "choosing",
        "winner": None,
        "last_guess": None,
    }


def is_valid_move(state: dict, move: dict, player_id: str) -> bool:
    action = move.get("action")
    character_id = move.get("character_id")
    if character_id not in ROSTER_IDS:
        return False

    if action == "choose":
        return state["status"] == "choosing" and state["secrets"][player_id] is None

    if action == "guess":
        return state["status"] == "in_progress" and state["current_player"] == player_id

    return False


def apply_move(state: dict, move: dict, player_id: str) -> dict:
    character_id = move["character_id"]

    if move["action"] == "choose":
        secrets = {**state["secrets"], player_id: character_id}
        if all(secret is not None for secret in secrets.values()):
            return {**state, "secrets": secrets, "status": "in_progress",
                    "current_player": state["players"][0]}
        return {**state, "secrets": secrets}

    # action == "guess"
    opponent = _opponent(state["players"], player_id)
    correct = character_id == state["secrets"][opponent]
    last_guess = {"player": player_id, "character_id": character_id, "correct": correct}

    if correct:
        return {**state, "status": "win", "winner": player_id, "last_guess": last_guess}

    return {**state, "current_player": opponent, "last_guess": last_guess}
