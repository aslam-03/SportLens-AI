/**
 * Session Storage Service for SportLens AI
 * 
 * Handles local persistence of training sessions using localStorage.
 * This provides:
 * - Immediate session history (no backend required)
 * - Offline-first architecture
 * - Migration path for backend sync
 * 
 * Storage Strategy:
 * - Key: 'sportlens_sessions'
 * - Value: JSON array of Session objects
 * - Max storage: ~5MB (localStorage limit is 5-10MB)
 * - Old sessions auto-pruned if limit reached
 */

import type { Session } from '../types/session';

const STORAGE_KEY = 'sportlens_sessions';
const MAX_SESSIONS = 100; // Limit to prevent localStorage overflow

/**
 * Session Storage Service
 */
export class SessionStorage {
  /**
   * Save a new session
   */
  static saveSession(session: Session): void {
    try {
      const sessions = this.getAllSessions();
      
      // Add new session at the beginning (most recent first)
      sessions.unshift(session);

      // Prune old sessions if limit exceeded
      if (sessions.length > MAX_SESSIONS) {
        sessions.splice(MAX_SESSIONS);
        console.warn(`[SessionStorage] Pruned old sessions (limit: ${MAX_SESSIONS})`);
      }

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      
      console.log(`[SessionStorage] Saved session: ${session.sessionId}`);
    } catch (error) {
      console.error('[SessionStorage] Failed to save session:', error);
      
      // If quota exceeded, try removing oldest sessions
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.pruneOldestSessions(10);
        
        // Retry save
        try {
          const sessions = this.getAllSessions();
          sessions.unshift(session);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
          console.log(`[SessionStorage] Saved session after pruning: ${session.sessionId}`);
        } catch (retryError) {
          console.error('[SessionStorage] Failed to save even after pruning:', retryError);
        }
      }
    }
  }

  /**
   * Get all sessions (sorted by most recent first)
   */
  static getAllSessions(): Session[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return [];
      }

      const sessions = JSON.parse(data) as Session[];
      
      // Validate and filter invalid sessions
      return sessions.filter(session => {
        return session.sessionId && 
               session.startTime && 
               session.endTime && 
               session.activityType;
      });
    } catch (error) {
      console.error('[SessionStorage] Failed to load sessions:', error);
      return [];
    }
  }

  /**
   * Get session by ID
   */
  static getSessionById(sessionId: string): Session | null {
    const sessions = this.getAllSessions();
    return sessions.find(s => s.sessionId === sessionId) || null;
  }

  /**
   * Get sessions by activity type
   */
  static getSessionsByActivity(activityType: 'fitness' | 'cricket'): Session[] {
    const sessions = this.getAllSessions();
    return sessions.filter(s => s.activityType === activityType);
  }

  /**
   * Get recent sessions (last N sessions)
   */
  static getRecentSessions(count: number = 10): Session[] {
    const sessions = this.getAllSessions();
    return sessions.slice(0, count);
  }

  /**
   * Update session (e.g., change sync status)
   */
  static updateSession(sessionId: string, updates: Partial<Session>): boolean {
    try {
      const sessions = this.getAllSessions();
      const index = sessions.findIndex(s => s.sessionId === sessionId);

      if (index === -1) {
        console.warn(`[SessionStorage] Session not found: ${sessionId}`);
        return false;
      }

      // Merge updates
      sessions[index] = { ...sessions[index], ...updates };

      // Save back to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      
      console.log(`[SessionStorage] Updated session: ${sessionId}`);
      return true;
    } catch (error) {
      console.error('[SessionStorage] Failed to update session:', error);
      return false;
    }
  }

  /**
   * Delete a session
   */
  static deleteSession(sessionId: string): boolean {
    try {
      const sessions = this.getAllSessions();
      const filtered = sessions.filter(s => s.sessionId !== sessionId);

      if (filtered.length === sessions.length) {
        console.warn(`[SessionStorage] Session not found: ${sessionId}`);
        return false;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      
      console.log(`[SessionStorage] Deleted session: ${sessionId}`);
      return true;
    } catch (error) {
      console.error('[SessionStorage] Failed to delete session:', error);
      return false;
    }
  }

  /**
   * Clear all sessions
   */
  static clearAllSessions(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('[SessionStorage] Cleared all sessions');
    } catch (error) {
      console.error('[SessionStorage] Failed to clear sessions:', error);
    }
  }

  /**
   * Get storage statistics
   */
  static getStats(): {
    totalSessions: number;
    fitnessSessions: number;
    cricketSessions: number;
    estimatedSizeKB: number;
  } {
    const sessions = this.getAllSessions();
    const fitnessSessions = sessions.filter(s => s.activityType === 'fitness').length;
    const cricketSessions = sessions.filter(s => s.activityType === 'cricket').length;

    // Estimate storage size
    const data = localStorage.getItem(STORAGE_KEY) || '';
    const estimatedSizeKB = Math.round(new Blob([data]).size / 1024);

    return {
      totalSessions: sessions.length,
      fitnessSessions,
      cricketSessions,
      estimatedSizeKB
    };
  }

  /**
   * Get pending sessions (not yet synced to backend)
   */
  static getPendingSessions(): Session[] {
    const sessions = this.getAllSessions();
    return sessions.filter(s => s.syncStatus === 'pending');
  }

  /**
   * Mark session as synced
   */
  static markAsSynced(sessionId: string): boolean {
    return this.updateSession(sessionId, {
      syncStatus: 'synced',
      syncedAt: Date.now()
    });
  }

  /**
   * Mark session as failed to sync
   */
  static markAsFailed(sessionId: string): boolean {
    return this.updateSession(sessionId, {
      syncStatus: 'failed'
    });
  }

  /**
   * Export all sessions as JSON (for backup/debugging)
   */
  static exportSessions(): string {
    const sessions = this.getAllSessions();
    return JSON.stringify(sessions, null, 2);
  }

  /**
   * Import sessions from JSON (for restore/testing)
   */
  static importSessions(json: string): boolean {
    try {
      const sessions = JSON.parse(json) as Session[];
      
      // Validate sessions
      const valid = sessions.every(s => 
        s.sessionId && s.startTime && s.endTime && s.activityType
      );

      if (!valid) {
        console.error('[SessionStorage] Invalid session data in import');
        return false;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      console.log(`[SessionStorage] Imported ${sessions.length} sessions`);
      return true;
    } catch (error) {
      console.error('[SessionStorage] Failed to import sessions:', error);
      return false;
    }
  }

  /**
   * Prune oldest sessions
   */
  private static pruneOldestSessions(count: number): void {
    try {
      const sessions = this.getAllSessions();
      
      if (sessions.length <= count) {
        // Remove all sessions if count is too small
        this.clearAllSessions();
        return;
      }

      // Keep only the most recent sessions
      const pruned = sessions.slice(0, sessions.length - count);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
      
      console.log(`[SessionStorage] Pruned ${count} oldest sessions`);
    } catch (error) {
      console.error('[SessionStorage] Failed to prune sessions:', error);
    }
  }
}

/**
 * Helper function to check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}
