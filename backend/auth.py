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
from dotenv import load_dotenv

load_dotenv()

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
            # For development without service account key:
            # Firebase can verify ID tokens with just the project ID
            project_id = os.getenv("FIREBASE_PROJECT_ID", "sportlensai")
            
            logger.info(f"ℹ️ No service account key - using project ID: {project_id}")
            logger.info("ℹ️ Token verification will work without credentials")
            
            # Initialize with just project ID - this is enough for token verification
            firebase_admin.initialize_app(options={"projectId": project_id})
            
            logger.info("✅ Firebase Admin initialized (token verification only mode)")
            
    except Exception as e:
        logger.error(f"❌ Firebase Admin initialization failed: {e}")
        raise RuntimeError(f"Firebase initialization failed: {e}")


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
    # DEVELOPMENT MODE - Skip auth verification
    dev_mode = os.getenv("DEV_MODE_SKIP_AUTH", "false").lower() == "true"
    
    if dev_mode:
        logger.warning("⚠️  DEV MODE: Skipping Firebase token verification")
        # Extract user info from token without verification (UNSAFE - dev only)
        if not credentials:
            # Return a mock user for development
            return {
                "uid": "dev_user_123",
                "email": "dev@example.com",
                "email_verified": True
            }
        
        try:
            import jwt
            # Decode without verification (DEVELOPMENT ONLY!)
            token = credentials.credentials
            decoded = jwt.decode(token, options={"verify_signature": False})
            logger.warning(f"⚠️  DEV MODE: Using unverified token for user: {decoded.get('email', 'unknown')}")
            return decoded
        except Exception as e:
            logger.warning(f"⚠️  DEV MODE: Could not decode token, using mock user: {e}")
            return {
                "uid": "dev_user_123",
                "email": "dev@example.com",
                "email_verified": True
            }
    
    # PRODUCTION MODE - Verify token properly
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
        # Include the specific error in the response detail for debugging
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
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
