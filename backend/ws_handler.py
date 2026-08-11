"""
API Gateway WebSocket API Lambda handlers ($connect / $disconnect / $default).

Mangum only adapts HTTP-style API Gateway events, not WebSocket API events,
so these are plain Lambda entrypoints rather than routes on the FastAPI app.
"""
import os

import boto3

from storage import store

_connections_table = boto3.resource("dynamodb").Table(os.environ["CONNECTIONS_TABLE"])


def connect_handler(event, context):
    # Can't post_to_connection here: API Gateway hasn't finished the WebSocket
    # handshake until $connect returns 200, so the connection isn't reachable
    # yet. That's fine — the frontend fetches initial state via REST before
    # opening the socket; this handler only needs to register the connection
    # for later broadcasts.
    connection_id = event["requestContext"]["connectionId"]
    game_id = (event.get("queryStringParameters") or {}).get("game_id")

    game = store.get(game_id) if game_id else None
    if not game:
        return {"statusCode": 403}

    _connections_table.put_item(Item={"connectionId": connection_id, "gameId": game_id})
    return {"statusCode": 200}


def disconnect_handler(event, context):
    connection_id = event["requestContext"]["connectionId"]
    _connections_table.delete_item(Key={"connectionId": connection_id})
    return {"statusCode": 200}


def default_handler(event, context):
    return {"statusCode": 200}
