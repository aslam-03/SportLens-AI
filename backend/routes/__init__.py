"""
Routes package for SportLens AI Backend

Exports:
- sessions: Session CRUD endpoints
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .sessions import router as sessions_router

__all__ = ["sessions_router"]
