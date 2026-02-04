"""
Session Routes for SportLens AI API

Endpoints for session persistence:
- POST /sessions - Save a completed session
- GET /sessions - Retrieve all sessions
- GET /sessions/{session_id} - Get specific session
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from schemas import SessionCreateSchema, SessionResponseSchema, SessionListSchema
from models import SessionModel
from database import get_db

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post(
    "",
    response_model=SessionResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Save a completed training session",
    response_description="The saved session with database metadata"
)
async def create_session(
    session_data: SessionCreateSchema,
    db: Session = Depends(get_db)
):
    """
    Save a completed training session to the database.
    
    The session is aggregated (not frame-level data).
    Includes biomechanics metrics, violation counts, and performance score.
    """
    try:
        # Check if session already exists (prevent duplicates)
        existing = db.query(SessionModel).filter(
            SessionModel.session_id == session_data.session_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Session {session_data.session_id} already exists"
            )
        
        # Create new session record
        db_session = SessionModel(
            session_id=session_data.session_id,
            start_time=session_data.start_time,
            end_time=session_data.end_time,
            duration=session_data.duration,
            activity_type=session_data.activity_type,
            metrics=session_data.metrics,
            performance_score=session_data.performance_score
        )
        
        # Save to database
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        
        print(f"✅ Session saved: {session_data.session_id} ({session_data.activity_type}, {session_data.duration}s)")
        
        return db_session
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save session: {str(e)}"
        )


@router.get(
    "",
    response_model=SessionListSchema,
    summary="Retrieve all training sessions",
    response_description="List of all saved sessions"
)
async def get_sessions(
    activity_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Retrieve all training sessions with optional filtering.
    
    Query Parameters:
    - activity_type: Filter by 'fitness' or 'cricket' (optional)
    - limit: Maximum number of sessions to return (default: 100)
    - offset: Number of sessions to skip (default: 0)
    """
    try:
        query = db.query(SessionModel)
        
        # Filter by activity type if provided
        if activity_type:
            query = query.filter(SessionModel.activity_type == activity_type)
        
        # Count total before pagination
        total = query.count()
        
        # Order by most recent first and apply pagination
        sessions = query.order_by(desc(SessionModel.start_time)).offset(offset).limit(limit).all()
        
        print(f"📚 Retrieved {len(sessions)} sessions (total: {total})")
        
        return SessionListSchema(sessions=sessions, total=total)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve sessions: {str(e)}"
        )


@router.get(
    "/{session_id}",
    response_model=SessionResponseSchema,
    summary="Get a specific session",
    response_description="The requested session"
)
async def get_session(
    session_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieve a specific session by ID.
    """
    try:
        session = db.query(SessionModel).filter(
            SessionModel.session_id == session_id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        
        return session
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve session: {str(e)}"
        )


@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a session"
)
async def delete_session(
    session_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete a specific session by ID.
    """
    try:
        session = db.query(SessionModel).filter(
            SessionModel.session_id == session_id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        
        db.delete(session)
        db.commit()
        
        print(f"🗑️  Session deleted: {session_id}")
        
        return None
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete session: {str(e)}"
        )
