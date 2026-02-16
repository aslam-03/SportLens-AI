/**
 * Session API Service for SportLens AI
 * 
 * High-level API for managing session persistence and sync.
 * Bridges SessionAggregator with backend and localStorage.
 */

import type { Session } from '../types/session';
import { SessionStorage } from './sessionStorage';
import { api, ApiError } from './api';

/**
 * Send a completed session to the backend
 * Falls back to localStorage if backend fails
 */
export async function sendSession(session: Session): Promise<{
  success: boolean;
  synced: boolean; // true if sent to backend, false if stored locally
  message: string;
  error?: string;
}> {
  console.log(`[SessionAPI] Sending session: ${session.sessionId}`);

  try {
    // Check backend health first
    const isHealthy = await api.checkHealth();

    if (!isHealthy) {
      throw new Error('Backend not available');
    }

    // Try to send to backend
    await api.postSession(session);

    // Also save locally as backup
    SessionStorage.saveSession(session);

    return {
      success: true,
      synced: true,
      message: `Session ${session.sessionId} saved to backend and local storage`,
    };
  } catch (error) {
    console.warn('[SessionAPI] Backend sync failed, falling back to local storage:', error);

    // Fallback: save to localStorage
    try {
      SessionStorage.saveSession({
        ...session,
        syncStatus: 'pending',
      });

      return {
        success: true,
        synced: false,
        message: `Session ${session.sessionId} saved to local storage (pending backend sync)`,
      };
    } catch (localError) {
      const errorMessage =
        error instanceof ApiError ? error.message : 'Unknown error';

      return {
        success: false,
        synced: false,
        message: `Failed to save session`,
        error: errorMessage,
      };
    }
  }
}

/**
 * Fetch all sessions from backend
 * Falls back to localStorage if backend unavailable
 */
export async function fetchSessions(
  activityType?: 'fitness' | 'cricket'
): Promise<{
  sessions: Session[];
  source: 'backend' | 'local';
  message: string;
}> {
  console.log(`[SessionAPI] Fetching sessions (filter: ${activityType || 'all'})`);

  try {
    // Check backend health
    const isHealthy = await api.checkHealth();

    if (!isHealthy) {
      throw new Error('Backend not available');
    }

    // Fetch from backend
    const sessions = await api.getSessions(activityType);

    return {
      sessions,
      source: 'backend',
      message: `Fetched ${sessions.length} sessions from backend`,
    };
  } catch (error) {
    console.warn('[SessionAPI] Backend fetch failed, falling back to local storage:', error);

    // Fallback: load from localStorage
    try {
      const localSessions = SessionStorage.getAllSessions();

      let filtered = localSessions;
      if (activityType) {
        filtered = localSessions.filter((s) => s.activityType === activityType);
      }

      return {
        sessions: filtered,
        source: 'local',
        message: `Fetched ${filtered.length} sessions from local storage`,
      };
    } catch (localError) {
      console.error('[SessionAPI] Failed to fetch from both backend and local:', localError);

      return {
        sessions: [],
        source: 'local',
        message: 'Failed to fetch sessions',
      };
    }
  }
}

/**
 * Sync pending local sessions to backend
 * Useful when backend becomes available after being offline
 */
export async function syncPendingSessions(): Promise<{
  succeeded: number;
  failed: number;
  errors: Array<{ sessionId: string; error: string }>;
}> {
  console.log('[SessionAPI] Starting sync of pending sessions');

  // Get all local sessions that are pending
  const allSessions = SessionStorage.getAllSessions();
  const pendingSessions = allSessions.filter((s) => s.syncStatus === 'pending');

  if (pendingSessions.length === 0) {
    console.log('[SessionAPI] No pending sessions to sync');
    return { succeeded: 0, failed: 0, errors: [] };
  }

  console.log(`[SessionAPI] Syncing ${pendingSessions.length} pending sessions`);

  // Use the api service to sync
  const result = await api.syncLocalSessions(pendingSessions);

  // Update local storage with new sync status
  if (result.succeeded > 0) {
    for (const session of pendingSessions) {
      const updated = SessionStorage.getSessionById(session.sessionId);
      if (updated) {
        updated.syncStatus = 'synced';
        updated.syncedAt = Date.now();
        SessionStorage.saveSession(updated);
      }
    }
  }

  return result;
}

/**
 * Delete a session from backend and local storage
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  console.log(`[SessionAPI] Deleting session: ${sessionId}`);

  let backendDeleted = false;
  let localDeleted = false;

  // Try to delete from backend
  try {
    const response = await fetch(`http://localhost:8000/sessions/${sessionId}`, {
      method: 'DELETE',
    });

    backendDeleted = response.ok || response.status === 404;
  } catch (error) {
    console.warn(`[SessionAPI] Failed to delete from backend:`, error);
  }

  // Delete from local storage
  try {
    SessionStorage.deleteSession(sessionId);
    localDeleted = true;
  } catch (error) {
    console.error(`[SessionAPI] Failed to delete from local storage:`, error);
  }

  const success = backendDeleted || localDeleted;

  if (success) {
    console.log(`[SessionAPI] Session deleted successfully`);
  }

  return success;
}

/**
 * Export session service
 */
export const sessionApi = {
  sendSession,
  fetchSessions,
  syncPendingSessions,
  deleteSession,
};

export default sessionApi;
