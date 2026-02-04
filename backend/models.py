"""
SQLAlchemy Models for SportLens AI

Defines the database schema for persisting training sessions.
"""

from sqlalchemy import Column, String, Integer, Float, DateTime, JSON
from sqlalchemy.sql import func
from datetime import datetime
from database import Base


class SessionModel(Base):
    """
    Session table schema.
    
    Stores completed training sessions with aggregated metrics.
    """
    __tablename__ = "sessions"

    # Primary key - unique session identifier
    session_id = Column(String, primary_key=True, index=True)
    
    # Temporal information
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)
    duration = Column(Integer, nullable=False)  # Duration in seconds
    
    # Activity classification
    activity_type = Column(String, nullable=False)  # 'fitness' or 'cricket'
    
    # Aggregated metrics (stored as JSON)
    # Format: {
    #   leftKnee: {avg: number, min: number, max: number},
    #   rightKnee: {avg: number, min: number, max: number},
    #   ... (other joints)
    #   totalFrames: number,
    #   violations: {ruleName: count, ...}
    # }
    metrics = Column(JSON, nullable=False)
    
    # Performance score (0-100)
    performance_score = Column(Float, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    def __repr__(self):
        return (
            f"<SessionModel("
            f"session_id={self.session_id}, "
            f"activity={self.activity_type}, "
            f"duration={self.duration}s"
            f")>"
        )
