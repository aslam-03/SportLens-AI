/**
 * Session Data Model for SportLens AI
 * 
 * This defines the structure for training sessions, including:
 * - Unique identification
 * - Temporal information (start, end, duration)
 * - Activity classification
 * - Aggregated biomechanical metrics
 * - Rule violation tracking
 * 
 * Design Philosophy:
 * - Compact: Store summaries, not raw frames
 * - Review-friendly: Easy to display in dashboards
 * - Extensible: Can add new metrics without breaking schema
 */

/**
 * Activity types supported by the system
 */
export type ActivityType = 'fitness' | 'cricket';

/**
 * Aggregated biomechanical metrics for a session
 * 
 * These are computed from all frames during the session:
 * - Average, min, max for key joint angles
 * - Separate tracking for left/right sides
 */
export interface BiomechanicsMetrics {
  // Knee angles (degrees)
  leftKnee?: {
    avg: number;
    min: number;
    max: number;
  };
  rightKnee?: {
    avg: number;
    min: number;
    max: number;
  };
  
  // Hip angles (degrees)
  leftHip?: {
    avg: number;
    min: number;
    max: number;
  };
  rightHip?: {
    avg: number;
    min: number;
    max: number;
  };
  
  // Elbow angles (degrees)
  leftElbow?: {
    avg: number;
    min: number;
    max: number;
  };
  rightElbow?: {
    avg: number;
    min: number;
    max: number;
  };
  
  // Shoulder angles (degrees)
  leftShoulder?: {
    avg: number;
    min: number;
    max: number;
  };
  rightShoulder?: {
    avg: number;
    min: number;
    max: number;
  };
  
  // Frame count for validation
  totalFrames: number;
}

/**
 * Rule violation tracking
 * 
 * Maps rule ID to violation count during session
 * Example: { "squat-depth-shallow": 5, "knee-lockout-left": 2 }
 */
export interface ViolationCounts {
  [ruleId: string]: number;
}

/**
 * Session summary statistics
 */
export interface SessionMetrics {
  // Biomechanical data
  biomechanics: BiomechanicsMetrics;
  
  // Rule violations
  violations: ViolationCounts;
  
  // Total violation count (sum of all violation counts)
  totalViolations: number;
  
  // Performance score (0-100, higher is better)
  // Calculated as: max(0, 100 - (totalViolations * penalty))
  performanceScore: number;
}

/**
 * Complete session data structure
 * 
 * This is the core data model for a training session.
 * It's designed to be:
 * - Lightweight (no raw video/frames)
 * - Storable (JSON-serializable)
 * - Analyzable (aggregated metrics ready for charts)
 */
export interface Session {
  // Unique identifier (UUID v4)
  sessionId: string;
  
  // Timestamps (Unix milliseconds)
  startTime: number;
  endTime: number;
  
  // Duration in seconds (computed: (endTime - startTime) / 1000)
  duration: number;
  
  // Activity classification
  activityType: ActivityType;
  
  // Aggregated metrics
  metrics: SessionMetrics;
  
  // Optional metadata
  notes?: string;
  
  // Sync status (for future backend integration)
  syncStatus?: 'pending' | 'synced' | 'failed';
  syncedAt?: number;
}

/**
 * Helper type for session creation (before endTime is known)
 */
export interface SessionInProgress {
  sessionId: string;
  startTime: number;
  activityType: ActivityType;
}

/**
 * Helper function to generate unique session IDs
 */
export function generateSessionId(): string {
  // Simple UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Helper function to calculate performance score
 * 
 * Formula: max(0, 100 - (totalViolations * violationPenalty))
 * - Perfect form (0 violations) = 100 score
 * - Each violation reduces score by penalty (default 5 points)
 * - Minimum score is 0
 */
export function calculatePerformanceScore(
  totalViolations: number,
  violationPenalty: number = 5
): number {
  return Math.max(0, 100 - (totalViolations * violationPenalty));
}

/**
 * Helper function to format duration
 * 
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "2m 30s", "45s")
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Helper function to format timestamp
 * 
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted string (e.g., "Jan 24, 2026 3:45 PM")
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
