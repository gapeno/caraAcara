# caraAcara
A platform for creating and deploying 2p board games on the cloud.

## Running locally

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

To test with two separate players, open the share link from the game in an incognito window (incognito has its own localStorage, so it won't share your Player 1 role).

## Deploying to AWS

```bash
./deploy.sh
```

Requires: `aws` (configured), `node`, `npm`, `docker` (running), `jq`.
