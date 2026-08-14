import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.games import router as games_router
from routes.leaderboard import router as leaderboard_router

app = FastAPI(title="CaraAcara API", version="0.1.0")

cors_origin = os.environ.get("CORS_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[cors_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(games_router)
app.include_router(leaderboard_router)


@app.get("/health")
def health():
    return {"status": "ok"}
