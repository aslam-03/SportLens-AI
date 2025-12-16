from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app = FastAPI(title="SportLens AI Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Session(BaseModel):
    id: str
    athlete: str
    status: str = "pending"


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/sessions", response_model=List[Session])
async def list_sessions() -> List[Session]:
    """Placeholder sessions endpoint until persistence is added."""
    return [
        Session(id="demo-1", athlete="Sample Athlete", status="pending"),
    ]


@app.post("/sessions", response_model=Session)
async def create_session(session: Session) -> Session:
    """Echo back the posted session until database support is wired up."""
    return session
