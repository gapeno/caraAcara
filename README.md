# caraAcara

A cloud-native platform where players connect in real time for board games.

Just enter a name, pick a game, and share the link.

## Architecture

```
Browser ──HTTPS──► CloudFront ──frontend──► S3
                              └──backend──► ALB ──► ECS Fargate
```

- **Frontend:** React, served from S3 via CloudFront
- **Backend:** FastAPI running on ECS Fargate
- **Infrastructure:** AWS CDK

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
