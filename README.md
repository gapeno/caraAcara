# caraAcara

A cloud-native platform where players connect in real time for board games.

Just enter a name, pick a game, and share the link.

## Architecture

```
Browser ──HTTPS──► CloudFront ──► S3 (frontend)
        ──HTTPS──► API Gateway (HTTP API)      ──► Lambda ──► DynamoDB
        ──WSS────► API Gateway (WebSocket API) ──► Lambda ──► DynamoDB
```

- **Frontend:** React, served from S3 via CloudFront; reads API URLs from a runtime `/config.json`
- **Backend:** FastAPI (via Mangum) on Lambda for REST, plain Lambda handlers for the WebSocket API's `$connect`/`$disconnect`/`$default` routes, DynamoDB for game state and connection tracking
- **Infrastructure:** infra as code with AWS CDK

## Deploy
<details>
<summary>Local</summary>

**Terminal 1 - backend**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Terminal 2 - frontend**

```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000.

To test with two separate players, open the share link from the lobby in an incognito window.
</details>

<details>
<summary>Production</summary>

```bash
aws login
./deploy.sh
```

The script builds the frontend and then deploys everything.
</details>

## Project structure
<details>

```
caraAcara/
├── backend/
│   ├── main.py               # FastAPI app entry point
│   ├── lambda_handler.py     # Mangum entrypoint for the REST Lambda
│   ├── ws_handler.py         # $connect/$disconnect/$default Lambda handlers
│   ├── storage.py            # Game state store (in-memory locally, DynamoDB in Lambda)
│   ├── broadcast.py          # Realtime broadcast (in-process locally, API Gateway Management API in Lambda)
│   ├── routes/games.py       # REST endpoints + local-dev WebSocket route
│   └── games/
│       ├── registry.py       # Game registry
│       ├── tictactoe/
│       └── minesweeper/
├── frontend/
│   ├── public/config.json    # Runtime API URLs (overwritten by CDK on deploy)
│   └── src/
│       ├── pages/            # HomePage, LobbyPage, GamePage
│       ├── games/            # Per-game React components
│       ├── hooks/            # useGameState (WebSocket hook)
│       ├── config.js         # Loads /config.json
│       └── api/gameApi.js    # REST + WebSocket URL helpers
└── infra/
    └── lib/stack.ts          # CDK stack (Lambda, DynamoDB, API Gateway, S3, CloudFront)
```

</details>

## License

[MIT](LICENSE)
