"""
Firebase Authentication Middleware

Validates Firebase ID tokens from frontend requests.
Only allows authenticated users to access protected endpoints.
"""

import os
import logging
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth
from functools import lru_cache

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()


def initialize_firebase():
    """
    Initialize Firebase Admin SDK.
    
    Uses service account credentials from GOOGLE_APPLICATION_CREDENTIALS env var.
    Call this once at application startup.
    """
    if firebase_admin._apps:
        logger.info("✅ Firebase Admin SDK already initialized")
        return
    
    try:
        # Check if credentials file is specified
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        
        if cred_path and os.path.exists(cred_path):
            # Use service account credentials
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            logger.info(f"✅ Firebase Admin initialized with service account: {cred_path}")
        else:
            # Try to use default credentials (for deployed environments)
            firebase_admin.initialize_app()
            logger.info("✅ Firebase Admin initialized with default credentials")
            
    except Exception as e:
        logger.warning(f"⚠️ Firebase Admin initialization failed: {e}")
        logger.warning("⚠️ Authentication will be disabled")


async def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """
    Verify Firebase ID token from Authorization header.
    
    Args:
        credentials: HTTP Bearer token from request header
    
    Returns:
        Decoded token data including uid, email, etc.
    
    Raises:
        HTTPException: If token is invalid or missing
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token"
        )
    
    token = credentials.credentials
    
    try:
        # Verify the ID token
        decoded_token = auth.verify_id_token(token)
        
        uid = decoded_token.get("uid")
        email = decoded_token.get("email", "unknown")
        
        logger.info(f"✅ Token verified for user: {email} (uid: {uid})")
        
        return decoded_token
        
    except auth.InvalidIdTokenError:
        logger.warning("❌ Invalid Firebase ID token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    except auth.ExpiredIdTokenError:
        logger.warning("❌ Expired Firebase ID token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired"
        )
    except Exception as e:
        logger.error(f"❌ Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )


def get_user_id(token_data: dict) -> str:
    """
    Extract user ID from decoded token.
    
    Args:
        token_data: Decoded Firebase token
    
    Returns:
        User ID (uid)
    """
    return token_data.get("uid")


def get_user_email(token_data: dict) -> str:
    """
    Extract user email from decoded token.
    
    Args:
        token_data: Decoded Firebase token
    
    Returns:
        User email address
    """
    return token_data.get("email", "unknown")
