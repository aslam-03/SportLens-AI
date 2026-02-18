"""
Routes package for SportLens AI Backend

Exports:
- upload: Video upload endpoints for Cloudflare R2
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .upload import router as upload_router

__all__ = ["upload_router"]
