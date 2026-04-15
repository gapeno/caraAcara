from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.games import router as games_router

app = FastAPI(title="CaraAcara API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(games_router)


@app.get("/health")
def health():
    return {"status": "ok"}
