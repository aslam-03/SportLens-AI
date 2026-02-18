"""
Pydantic Schemas for SportLens AI API

Defines request/response validation and serialization.

Note: Session data is stored in Firestore (client-side).
Backend only handles video uploads to Cloudflare R2.
"""

from pydantic import BaseModel, Field


class HealthCheckSchema(BaseModel):
    """Health check response schema."""
    status: str = Field(..., description="Status: 'ok' or 'error'")
    database: str = Field(..., description="Firebase connection status")
    message: str = Field(..., description="Additional message")
