"""
Leaderboard storage — cumulative scores across all games, keyed by player
display name (there are no user accounts; name is the only persistent
identity in this app).

Points: win +10, tie +5, loss +1.

`outcome` is always one of "win" / "tie" / "loss" — the same singular name
is used as the field that gets incremented, so there's no plural form to
keep in sync (and no "loss" -> "losses" irregular pluralization to get
wrong).

Local dev (no LEADERBOARD_TABLE env var) uses an in-memory dict, same
pattern as storage.py. In Lambda, LEADERBOARD_TABLE is set and scores are
persisted to DynamoDB so they survive across stateless invocations.
"""
import os
from decimal import Decimal

POINTS = {"win": 10, "tie": 5, "loss": 1}


def _to_native(item: dict) -> dict:
    return {k: (int(v) if isinstance(v, Decimal) else v) for k, v in item.items()}


class InMemoryLeaderboardStore:
    def __init__(self):
        self._scores: dict = {}

    def record(self, name: str, outcome: str) -> None:
        entry = self._scores.setdefault(
            name, {"name": name, "score": 0, "win": 0, "tie": 0, "loss": 0}
        )
        entry["score"] += POINTS[outcome]
        entry[outcome] += 1

    def top(self, limit: int) -> list:
        ranked = sorted(self._scores.values(), key=lambda e: e["score"], reverse=True)
        return ranked[:limit]


class DynamoLeaderboardStore:
    def __init__(self, table_name: str):
        import boto3
        self._table = boto3.resource("dynamodb").Table(table_name)

    def record(self, name: str, outcome: str) -> None:
        self._table.update_item(
            Key={"name": name},
            UpdateExpression="ADD score :points, #outcome :one",
            ExpressionAttributeNames={"#outcome": outcome},
            ExpressionAttributeValues={":points": POINTS[outcome], ":one": 1},
        )

    def top(self, limit: int) -> list:
        items = [_to_native(item) for item in self._table.scan().get("Items", [])]
        ranked = sorted(items, key=lambda e: e.get("score", 0), reverse=True)
        return ranked[:limit]


_leaderboard_table = os.environ.get("LEADERBOARD_TABLE")
leaderboard_store = (
    DynamoLeaderboardStore(_leaderboard_table) if _leaderboard_table else InMemoryLeaderboardStore()
)
