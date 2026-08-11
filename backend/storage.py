"""
Game state storage.

Local dev (no GAMES_TABLE env var) uses an in-memory dict — same behavior
as before. In Lambda, GAMES_TABLE is set and state is persisted to DynamoDB
so it survives across stateless invocations.
"""
import os


class InMemoryGameStore:
    def __init__(self):
        self._store: dict = {}

    def get(self, game_id: str) -> dict | None:
        return self._store.get(game_id)

    def save(self, game: dict) -> None:
        self._store[game["id"]] = game


class DynamoGameStore:
    def __init__(self, table_name: str):
        import boto3
        self._table = boto3.resource("dynamodb").Table(table_name)

    def get(self, game_id: str) -> dict | None:
        return self._table.get_item(Key={"id": game_id}).get("Item")

    def save(self, game: dict) -> None:
        self._table.put_item(Item=game)


_games_table = os.environ.get("GAMES_TABLE")
store = DynamoGameStore(_games_table) if _games_table else InMemoryGameStore()
