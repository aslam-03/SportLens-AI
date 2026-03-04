/**
 * Session Aggregator for SportLens AI
 *
 * Handles real-time aggregation of biomechanical metrics during a training
 * session. Now uses frame-quality based scoring instead of violation count
 * penalty â€” giving meaningful 0-100 scores that reflect true performance.
 *
 * Key Design Decisions:
 * - Running statistics (no raw frames stored â€” O(1) memory)
 * - Frame-quality scoring: (goodFrames / totalScoredFrames) * 100
 * - Distinguishes: no_human / idle / performing frames
 */

import type { BiomechanicsFrame } from '../Biomechanics/angleCalculator';
import type { RuleViolation } from '../rules/ruleEngine';
import type {
  Session,
  SessionInProgress,
  ActivityType,
  BiomechanicsMetrics,
  ViolationCounts,
  SessionMetrics
} from '../types/session';
import { calculatePerformanceScore } from '../types/session';
import type { ActivityStatus } from '../engine/activityDetector';

/**
 * Statistics tracker for a single angle metric
 */
class AngleStatistics {
  private count = 0;
  private sum = 0;
  private min = Infinity;
  private max = -Infinity;

  add(angle: number): void {
    if (!isFinite(angle) || isNaN(angle)) return;
    this.count++;
    this.sum += angle;
    this.min = Math.min(this.min, angle);
    this.max = Math.max(this.max, angle);
  }

  get(): { avg: number; min: number; max: number } | null {
    if (this.count === 0) return null;
    return {
      avg: Math.round(this.sum / this.count),
      min: Math.round(this.min),
      max: Math.round(this.max),
    };
  }

  reset(): void {
    this.count = 0;
    this.sum = 0;
    this.min = Infinity;
    this.max = -Infinity;
  }
}

/**
 * Session Aggregator Class
 */
export class SessionAggregator {
  private session: SessionInProgress | null = null;

  // Angle statistics
  private leftKneeStats    = new AngleStatistics();
  private rightKneeStats   = new AngleStatistics();
  private leftHipStats     = new AngleStatistics();
  private rightHipStats    = new AngleStatistics();
  private leftElbowStats   = new AngleStatistics();
  private rightElbowStats  = new AngleStatistics();
  private leftShoulderStats  = new AngleStatistics();
  private rightShoulderStats = new AngleStatistics();

  // Violation tracking
  private violationCounts: ViolationCounts = {};
  private totalFrames = 0;

  // Frame-quality scoring (replaces penalty system)
  private totalScoredFrames = 0;   // frames where activity was detected
  private goodFrames        = 0;   // scored frames with quality >= 80
  private noHumanFrames     = 0;   // frames with no human detected
  private idleFrames        = 0;   // frames where human was idle

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Public API
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  startSession(activityType: ActivityType): SessionInProgress {
    this.reset();
    const sessionId = this.generateSessionId();
    this.session = { sessionId, startTime: Date.now(), activityType };
    console.log(`[SessionAggregator] Started: ${sessionId} (${activityType})`);
    return this.session;
  }

  addFrame(frame: BiomechanicsFrame): void {
    if (!this.session) return;
    this.totalFrames++;
    if (frame.leftKneeAngle   != null) this.leftKneeStats.add(frame.leftKneeAngle);
    if (frame.rightKneeAngle  != null) this.rightKneeStats.add(frame.rightKneeAngle);
    if (frame.leftHipAngle    != null) this.leftHipStats.add(frame.leftHipAngle);
    if (frame.rightHipAngle   != null) this.rightHipStats.add(frame.rightHipAngle);
    if (frame.leftElbowAngle  != null) this.leftElbowStats.add(frame.leftElbowAngle);
    if (frame.rightElbowAngle != null) this.rightElbowStats.add(frame.rightElbowAngle);
    if (frame.leftShoulderAngle  != null) this.leftShoulderStats.add(frame.leftShoulderAngle);
    if (frame.rightShoulderAngle != null) this.rightShoulderStats.add(frame.rightShoulderAngle);
  }

  addViolations(violations: RuleViolation[]): void {
    if (!this.session) return;
    for (const v of violations) {
      this.violationCounts[v.ruleId] = (this.violationCounts[v.ruleId] ?? 0) + 1;
    }
  }

  /**
   * Record per-frame quality result from the ActivityDetector.
   * Called every frame while session is active.
   *
   * @param status          ActivityStatus from ActivityDetector
   * @param frameQuality    0-100 quality score (only meaningful when 'performing')
   */
  addFrameQuality(status: ActivityStatus, frameQuality: number): void {
    if (!this.session) return;
    switch (status) {
      case 'no_human':
        this.noHumanFrames++;
        break;
      case 'idle':
      case 'wrong_activity':
        this.idleFrames++;
        break;
      case 'performing':
        this.totalScoredFrames++;
        if (frameQuality >= 80) this.goodFrames++;
        break;
    }
  }

  stopSession(notes?: string): Session | null {
    if (!this.session) return null;

    const endTime  = Date.now();
    const duration = (endTime - this.session.startTime) / 1000;

    // Build biomechanics metrics
    const biomechanics: BiomechanicsMetrics = { totalFrames: this.totalFrames };
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

    const totalViolations = Object.values(this.violationCounts).reduce((s, c) => s + c, 0);

    // Frame-quality based score â€” replaces the old penalty formula
    const performanceScore = calculatePerformanceScore(this.goodFrames, this.totalScoredFrames);

    const metrics: SessionMetrics = {
      biomechanics,
      violations:         { ...this.violationCounts },
      totalViolations,
      performanceScore,
      totalScoredFrames:  this.totalScoredFrames,
      goodFrames:         this.goodFrames,
      noHumanFrames:      this.noHumanFrames,
      idleFrames:         this.idleFrames,
    };

    const completedSession: Session = {
      sessionId:    this.session.sessionId,
      startTime:    this.session.startTime,
      endTime,
      duration,
      activityType: this.session.activityType,
      metrics,
      notes,
      syncStatus:   'pending',
    };

    console.log(
      `[SessionAggregator] Stopped: ${this.session.sessionId} | ` +
      `${duration.toFixed(1)}s | ${this.totalFrames} frames | ` +
      `scored: ${this.totalScoredFrames} | good: ${this.goodFrames} | ` +
      `score: ${performanceScore} | violations: ${totalViolations}`
    );

    this.session = null;
    return completedSession;
  }

  isActive(): boolean { return this.session !== null; }
  getCurrentSession(): SessionInProgress | null { return this.session; }

  getCurrentDuration(): number {
    return this.session ? (Date.now() - this.session.startTime) / 1000 : 0;
  }

  getFrameCount(): number { return this.totalFrames; }

  getViolationCount(): number {
    return Object.values(this.violationCounts).reduce((s, c) => s + c, 0);
  }

  /** Live performance score during an active session */
  getLiveScore(): number {
    return calculatePerformanceScore(this.goodFrames, this.totalScoredFrames);
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    this.violationCounts  = {};
    this.totalFrames      = 0;
    this.totalScoredFrames = 0;
    this.goodFrames       = 0;
    this.noHumanFrames    = 0;
    this.idleFrames       = 0;
  }

  private generateSessionId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
