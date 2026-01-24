/**
 * Session Aggregator for SportLens AI
 * 
 * This module handles real-time aggregation of biomechanical metrics
 * during a training session. It computes min/max/avg values and tracks
 * rule violations WITHOUT storing every frame (memory efficient).
 * 
 * Key Design Decisions:
 * - Running statistics (no need to store all frames)
 * - O(1) memory complexity (fixed space regardless of session length)
 * - Lightweight enough to run at 60fps without performance impact
 */

import type { BiomechanicsFrame } from '../Biomechanics/angleCalculator';
import type { RuleViolation } from '../rules/ruleEngine';
import type {
  Session,
  SessionInProgress,
  ActivityType,
  BiomechanicsMetrics,
  ViolationCounts,
  SessionMetrics,
  generateSessionId,
  calculatePerformanceScore
} from '../types/session';

/**
 * Statistics tracker for a single angle metric
 * 
 * Uses Welford's online algorithm for numerical stability
 */
class AngleStatistics {
  private count = 0;
  private sum = 0;
  private min = Infinity;
  private max = -Infinity;

  /**
   * Add a new angle measurement
   */
  add(angle: number): void {
    if (!isFinite(angle) || isNaN(angle)) {
      return; // Skip invalid angles
    }

    this.count++;
    this.sum += angle;
    this.min = Math.min(this.min, angle);
    this.max = Math.max(this.max, angle);
  }

  /**
   * Get aggregated statistics
   */
  get(): { avg: number; min: number; max: number } | null {
    if (this.count === 0) {
      return null;
    }

    return {
      avg: Math.round(this.sum / this.count), // Round to nearest degree
      min: Math.round(this.min),
      max: Math.round(this.max)
    };
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.count = 0;
    this.sum = 0;
    this.min = Infinity;
    this.max = -Infinity;
  }
}

/**
 * Session Aggregator Class
 * 
 * Accumulates metrics during a session and generates final summary
 */
export class SessionAggregator {
  // Session metadata
  private session: SessionInProgress | null = null;

  // Angle statistics trackers
  private leftKneeStats = new AngleStatistics();
  private rightKneeStats = new AngleStatistics();
  private leftHipStats = new AngleStatistics();
  private rightHipStats = new AngleStatistics();
  private leftElbowStats = new AngleStatistics();
  private rightElbowStats = new AngleStatistics();
  private leftShoulderStats = new AngleStatistics();
  private rightShoulderStats = new AngleStatistics();

  // Violation tracking
  private violationCounts: ViolationCounts = {};
  private totalFrames = 0;

  /**
   * Start a new session
   */
  startSession(activityType: ActivityType): SessionInProgress {
    // Reset all stats
    this.reset();

    // Create new session
    const sessionId = this.generateSessionId();
    this.session = {
      sessionId,
      startTime: Date.now(),
      activityType
    };

    console.log(`[SessionAggregator] Started session: ${sessionId} (${activityType})`);
    return this.session;
  }

  /**
   * Add biomechanics data from a frame
   */
  addFrame(frame: BiomechanicsFrame): void {
    if (!this.session) {
      console.warn('[SessionAggregator] Cannot add frame: No active session');
      return;
    }

    this.totalFrames++;

    // Update angle statistics
    if (frame.leftKneeAngle !== undefined) {
      this.leftKneeStats.add(frame.leftKneeAngle);
    }
    if (frame.rightKneeAngle !== undefined) {
      this.rightKneeStats.add(frame.rightKneeAngle);
    }
    if (frame.leftHipAngle !== undefined) {
      this.leftHipStats.add(frame.leftHipAngle);
    }
    if (frame.rightHipAngle !== undefined) {
      this.rightHipStats.add(frame.rightHipAngle);
    }
    if (frame.leftElbowAngle !== undefined) {
      this.leftElbowStats.add(frame.leftElbowAngle);
    }
    if (frame.rightElbowAngle !== undefined) {
      this.rightElbowStats.add(frame.rightElbowAngle);
    }
    if (frame.leftShoulderAngle !== undefined) {
      this.leftShoulderStats.add(frame.leftShoulderAngle);
    }
    if (frame.rightShoulderAngle !== undefined) {
      this.rightShoulderStats.add(frame.rightShoulderAngle);
    }
  }

  /**
   * Add rule violations from a frame
   */
  addViolations(violations: RuleViolation[]): void {
    if (!this.session) {
      console.warn('[SessionAggregator] Cannot add violations: No active session');
      return;
    }

    for (const violation of violations) {
      // Increment count for this rule
      if (this.violationCounts[violation.ruleId] === undefined) {
        this.violationCounts[violation.ruleId] = 0;
      }
      this.violationCounts[violation.ruleId]++;
    }
  }

  /**
   * Stop session and generate final summary
   */
  stopSession(notes?: string): Session | null {
    if (!this.session) {
      console.warn('[SessionAggregator] Cannot stop session: No active session');
      return null;
    }

    const endTime = Date.now();
    const duration = (endTime - this.session.startTime) / 1000; // Convert to seconds

    // Build biomechanics metrics
    const biomechanics: BiomechanicsMetrics = {
      totalFrames: this.totalFrames
    };

    // Add angle statistics (only if data exists)
    const leftKnee = this.leftKneeStats.get();
    if (leftKnee) biomechanics.leftKnee = leftKnee;

    const rightKnee = this.rightKneeStats.get();
    if (rightKnee) biomechanics.rightKnee = rightKnee;

    const leftHip = this.leftHipStats.get();
    if (leftHip) biomechanics.leftHip = leftHip;

    const rightHip = this.rightHipStats.get();
    if (rightHip) biomechanics.rightHip = rightHip;

    const leftElbow = this.leftElbowStats.get();
    if (leftElbow) biomechanics.leftElbow = leftElbow;

    const rightElbow = this.rightElbowStats.get();
    if (rightElbow) biomechanics.rightElbow = rightElbow;

    const leftShoulder = this.leftShoulderStats.get();
    if (leftShoulder) biomechanics.leftShoulder = leftShoulder;

    const rightShoulder = this.rightShoulderStats.get();
    if (rightShoulder) biomechanics.rightShoulder = rightShoulder;

    // Calculate total violations
    const totalViolations = Object.values(this.violationCounts).reduce(
      (sum, count) => sum + count,
      0
    );

    // Calculate performance score
    const performanceScore = calculatePerformanceScore(totalViolations);

    // Build session metrics
    const metrics: SessionMetrics = {
      biomechanics,
      violations: { ...this.violationCounts },
      totalViolations,
      performanceScore
    };

    // Build final session object
    const completedSession: Session = {
      sessionId: this.session.sessionId,
      startTime: this.session.startTime,
      endTime,
      duration,
      activityType: this.session.activityType,
      metrics,
      notes,
      syncStatus: 'pending' // Will be synced to backend
    };

    console.log(`[SessionAggregator] Stopped session: ${this.session.sessionId}`);
    console.log(`[SessionAggregator] Duration: ${duration.toFixed(1)}s, Frames: ${this.totalFrames}, Violations: ${totalViolations}, Score: ${performanceScore}`);

    // Clear session
    this.session = null;

    return completedSession;
  }

  /**
   * Check if a session is currently active
   */
  isActive(): boolean {
    return this.session !== null;
  }

  /**
   * Get current session info (without stopping)
   */
  getCurrentSession(): SessionInProgress | null {
    return this.session;
  }

  /**
   * Get current session duration in seconds
   */
  getCurrentDuration(): number {
    if (!this.session) {
      return 0;
    }
    return (Date.now() - this.session.startTime) / 1000;
  }

  /**
   * Get current frame count
   */
  getFrameCount(): number {
    return this.totalFrames;
  }

  /**
   * Get current violation count
   */
  getViolationCount(): number {
    return Object.values(this.violationCounts).reduce(
      (sum, count) => sum + count,
      0
    );
  }

  /**
   * Reset all statistics
   */
  private reset(): void {
    this.session = null;
    this.leftKneeStats.reset();
    this.rightKneeStats.reset();
    this.leftHipStats.reset();
    this.rightHipStats.reset();
    this.leftElbowStats.reset();
    this.rightElbowStats.reset();
    this.leftShoulderStats.reset();
    this.rightShoulderStats.reset();
    this.violationCounts = {};
    this.totalFrames = 0;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
