"""
Pydantic Schemas for SportLens AI API

Defines request/response validation and serialization.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class AngleMetricSchema(BaseModel):
    """Aggregated angle metrics for a single joint."""
    avg: int = Field(..., description="Average angle in degrees")
    min: int = Field(..., description="Minimum angle in degrees")
    max: int = Field(..., description="Maximum angle in degrees")


class BiomechanicsMetricsSchema(BaseModel):
    """Complete biomechanics summary for a session."""
    leftKnee: Optional[AngleMetricSchema] = None
    rightKnee: Optional[AngleMetricSchema] = None
    leftHip: Optional[AngleMetricSchema] = None
    rightHip: Optional[AngleMetricSchema] = None
    leftElbow: Optional[AngleMetricSchema] = None
    rightElbow: Optional[AngleMetricSchema] = None
    leftShoulder: Optional[AngleMetricSchema] = None
    rightShoulder: Optional[AngleMetricSchema] = None
    totalFrames: int = Field(..., description="Total frames processed in session")


class SessionCreateSchema(BaseModel):
    """Schema for creating a new session (POST request)."""
    session_id: str = Field(..., description="Unique session identifier")
    start_time: datetime = Field(..., description="Session start timestamp")
    end_time: datetime = Field(..., description="Session end timestamp")
    duration: int = Field(..., description="Session duration in seconds")
    activity_type: str = Field(..., description="Activity type: 'fitness' or 'cricket'")
    metrics: Dict[str, Any] = Field(
        ..., 
        description="Aggregated session metrics (biomechanics + violations)"
    )
    performance_score: Optional[float] = Field(
        None,
        description="Overall performance score (0-100)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "sess_abc123",
                "start_time": "2025-02-04T10:00:00",
                "end_time": "2025-02-04T10:05:00",
                "duration": 300,
                "activity_type": "fitness",
                "metrics": {
                    "leftKnee": {"avg": 90, "min": 45, "max": 135},
                    "rightKnee": {"avg": 92, "min": 48, "max": 138},
                    "totalFrames": 300,
                    "violations": {"badPosture": 12, "excessiveKneeBend": 5}
                },
                "performance_score": 78.5
            }
        }


class SessionResponseSchema(SessionCreateSchema):
    """Schema for session response (GET request)."""
    created_at: datetime = Field(..., description="Timestamp when session was saved to database")

    class Config:
        from_attributes = True  # Enable ORM mode for SQLAlchemy models


class SessionListSchema(BaseModel):
    """Schema for list of sessions."""
    sessions: list[SessionResponseSchema] = Field(..., description="List of sessions")
    total: int = Field(..., description="Total number of sessions")


class HealthCheckSchema(BaseModel):
    """Health check response schema."""
    status: str = Field(..., description="Status: 'ok' or 'error'")
    database: str = Field(..., description="Database connection status")
    message: str = Field(..., description="Additional message")
