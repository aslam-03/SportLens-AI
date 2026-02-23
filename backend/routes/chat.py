"""
Chat Route - Secure Gemini API Proxy

All AI calls go through this endpoint.
- Rate limiting: 1 request per 3 seconds per IP
- Domain restriction via keyword filtering
- Gemini API key NEVER exposed to client
- Graceful 429 handling (no automatic retry)
"""

import os
import time
import logging
import httpx
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field
from typing import List, Optional
from collections import defaultdict

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])

# ============================================================================
# Constants
# ============================================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent"
MAX_HISTORY_MESSAGES = 6
MAX_MESSAGE_LENGTH = 500

SYSTEM_PROMPT = (
    "You are SportLens AI Coach Assistant. "
    "You are an expert in cricket biomechanics, sports performance analysis, and fitness coaching. "
    "You only answer questions related to sports training, session analysis, form correction, injury prevention, and SportLens AI features. "
    "If a user asks anything outside sports or this app's domain, politely refuse. "
    "Keep answers concise, practical, and coaching-oriented. "
    "Do not discuss politics, programming, entertainment, or general trivia."
)

SPORTS_KEYWORDS = [
    "cricket", "fitness", "bowling", "batting", "squat", "posture",
    "knee", "hip", "angle", "training", "injury", "form", "session",
    "analysis", "coaching", "exercise", "sport", "athlete", "run",
    "running", "warm", "cooldown", "stretch", "muscle", "joint",
    "shoulder", "elbow", "wrist", "ankle", "biomechanics", "pose",
    "performance", "drill", "practice", "match", "pitch", "bat",
    "ball", "wicket", "catch", "throw", "spin", "pace", "speed",
    "endurance", "strength", "flexibility", "recovery", "nutrition",
    "diet", "hydration", "stamina", "cardio", "core", "physio",
    "physiotherapy", "sportlens", "coach", "workout", "rep", "set",
    "weight", "body", "arm", "leg", "back", "chest", "abs",
    "glute", "hamstring", "quad", "calf", "lunge", "deadlift",
    "bench", "plank", "pushup", "pullup", "crunch", "motion",
    "swing", "stride", "foot", "step", "health", "pain",
    "soreness", "prevent", "technique", "improve", "correction",
]

RESTRICTED_MESSAGE = (
    "I'm designed specifically to assist with sports performance, cricket, "
    "fitness training, and SportLens AI session analysis. "
    "Please ask a question related to those areas."
)

# ============================================================================
# Rate Limiter (per-IP, 1 request every 3 seconds)
# ============================================================================

_rate_limit_store: dict[str, float] = defaultdict(float)
RATE_LIMIT_SECONDS = 3.0


def check_rate_limit(client_ip: str) -> None:
    """Raise 429 if client is sending requests too fast."""
    now = time.time()
    last_request = _rate_limit_store.get(client_ip, 0)

    if now - last_request < RATE_LIMIT_SECONDS:
        wait_time = round(RATE_LIMIT_SECONDS - (now - last_request), 1)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {wait_time} seconds before sending another message.",
        )

    _rate_limit_store[client_ip] = now


# ============================================================================
# Request/Response Schemas
# ============================================================================

class ChatMessageSchema(BaseModel):
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    text: str = Field(..., description="Message content")

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User message")
    history: List[ChatMessageSchema] = Field(default_factory=list, description="Chat history")
    session_context: Optional[str] = Field(None, description="Optional session context")

class ChatResponse(BaseModel):
    reply: str = Field(..., description="Assistant reply")
    restricted: bool = Field(False, description="Whether the message was domain-restricted")

# ============================================================================
# Domain Filter
# ============================================================================

def is_sports_related(message: str) -> bool:
    """Check if the message contains at least one sports-related keyword."""
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in SPORTS_KEYWORDS)

# ============================================================================
# Chat Endpoint
# ============================================================================

@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Send a chat message to the AI coach",
)
async def chat(request: ChatRequest, raw_request: Request):
    """
    Process a chat message:
    1. Rate limit check
    2. Pre-filter for domain relevance
    3. Build Gemini request with system prompt + history (last 6, truncated)
    4. Return AI response (no retry on 429)
    """
    # Rate limit
    client_ip = raw_request.client.host if raw_request.client else "unknown"
    check_rate_limit(client_ip)

    # Validate API key
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service is not configured. Please contact the administrator.",
        )

    # Domain restriction pre-filter
    if not is_sports_related(request.message):
        logger.info(f"Blocked non-sports message: {request.message[:80]}...")
        return ChatResponse(reply=RESTRICTED_MESSAGE, restricted=True)

    # Build conversation contents for Gemini (last 6 messages, truncated)
    contents = []

    session_prefix = ""
    if request.session_context:
        session_prefix = f"[User Session Context: {request.session_context}]\n\n"

    history = request.history[-MAX_HISTORY_MESSAGES:]
    for msg in history:
        role = "user" if msg.role == "user" else "model"
        truncated_text = msg.text[:MAX_MESSAGE_LENGTH]
        contents.append({
            "role": role,
            "parts": [{"text": truncated_text}]
        })

    user_message = session_prefix + request.message if session_prefix else request.message
    contents.append({
        "role": "user",
        "parts": [{"text": user_message}]
    })

    request_body = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_PROMPT}]
        },
        "contents": contents,
    }

    # Call Gemini API
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json=request_body,
                headers={"Content-Type": "application/json"},
            )

        # Handle Gemini 429 — do NOT retry, pass through immediately
        if response.status_code == 429:
            logger.warning("Gemini API rate limited (429)")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="AI is temporarily busy. Please wait a few seconds.",
            )

        if response.status_code != 200:
            logger.error(f"Gemini API error: {response.status_code} - {response.text[:500]}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI service returned an error. Please try again.",
            )

        data = response.json()

        # Extract text from Gemini response
        candidates = data.get("candidates", [])
        if not candidates:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI service returned an empty response.",
            )

        parts = candidates[0].get("content", {}).get("parts", [])
        reply_text = parts[0].get("text", "") if parts else ""

        if not reply_text:
            reply_text = "I apologize, but I could not generate a response. Please try rephrasing your question."

        return ChatResponse(reply=reply_text, restricted=False)

    except httpx.TimeoutException:
        logger.error("Gemini API timeout")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="AI service timed out. Please try again.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again.",
        )
