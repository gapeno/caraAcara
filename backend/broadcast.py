"""
Realtime broadcast to connected clients.

Local dev (no WS_MANAGEMENT_ENDPOINT env var) keeps today's in-process
WebSocket rooms. In Lambda, connections live in DynamoDB (populated by
ws_handler.py's $connect/$disconnect) and broadcast happens via the API
Gateway Management API, since no process holds the sockets open.
"""
import os
from collections import defaultdict


class LocalBroadcaster:
    def __init__(self):
        self._rooms: dict = defaultdict(list)

    async def connect(self, game_id: str, ws) -> None:
        await ws.accept()
        self._rooms[game_id].append(ws)

    def disconnect(self, game_id: str, ws) -> None:
        try:
            self._rooms[game_id].remove(ws)
        except ValueError:
            pass

    async def broadcast(self, game_id: str, payload: dict) -> None:
        dead = []
        for ws in list(self._rooms[game_id]):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(game_id, ws)


class DynamoBroadcaster:
    def __init__(self, connections_table: str, management_endpoint: str):
        import boto3
        self._table = boto3.resource("dynamodb").Table(connections_table)
        self._client = boto3.client(
            "apigatewaymanagementapi", endpoint_url=management_endpoint,
        )

    async def broadcast(self, game_id: str, payload: dict) -> None:
        import json
        from botocore.exceptions import ClientError

        items = self._table.query(
            IndexName="GameIdIndex",
            KeyConditionExpression="gameId = :g",
            ExpressionAttributeValues={":g": game_id},
        ).get("Items", [])

        data = json.dumps(payload).encode("utf-8")
        for item in items:
            connection_id = item["connectionId"]
            try:
                self._client.post_to_connection(ConnectionId=connection_id, Data=data)
            except ClientError as e:
                if e.response["Error"]["Code"] == "GoneException":
                    self._table.delete_item(Key={"connectionId": connection_id})
                else:
                    raise


_management_endpoint = os.environ.get("WS_MANAGEMENT_ENDPOINT")
broadcaster = (
    DynamoBroadcaster(os.environ["CONNECTIONS_TABLE"], _management_endpoint)
    if _management_endpoint
    else LocalBroadcaster()
)
