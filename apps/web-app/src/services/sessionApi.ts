/**
 * Session API Service for SportLens AI
 * 
 * High-level API for managing session persistence and sync.
 * Handles Firestore persistence with localStorage fallback.
 */

import type { Session } from '../types/session';
import { SessionStorage } from './sessionStorage';
import { saveSessionToFirestore, getSessionsFromFirestore } from './firestoreSessionService';

/**
 * Send a completed session to Firestore
 * Requires authenticated user (uid)
 * Falls back to localStorage on error
 */
export async function sendSession(
  session: Session,
  uid: string | null
): Promise<{
  success: boolean;
  synced: boolean; // true if sent to Firestore, false if stored locally
  message: string;
  error?: string;
}> {
  console.log(`[SessionAPI] Sending session: ${session.sessionId}`);

  // Check if user is authenticated
  if (!uid) {
    console.warn('[SessionAPI] User not authenticated, saving to local storage only');

    try {
      SessionStorage.saveSession({
        ...session,
        syncStatus: 'pending',
      });

      return {
        success: true,
        synced: false,
        message: `Session ${session.sessionId} saved locally (user not authenticated)`,
      };
    } catch (localError) {
      return {
        success: false,
        synced: false,
        message: `Failed to save session`,
        error: localError instanceof Error ? localError.message : 'Unknown error',
      };
    }
  }

  try {
    // Save to Firestore
    await saveSessionToFirestore(uid, session);

    // Also save locally as backup
    SessionStorage.saveSession({
      ...session,
      syncStatus: 'synced',
      syncedAt: Date.now(),
    });

    return {
      success: true,
      synced: true,
      message: `Session ${session.sessionId} saved to Firestore and local storage`,
    };
  } catch (error) {
    console.error('[SessionAPI] Firestore save failed, falling back to local storage:', error);

    // Fallback: save to localStorage
    try {
      SessionStorage.saveSession({
        ...session,
        syncStatus: 'pending',
      });

      return {
        success: true,
        synced: false,
        message: `Session ${session.sessionId} saved to local storage (Firestore sync failed)`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } catch (localError) {
      return {
        success: false,
        synced: false,
        message: `Failed to save session`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Fetch all sessions from Firestore
 * Falls back to localStorage if Firestore unavailable or user not authenticated
 */
export async function fetchSessions(
  uid: string | null,
  activityType?: 'fitness' | 'cricket'
): Promise<{
  sessions: Session[];
  source: 'firestore' | 'local';
  message: string;
}> {
  console.log(`[SessionAPI] Fetching sessions (filter: ${activityType || 'all'})`);

  // If not authenticated, fetch from local storage only
  if (!uid) {
    console.warn('[SessionAPI] User not authenticated, fetching from local storage only');

    const localSessions = SessionStorage.getAllSessions();
    let filtered = localSessions;
    if (activityType) {
      filtered = localSessions.filter((s) => s.activityType === activityType);
    }

    return {
      sessions: filtered,
      source: 'local',
      message: `Fetched ${filtered.length} sessions from local storage (not authenticated)`,
    };
  }

  try {
    // Fetch from Firestore
    const sessions = await getSessionsFromFirestore(uid, activityType);

    return {
      sessions,
      source: 'firestore',
      message: `Fetched ${sessions.length} sessions from Firestore`,
    };
  } catch (error) {
    console.error('[SessionAPI] Firestore fetch failed, falling back to local storage:', error);

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
      console.error('[SessionAPI] Failed to fetch from both Firestore and local:', localError);

      return {
        sessions: [],
        source: 'local',
        message: 'Failed to fetch sessions',
      };
    }
  }
}

/**
 * Sync pending local sessions to Firestore
 * Useful when user authenticates after being offline
 */
export async function syncPendingSessions(uid: string | null): Promise<{
  succeeded: number;
  failed: number;
  errors: Array<{ sessionId: string; error: string }>;
}> {
  console.log('[SessionAPI] Starting sync of pending sessions');

  if (!uid) {
    console.warn('[SessionAPI] Cannot sync: User not authenticated');
    return { succeeded: 0, failed: 0, errors: [] };
  }

  // Get all local sessions that are pending
  const allSessions = SessionStorage.getAllSessions();
  const pendingSessions = allSessions.filter((s) => s.syncStatus === 'pending');

  if (pendingSessions.length === 0) {
    console.log('[SessionAPI] No pending sessions to sync');
    return { succeeded: 0, failed: 0, errors: [] };
  }

  console.log(`[SessionAPI] Syncing ${pendingSessions.length} pending sessions to Firestore`);

  let succeeded = 0;
  let failed = 0;
  const errors: Array<{ sessionId: string; error: string }> = [];

  for (const session of pendingSessions) {
    try {
      await saveSessionToFirestore(uid, session);

      // Update local storage with synced status
      const updated = SessionStorage.getSessionById(session.sessionId);
      if (updated) {
        updated.syncStatus = 'synced';
        updated.syncedAt = Date.now();
        SessionStorage.saveSession(updated);
      }

      succeeded++;
    } catch (error) {
      failed++;
      errors.push({
        sessionId: session.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  console.log(`[SessionAPI] Sync complete: ${succeeded} succeeded, ${failed} failed`);
  return { succeeded, failed, errors };
}

/**
 * Delete a session from Firestore and local storage
 */
export async function deleteSession(
  sessionId: string,
  uid: string | null
): Promise<boolean> {
  console.log(`[SessionAPI] Deleting session: ${sessionId}`);

  let firestoreDeleted = false;
  let localDeleted = false;

  // Try to delete from Firestore if user is authenticated
  if (uid) {
    try {
      // Note: Firestore delete not implemented yet
      // This is a placeholder for future implementation
      console.warn(`[SessionAPI] Firestore delete not yet implemented`);
      firestoreDeleted = false;
    } catch (error) {
      console.warn(`[SessionAPI] Failed to delete from Firestore:`, error);
    }
  }

  // Delete from local storage
  try {
    SessionStorage.deleteSession(sessionId);
    localDeleted = true;
  } catch (error) {
    console.error(`[SessionAPI] Failed to delete from local storage:`, error);
  }

  const success = firestoreDeleted || localDeleted;

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
