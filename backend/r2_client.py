"""
Cloudflare R2 Client Utility

Provides S3-compatible client for Cloudflare R2 storage.
Uses boto3 (AWS SDK) since R2 is S3-compatible.

Environment Variables Required:
- R2_ACCOUNT_ID
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_BUCKET_NAME
- R2_PUBLIC_BASE_URL
"""

import os
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger(__name__)


class R2Client:
    """Cloudflare R2 storage client using S3-compatible API."""
    
    def __init__(self):
        """Initialize R2 client with environment variables."""
        self.account_id = os.getenv("R2_ACCOUNT_ID")
        self.access_key_id = os.getenv("R2_ACCESS_KEY_ID")
        self.secret_access_key = os.getenv("R2_SECRET_ACCESS_KEY")
        self.bucket_name = os.getenv("R2_BUCKET_NAME")
        self.public_base_url = os.getenv("R2_PUBLIC_BASE_URL")
        
        # Validate required environment variables
        self._validate_config()
        
        # Initialize S3 client configured for R2
        self.client = self._create_client()
        
        logger.info(f"✅ R2 client initialized for bucket: {self.bucket_name}")
    
    def _validate_config(self):
        """Validate all required environment variables are set."""
        required = {
            "R2_ACCOUNT_ID": self.account_id,
            "R2_ACCESS_KEY_ID": self.access_key_id,
            "R2_SECRET_ACCESS_KEY": self.secret_access_key,
            "R2_BUCKET_NAME": self.bucket_name,
            "R2_PUBLIC_BASE_URL": self.public_base_url,
        }
        
        missing = [key for key, value in required.items() if not value]
        
        if missing:
            raise ValueError(
                f"Missing required R2 environment variables: {', '.join(missing)}"
            )
    
    def _create_client(self):
        """Create boto3 S3 client configured for Cloudflare R2."""
        endpoint_url = f"https://{self.account_id}.r2.cloudflarestorage.com"
        
        return boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            config=Config(signature_version="s3v4"),
            region_name="auto",  # R2 uses 'auto' region
        )
    
    def generate_presigned_upload_url(
        self,
        object_key: str,
        content_type: str = "application/json",
        expires_in: int = 300
    ) -> str:
        """
        Generate a presigned PUT URL for uploading to R2.
        
        Args:
            object_key: The key/path for the object in R2
            content_type: MIME type of the file
            expires_in: URL expiration time in seconds (default: 5 minutes)
        
        Returns:
            Presigned PUT URL string
        """
        try:
            presigned_url = self.client.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": object_key,
                    "ContentType": content_type,
                },
                ExpiresIn=expires_in,
            )
            
            logger.info(f"✅ Generated presigned URL for: {object_key}")
            return presigned_url
            
        except ClientError as e:
            logger.error(f"❌ Failed to generate presigned URL: {e}")
            raise
    
    def get_public_url(self, object_key: str) -> str:
        """
        Get the public URL for an R2 object.
        
        Args:
            object_key: The key/path for the object in R2
        
        Returns:
            Public URL string
        """
        return f"{self.public_base_url}/{object_key}"
    
    def delete_object(self, object_key: str) -> bool:
        """
        Delete an object from R2.
        
        Args:
            object_key: The key/path for the object to delete
        
        Returns:
            True if successful, False otherwise
        """
        try:
            self.client.delete_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            logger.info(f"✅ Deleted object: {object_key}")
            return True
            
        except ClientError as e:
            logger.error(f"❌ Failed to delete object: {e}")
            return False
    
    def list_objects(self, prefix: str = "") -> list:
        """
        List objects in R2 bucket with optional prefix filter.
        
        Args:
            prefix: Filter objects by prefix
        
        Returns:
            List of object keys
        """
        try:
            response = self.client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            objects = response.get("Contents", [])
            return [obj["Key"] for obj in objects]
            
        except ClientError as e:
            logger.error(f"❌ Failed to list objects: {e}")
            return []


# Singleton instance
_r2_client = None


def get_r2_client() -> R2Client:
    """Get or create R2 client singleton instance."""
    global _r2_client
    
    if _r2_client is None:
        _r2_client = R2Client()
    
    return _r2_client
