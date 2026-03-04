/**
 * Cloudflare R2 Upload Service
 * 
 * Handles secure file uploads to R2 using presigned URLs.
 * Never exposes R2 credentials to the frontend.
 * 
 * Flow:
 * 1. Request presigned URL from backend
 * 2. Upload file directly to R2 using signed URL
 * 3. Return public URL to store in Firestore
 */

import { auth } from '../firebase';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

/**
 * Normalize content type by stripping codec params.
 * e.g. 'video/webm;codecs=vp8' → 'video/webm'
 * The backend and R2 presigned URL only need the base MIME type.
 */
function normalizeContentType(raw: string): string {
  return raw.split(';')[0].trim().toLowerCase();
}

/**
 * Error class for R2 upload failures
 */
export class R2UploadError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'R2UploadError';
  }
}

/**
 * Request presigned upload URL from backend
 */
async function requestPresignedUrl(
  sessionId: string,
  fileName: string,
  contentType: string
): Promise<{
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
}> {
  const user = auth.currentUser;
  
  if (!user) {
    throw new R2UploadError('User must be authenticated to upload files', 'AUTH_REQUIRED');
  }

  // Normalize content type to base MIME (strips codec params)
  const normalizedType = normalizeContentType(contentType);
  console.log(`[R2Upload] Requesting presigned URL for: ${fileName} (type: ${normalizedType})`);
  console.log(`[R2Upload] Backend URL: ${BACKEND_URL}`);

  // Get Firebase ID token
  let idToken: string;
  try {
    idToken = await user.getIdToken();
    console.log('[R2Upload] Firebase token obtained');
  } catch (tokenError) {
    console.error('[R2Upload] Failed to get Firebase token:', tokenError);
    throw new R2UploadError('Failed to authenticate with Firebase', 'TOKEN_ERROR');
  }

  try {
    const response = await fetch(`${BACKEND_URL}/upload/generateUploadUrl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        sessionId,
        fileName,
        contentType: normalizedType,
      }),
    });

    console.log(`[R2Upload] Backend response status: ${response.status}`);

    if (!response.ok) {
      let errorDetail = response.statusText;
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorData.message || response.statusText;
        console.error('[R2Upload] Backend error response:', errorData);
      } catch (parseError) {
        console.error('[R2Upload] Could not parse error response');
      }

      throw new R2UploadError(
        `Backend error: ${errorDetail}`,
        'PRESIGNED_URL_FAILED'
      );
    }

    const data = await response.json();
    console.log('[R2Upload] ✅ Presigned URL received:', data.objectKey);
    return data;
  } catch (fetchError) {
    if (fetchError instanceof R2UploadError) {
      throw fetchError;
    }
    console.error('[R2Upload] Fetch error:', fetchError);
    throw new R2UploadError(
      fetchError instanceof Error ? fetchError.message : 'Network error requesting presigned URL',
      'NETWORK_ERROR'
    );
  }
}

/**
 * Upload file to R2 using presigned URL
 */
async function uploadToR2(
  uploadUrl: string,
  file: Blob,
  contentType: string
): Promise<void> {
  // Use the same normalized type that the presigned URL was created with
  const normalizedType = normalizeContentType(contentType);
  console.log(`[R2Upload] Starting file upload - Size: ${(file.size / 1024 / 1024).toFixed(2)} MB, Type: ${normalizedType}`);
  
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': normalizedType,
      },
      body: file,
    });

    console.log(`[R2Upload] R2 upload response status: ${response.status}`);

    if (!response.ok) {
      console.error(`[R2Upload] R2 upload failed: ${response.statusText}`);
      throw new R2UploadError(
        `R2 upload failed: ${response.statusText}`,
        'UPLOAD_FAILED'
      );
    }

    console.log('[R2Upload] ✅ File uploaded to R2 successfully');
  } catch (error) {
    console.error('[R2Upload] Upload error:', error);
    if (error instanceof R2UploadError) {
      throw error;
    }
    throw new R2UploadError(
      error instanceof Error ? error.message : 'Unknown upload error',
      'UPLOAD_FAILED'
    );
  }
}

/**
 * Upload keypoints JSON data to R2
 * 
 * @param sessionId - Session ID for organizing files
 * @param keypointsData - Array of keypoint frames
 * @returns Public URL of uploaded file
 */
export async function uploadKeypointsToR2(
  sessionId: string,
  keypointsData: any[]
): Promise<string> {
  console.log(`[R2Upload] Uploading keypoints for session: ${sessionId}`);

  try {
    // Convert keypoints to JSON blob
    const jsonString = JSON.stringify(keypointsData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    console.log(`[R2Upload] Keypoints JSON size: ${(blob.size / 1024).toFixed(2)} KB`);

    // Step 1: Request presigned upload URL
    const { uploadUrl, publicUrl, objectKey } = await requestPresignedUrl(
      sessionId,
      'keypoints.json',
      'application/json'
    );

    console.log(`[R2Upload] Received presigned URL for: ${objectKey}`);

    // Step 2: Upload to R2
    await uploadToR2(uploadUrl, blob, 'application/json');

    console.log(`[R2Upload] ✅ Upload successful: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    if (error instanceof R2UploadError) {
      console.error(`[R2Upload] ❌ ${error.message}`);
      throw error;
    }
    
    console.error('[R2Upload] ❌ Unexpected error:', error);
    throw new R2UploadError(
      error instanceof Error ? error.message : 'Unknown upload error',
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Upload video blob to R2
 * 
 * @param sessionId - Session ID for organizing files
 * @param videoBlob - Recorded video blob
 * @param fileName - Video file name (e.g., 'session.webm')
 * @returns Public URL of uploaded file
 */
export async function uploadVideoToR2(
  sessionId: string,
  videoBlob: Blob,
  fileName: string = 'session.webm'
): Promise<string> {
  console.log(`[R2Upload] Uploading video for session: ${sessionId}`);

  try {
    const contentType = videoBlob.type || 'video/webm';
    
    console.log(`[R2Upload] Video size: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);

    // Step 1: Request presigned upload URL
    const { uploadUrl, publicUrl, objectKey } = await requestPresignedUrl(
      sessionId,
      fileName,
      contentType
    );

    console.log(`[R2Upload] Received presigned URL for: ${objectKey}`);

    // Step 2: Upload to R2
    await uploadToR2(uploadUrl, videoBlob, contentType);

    console.log(`[R2Upload] ✅ Upload successful: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    if (error instanceof R2UploadError) {
      console.error(`[R2Upload] ❌ ${error.message}`);
      throw error;
    }
    
    console.error('[R2Upload] ❌ Unexpected error:', error);
    throw new R2UploadError(
      error instanceof Error ? error.message : 'Unknown upload error',
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Check if R2 upload is available (user authenticated, backend reachable)
 */
export async function isR2UploadAvailable(): Promise<boolean> {
  try {
    // Check if user is authenticated
    const user = auth.currentUser;
    if (!user) {
      return false;
    }

    // Optional: Ping backend health endpoint
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
    });

    return response.ok;
  } catch (error) {
    console.warn('[R2Upload] Backend not reachable:', error);
    return false;
  }
}
