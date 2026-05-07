# caraAcara

A cloud-native platform for 2-player board games. Players connect in real time via WebSockets.

Just enter a name, pick a game, and share the link.

## Architecture

```
Browser ──HTTPS──► CloudFront ──► S3
                              └──► ALB ──► ECS Fargate
```

- **Frontend** — React, served from S3 via CloudFront
- **Backend** — FastAPI running on ECS Fargate, reachable at `/games/*`
- **Infrastructure** — AWS CDK in `infra/`

<details>
<summary>## Adding a game</summary>

1. Create `backend/games/<name>/logic.py` with three functions:

2. Register it in `backend/games/registry.py`:

3. Add a React component in `frontend/src/games/<name>/` and register it in `frontend/src/games/components.js`.
</details>

<details>
<summary>## Running locally</summary>

**Terminal 1 — backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Terminal 2 — frontend**
```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000.

To test with two separate players, open the share link from the lobby in an incognito window — incognito has its own `localStorage`, so it won't share your Player 1 identity.
</details>

<details>
<summary>## Deploying to AWS</summary>

```bash
aws login
./deploy.sh
```

The script builds the frontend and then deploys everything.
</details>

<details>
<summary>## Project structure</summary>

```
caraAcara/
├── backend/
│   ├── main.py               # FastAPI app entry point
│   ├── routes/games.py       # REST + WebSocket endpoints
│   └── games/
│       ├── registry.py       # Game registry
│       ├── tictactoe/
│       └── minesweeper/
├── frontend/
│   └── src/
│       ├── pages/            # HomePage, LobbyPage, GamePage
│       ├── games/            # Per-game React components
│       ├── hooks/            # useGameState (WebSocket hook)
│       └── api/gameApi.js    # REST helpers
└── infra/
    └── lib/stack.ts          # CDK stack (VPC, ECS, S3, CloudFront)
```
</details>

## License

[MIT](LICENSE)
