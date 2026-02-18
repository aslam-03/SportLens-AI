"""  
SportLens AI Backend - Phase 5

FastAPI backend for session management with SQLite persistence.

Features:
- POST /sessions: Store completed training sessions
- GET /sessions: Retrieve all sessions
- GET /sessions/{session_id}: Get specific session
- SQLite database for persistence
- CORS enabled for frontend communication
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import logging

# ============================================================================
# Logging Setup (must be before imports that use logger)
# ============================================================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# Configuration
# ============================================================================

# CORS settings - allow requests from frontend
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
API_PORT = int(os.getenv("API_PORT", 8000))
API_HOST = os.getenv("API_HOST", "0.0.0.0")

# Import our modules
from database import init_db, engine
from models import Base
from schemas import HealthCheckSchema
from auth import initialize_firebase

# Import routes with error handling
try:
    from routes.sessions import router as sessions_router
    logger.info("✅ Sessions router imported successfully")
except ImportError as e:
    logger.error(f"❌ Failed to import sessions router: {e}")
    raise

try:
    from routes.upload import router as upload_router
    logger.info("✅ Upload router imported successfully")
except ImportError as e:
    logger.error(f"❌ Failed to import upload router: {e}")
    raise

# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="SportLens AI Backend",
    description="AI-powered sports coaching backend with session persistence",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# ============================================================================
# CORS Middleware
# ============================================================================

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(f"✅ CORS enabled for origins: {ALLOWED_ORIGINS}")

# ============================================================================
# Startup & Shutdown
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize database and Firebase on startup."""
    try:
        logger.info("🚀 Starting SportLens AI Backend...")
        
        # Initialize database
        init_db()
        logger.info("✅ Database initialized successfully")
        
        # Initialize Firebase Admin SDK
        initialize_firebase()
        logger.info("✅ Firebase Admin initialized successfully")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("🛑 Shutting down SportLens AI Backend...")


# ============================================================================
# Health Check Endpoint
# ============================================================================

@app.get(
    "/health",
    response_model=HealthCheckSchema,
    summary="Health check endpoint",
    tags=["health"]
)
async def health_check():
    """
    Check if backend is running and database is accessible.
    """
    try:
        # Try to get a connection from the engine
        with engine.connect() as connection:
            pass
        
        return HealthCheckSchema(
            status="ok",
            database="connected",
            message="Backend is operational"
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed"
        )


# Include upload router
app.include_router(upload_router)

# ============================================================================
# Routes
# ============================================================================

# Include sessions router
app.include_router(sessions_router)

# ============================================================================
# Root Endpoint
# ============================================================================

@app.get("/", tags=["root"])
async def root():
    """Welcome endpoint."""
    return {
        "message": "🏋️ SportLens AI Backend",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }


# ============================================================================
# Error Handlers
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler."""
    logger.error(f"HTTP Exception: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )


# ============================================================================
# Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"🌐 Starting server on {API_HOST}:{API_PORT}")
    
    uvicorn.run(
        "main:app",
        host=API_HOST,
        port=API_PORT,
        reload=False,  # Disabled for testing
        log_level="info"
    )
