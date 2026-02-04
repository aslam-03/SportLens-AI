/**
 * API Service for SportLens AI Backend Communication
 * 
 * Handles all HTTP requests to the FastAPI backend.
 * 
 * Features:
 * - POST /sessions: Send completed sessions to backend
 * - GET /sessions: Fetch all sessions from backend
 * - GET /sessions/:id: Fetch specific session
 * - Error handling with detailed messages
 * - Configurable base URL
 */

import type { Session } from '../types/session';

/**
 * API Configuration
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_TIMEOUT = 10000; // 10 seconds

/**
 * API Error class for better error handling
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Helper function to make HTTP requests with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = API_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timeout', 408);
    }

    throw error;
  }
}

/**
 * Check if backend is available
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/health`, {}, 3000);
    if (response.ok) {
      const data = await response.json();
      console.log('[API] Backend health check:', data);
      return true;
    }
    return false;
  } catch (error) {
    console.warn('[API] Backend not available:', error);
    return false;
  }
}

/**
 * Post a completed session to the backend
 */
export async function postSession(session: Session): Promise<Session> {
  try {
    console.log(`[API] Posting session: ${session.sessionId}`);

    const response = await fetchWithTimeout(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      body: JSON.stringify(session),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.detail || `Failed to post session: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const savedSession = await response.json();
    console.log(`[API] Session posted successfully: ${session.sessionId}`);

    return savedSession;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new ApiError(
        `Network error: ${error.message}`,
        undefined,
        error
      );
    }

    throw new ApiError('Unknown error occurred while posting session');
  }
}

/**
 * Get all sessions from the backend
 */
export async function getSessions(
  activityType?: 'fitness' | 'cricket'
): Promise<Session[]> {
  try {
    const url = activityType
      ? `${API_BASE_URL}/sessions?activity_type=${activityType}`
      : `${API_BASE_URL}/sessions`;

    console.log(`[API] Fetching sessions (filter: ${activityType || 'all'})`);

    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.detail || `Failed to fetch sessions: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    // Backend returns { sessions: [...], total: ... }
    const sessions = Array.isArray(data) ? data : (data.sessions || []);
    console.log(`[API] Fetched ${sessions.length} sessions`);

    return sessions;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new ApiError(
        `Network error: ${error.message}`,
        undefined,
        error
      );
    }

    throw new ApiError('Unknown error occurred while fetching sessions');
  }
}

/**
 * Get a specific session by ID
 */
export async function getSessionById(sessionId: string): Promise<Session> {
  try {
    console.log(`[API] Fetching session: ${sessionId}`);

    const response = await fetchWithTimeout(`${API_BASE_URL}/sessions/${sessionId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new ApiError('Session not found', 404);
      }

      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.detail || `Failed to fetch session: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const session = await response.json();
    console.log(`[API] Fetched session: ${sessionId}`);

    return session;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new ApiError(
        `Network error: ${error.message}`,
        undefined,
        error
      );
    }

    throw new ApiError('Unknown error occurred while fetching session');
  }
}

/**
 * Get backend statistics
 */
export async function getStats(): Promise<{
  total_sessions: number;
  fitness_sessions: number;
  cricket_sessions: number;
}> {
  try {
    console.log('[API] Fetching backend stats');

    const response = await fetchWithTimeout(`${API_BASE_URL}/stats`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.detail || `Failed to fetch stats: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const stats = await response.json();
    console.log('[API] Fetched stats:', stats);

    return stats;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new ApiError(
        `Network error: ${error.message}`,
        undefined,
        error
      );
    }

    throw new ApiError('Unknown error occurred while fetching stats');
  }
}

/**
 * Sync local sessions to backend
 * 
 * This function is useful for syncing sessions that were stored locally
 * when the backend was unavailable.
 */
export async function syncLocalSessions(sessions: Session[]): Promise<{
  succeeded: number;
  failed: number;
  errors: Array<{ sessionId: string; error: string }>;
}> {
  console.log(`[API] Syncing ${sessions.length} local sessions to backend`);

  let succeeded = 0;
  let failed = 0;
  const errors: Array<{ sessionId: string; error: string }> = [];

  for (const session of sessions) {
    try {
      await postSession(session);
      succeeded++;
    } catch (error) {
      failed++;
      const errorMessage =
        error instanceof ApiError ? error.message : 'Unknown error';
      errors.push({ sessionId: session.sessionId, error: errorMessage });
      console.error(`[API] Failed to sync session ${session.sessionId}:`, error);
    }
  }

  console.log(
    `[API] Sync complete: ${succeeded} succeeded, ${failed} failed`
  );

  return { succeeded, failed, errors };
}

/**
 * API service instance (for convenience)
 */
export const api = {
  checkHealth: checkBackendHealth,
  postSession,
  getSessions,
  getSessionById,
  getStats,
  syncLocalSessions,
};

export default api;
