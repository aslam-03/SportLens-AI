"""
R2 Upload Routes

Endpoints for generating presigned upload URLs for Cloudflare R2.
Allows secure client-side uploads without exposing credentials.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
import logging

from auth import verify_firebase_token, get_user_id
from r2_client import get_r2_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["upload"])


# ============================================================================
# Request/Response Schemas
# ============================================================================

class GenerateUploadUrlRequest(BaseModel):
    """Request body for generating presigned upload URL."""
    
    fileName: str = Field(..., description="File name (e.g., 'keypoints.json')")
    contentType: str = Field(
        ..., 
        description="MIME type of the file (e.g. application/json, video/webm, video/mp4)"
    )
    sessionId: str = Field(..., description="Session ID for organizing uploads")
    
    class Config:
        json_schema_extra = {
            "example": {
                "fileName": "keypoints.json",
                "contentType": "application/json",
                "sessionId": "550e8400-e29b-41d4-a716-446655440000"
            }
        }


class GenerateUploadUrlResponse(BaseModel):
    """Response containing presigned upload URL and public URL."""
    
    uploadUrl: str = Field(..., description="Presigned PUT URL (expires in 5 minutes)")
    publicUrl: str = Field(..., description="Public URL to store in Firestore")
    objectKey: str = Field(..., description="R2 object key for reference")
    expiresIn: int = Field(300, description="URL expiration time in seconds")
    
    class Config:
        json_schema_extra = {
            "example": {
                "uploadUrl": "https://account.r2.cloudflarestorage.com/bucket/...",
                "publicUrl": "https://pub-xxxxx.r2.dev/users/uid/sessions/sid/keypoints.json",
                "objectKey": "users/uid/sessions/sid/keypoints.json",
                "expiresIn": 300
            }
        }


# ============================================================================
# Endpoints
# ============================================================================

@router.post(
    "/generateUploadUrl",
    response_model=GenerateUploadUrlResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate presigned R2 upload URL",
    description="Returns a temporary upload URL for secure client-side uploads to R2"
)
async def generate_upload_url(
    request: GenerateUploadUrlRequest,
    token_data: dict = Depends(verify_firebase_token)
):
    """
    Generate a presigned PUT URL for uploading files to Cloudflare R2.
    
    **Authentication Required**: Bearer token in Authorization header
    
    Process:
    1. Validate user authentication
    2. Generate object key: users/{uid}/sessions/{sessionId}/{fileName}
    3. Create presigned PUT URL (valid for 5 minutes)
    4. Return both upload URL and public URL
    
    **Important**:
    - Use the `uploadUrl` for uploading (PUT request)
    - Store the `publicUrl` in Firestore session document
    - Upload must complete within 5 minutes
    """
    try:
        # Get user ID from token
        uid = get_user_id(token_data)
        
        # Normalize and validate content type
        base_content_type = request.contentType.split(";")[0].strip().lower()
        ALLOWED_TYPES = {"application/json", "video/webm", "video/mp4", "video/x-matroska"}
        if base_content_type not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported content type: {base_content_type}. Allowed: {', '.join(ALLOWED_TYPES)}"
            )
        
        logger.info(f"📤 Generating upload URL for user {uid}, session {request.sessionId} (type: {base_content_type})")
        
        # Construct object key
        object_key = f"users/{uid}/sessions/{request.sessionId}/{request.fileName}"
        
        # Get R2 client
        r2_client = get_r2_client()
        
        # Generate presigned upload URL using the normalized base content type
        upload_url = r2_client.generate_presigned_upload_url(
            object_key=object_key,
            content_type=base_content_type,
            expires_in=300  # 5 minutes
        )
        
        # Get public URL for storing in Firestore
        public_url = r2_client.get_public_url(object_key)
        
        logger.info(f"✅ Generated upload URL for: {object_key}")
        
        return GenerateUploadUrlResponse(
            uploadUrl=upload_url,
            publicUrl=public_url,
            objectKey=object_key,
            expiresIn=300
        )
        
    except ValueError as e:
        logger.error(f"❌ Configuration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="R2 configuration error. Please check server configuration."
        )
    except Exception as e:
        logger.error(f"❌ Failed to generate upload URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate upload URL: {str(e)}"
        )


@router.delete(
    "/deleteObject/{session_id}/{file_name}",
    status_code=status.HTTP_200_OK,
    summary="Delete uploaded file from R2",
    description="Delete a previously uploaded file (admin/cleanup)"
)
async def delete_uploaded_file(
    session_id: str,
    file_name: str,
    token_data: dict = Depends(verify_firebase_token)
):
    """
    Delete a file from R2 storage.
    
    **Authentication Required**: Bearer token in Authorization header
    
    Only allows users to delete their own uploaded files.
    """
    try:
        # Get user ID from token
        uid = get_user_id(token_data)
        
        # Construct object key
        object_key = f"users/{uid}/sessions/{session_id}/{file_name}"
        
        logger.info(f"🗑️ Deleting object: {object_key}")
        
        # Get R2 client and delete
        r2_client = get_r2_client()
        success = r2_client.delete_object(object_key)
        
        if success:
            return {"message": f"Successfully deleted {file_name}", "objectKey": object_key}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete object"
            )
            
    except Exception as e:
        logger.error(f"❌ Failed to delete object: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete object: {str(e)}"
        )
