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

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import sqlite3
import json
import os
from datetime import datetime

# ============================================================================
# Configuration
# ============================================================================

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
DATABASE_PATH = os.getenv("DATABASE_PATH", "./sportlens.db")

# ============================================================================
# Pydantic Models (API Schema)
# ============================================================================

class BiomechanicsAngleMetric(BaseModel):
    """Aggregated angle metrics for a single joint."""
    avg: int
    min: int
    max: int

class BiomechanicsMetrics(BaseModel):
    """Complete biomechanics summary for a session."""
    leftKnee: Optional[BiomechanicsAngleMetric] = None
    rightKnee: Optional[BiomechanicsAngleMetric] = None
    leftHip: Optional[BiomechanicsAngleMetric] = None
    rightHip: Optional[BiomechanicsAngleMetric] = None
    leftElbow: Optional[BiomechanicsAngleMetric] = None
    rightElbow: Optional[BiomechanicsAngleMetric] = None
    leftShoulder: Optional[BiomechanicsAngleMetric] = None
    rightShoulder: Optional[BiomechanicsAngleMetric] = None
    totalFrames: int

class SessionMetrics(BaseModel):
    """Session metrics including biomechanics and violations."""
    biomechanics: BiomechanicsMetrics
    violations: Dict[str, int] = Field(default_factory=dict)
    totalViolations: int
    performanceScore: int

class SessionCreate(BaseModel):
    """Request model for creating a new session."""
    sessionId: str
    startTime: int  # Unix timestamp in milliseconds
    endTime: int
    duration: float  # Duration in seconds
    activityType: str  # 'fitness' or 'cricket'
    metrics: SessionMetrics
    notes: Optional[str] = None

class SessionResponse(BaseModel):
    """Response model for session data."""
    sessionId: str
    startTime: int
    endTime: int
    duration: float
    activityType: str
    metrics: SessionMetrics
    notes: Optional[str] = None
    syncStatus: str = "synced"
    syncedAt: Optional[int] = None
    createdAt: int

# ============================================================================
# Database Functions
# ============================================================================

def get_db_connection():
    """Get SQLite database connection."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # Enable column access by name
    return conn

def init_database():
    """Initialize database schema."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            start_time INTEGER NOT NULL,
            end_time INTEGER NOT NULL,
            duration REAL NOT NULL,
            activity_type TEXT NOT NULL,
            metrics TEXT NOT NULL,
            notes TEXT,
            sync_status TEXT DEFAULT 'synced',
            synced_at INTEGER,
            created_at INTEGER NOT NULL
        )
    """)
    
    # Create index for faster queries
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_activity_type 
        ON sessions(activity_type)
    """)
    
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_created_at 
        ON sessions(created_at DESC)
    """)
    
    conn.commit()
    conn.close()
    
    print(f"✅ Database initialized: {DATABASE_PATH}")

def insert_session(session: SessionCreate) -> SessionResponse:
    """Insert a new session into the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    created_at = int(datetime.now().timestamp() * 1000)
    synced_at = created_at
    
    # Serialize metrics to JSON
    metrics_json = json.dumps(session.metrics.dict())
    
    try:
        cursor.execute("""
            INSERT INTO sessions (
                session_id, start_time, end_time, duration, 
                activity_type, metrics, notes, sync_status, 
                synced_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            session.sessionId,
            session.startTime,
            session.endTime,
            session.duration,
            session.activityType,
            metrics_json,
            session.notes,
            'synced',
            synced_at,
            created_at
        ))
        
        conn.commit()
        
        # Return the created session
        return SessionResponse(
            sessionId=session.sessionId,
            startTime=session.startTime,
            endTime=session.endTime,
            duration=session.duration,
            activityType=session.activityType,
            metrics=session.metrics,
            notes=session.notes,
            syncStatus='synced',
            syncedAt=synced_at,
            createdAt=created_at
        )
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Session already exists")
    finally:
        conn.close()

def get_all_sessions() -> List[SessionResponse]:
    """Retrieve all sessions from database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM sessions 
        ORDER BY created_at DESC
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    sessions = []
    for row in rows:
        metrics = json.loads(row['metrics'])
        sessions.append(SessionResponse(
            sessionId=row['session_id'],
            startTime=row['start_time'],
            endTime=row['end_time'],
            duration=row['duration'],
            activityType=row['activity_type'],
            metrics=SessionMetrics(**metrics),
            notes=row['notes'],
            syncStatus=row['sync_status'],
            syncedAt=row['synced_at'],
            createdAt=row['created_at']
        ))
    
    return sessions

def get_session_by_id(session_id: str) -> Optional[SessionResponse]:
    """Retrieve a specific session by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM sessions 
        WHERE session_id = ?
    """, (session_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
    
    metrics = json.loads(row['metrics'])
    return SessionResponse(
        sessionId=row['session_id'],
        startTime=row['start_time'],
        endTime=row['end_time'],
        duration=row['duration'],
        activityType=row['activity_type'],
        metrics=SessionMetrics(**metrics),
        notes=row['notes'],
        syncStatus=row['sync_status'],
        syncedAt=row['synced_at'],
        createdAt=row['created_at']
    )

# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="SportLens AI Backend",
    description="Session management backend for SportLens AI coaching platform",
    version="0.5.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database on application startup."""
    init_database()
    print("🚀 SportLens AI Backend started")
    print(f"📁 Database: {DATABASE_PATH}")
    print(f"🌐 CORS origins: {ALLOWED_ORIGINS}")

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health")
async def health() -> dict:
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "SportLens AI Backend",
        "version": "0.5.0",
        "database": DATABASE_PATH
    }

@app.post("/sessions", response_model=SessionResponse, status_code=201)
async def create_session(session: SessionCreate) -> SessionResponse:
    """
    Store a completed training session.
    
    **Request Body:**
    - sessionId: Unique session identifier
    - startTime: Unix timestamp (ms) when session started
    - endTime: Unix timestamp (ms) when session ended
    - duration: Session duration in seconds
    - activityType: 'fitness' or 'cricket'
    - metrics: Aggregated biomechanics and violation data
    - notes: Optional session notes
    
    **Returns:**
    - Created session with sync metadata
    """
    print(f"📝 Storing session: {session.sessionId} ({session.activityType}, {session.duration:.1f}s)")
    
    try:
        created_session = insert_session(session)
        print(f"✅ Session stored: {session.sessionId}")
        return created_session
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error storing session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(activity_type: Optional[str] = None) -> List[SessionResponse]:
    """
    Retrieve all stored sessions.
    
    **Query Parameters:**
    - activity_type (optional): Filter by 'fitness' or 'cricket'
    
    **Returns:**
    - List of sessions sorted by most recent first
    """
    print(f"📚 Fetching sessions (filter: {activity_type or 'all'})")
    
    try:
        sessions = get_all_sessions()
        
        # Apply filter if specified
        if activity_type:
            sessions = [s for s in sessions if s.activityType == activity_type]
        
        print(f"✅ Retrieved {len(sessions)} sessions")
        return sessions
    except Exception as e:
        print(f"❌ Error fetching sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str) -> SessionResponse:
    """
    Retrieve a specific session by ID.
    
    **Path Parameters:**
    - session_id: Unique session identifier
    
    **Returns:**
    - Session data
    """
    print(f"🔍 Fetching session: {session_id}")
    
    try:
        session = get_session_by_id(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        print(f"✅ Retrieved session: {session_id}")
        return session
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_stats() -> dict:
    """
    Get database statistics.
    
    **Returns:**
    - total_sessions: Total number of sessions
    - fitness_sessions: Number of fitness sessions
    - cricket_sessions: Number of cricket sessions
    """
    try:
        sessions = get_all_sessions()
        
        return {
            "total_sessions": len(sessions),
            "fitness_sessions": len([s for s in sessions if s.activityType == 'fitness']),
            "cricket_sessions": len([s for s in sessions if s.activityType == 'cricket']),
        }
    except Exception as e:
        print(f"❌ Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
