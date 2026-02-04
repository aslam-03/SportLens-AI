"""
Routes package for SportLens AI Backend

Exports:
- sessions: Session CRUD endpoints
"""

from .sessions import router as sessions_router

__all__ = ["sessions_router"]
