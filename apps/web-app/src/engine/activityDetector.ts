/**
 * ═══════════════════════════════════════════════════════════════════
 * ACTIVITY DETECTOR — Real-World Action Recognition
 * ═══════════════════════════════════════════════════════════════════
 *
 * Determines:
 *   1. Is a human present in the frame? (quick visibility check)
 *   2. Is the person actually performing the selected activity?
 *   3. What per-frame quality score should this frame receive?
 *
 * This replaces the "always 100" scoring bug with a meaningful
 * frame-quality percentage system.
 *
 * Activity heuristics:
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │  Fitness / Squat                                            │
 *  │  • Performing: min knee angle in window < 140° (bending)   │
 *  │  • Idle:       both knees > 155° (standing straight)       │
 *  └─────────────────────────────────────────────────────────────┘
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │  Cricket / Bowling                                          │
 *  │  • Performing: wrist above shoulder OR shoulder range > 30° │
 *  │  • Idle:       standing neutral with no arm raise           │
 *  └─────────────────────────────────────────────────────────────┘
 */

import { BiomechanicsFrame } from '../Biomechanics/angleCalculator';
import { Landmark } from '../ai/poseEstimator';
import { LANDMARK_INDICES } from '../Biomechanics/angleCalculator';
import { RuleViolation } from '../rules/ruleEngine';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type ActivityStatus =
  | 'no_human'         // No person detected in frame
  | 'idle'             // Human present but not performing the selected activity
  | 'performing'       // Human actively performing the selected activity
  | 'wrong_activity';  // Human is moving, but not the right exercise

export interface ActivityDetectionResult {
  status: ActivityStatus;
  /** Human-readable feedback to show in overlay */
  message: string;
  /** Severity of the overlay message */
  severity: 'info' | 'warning' | 'error';
  /** Per-frame quality score 0-100 (only meaningful when 'performing') */
  frameQualityScore: number;
}

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────

const SQUAT_ACTIVE_KNEE_THRESHOLD = 140;   // degrees — below this = squatting
const SQUAT_IDLE_KNEE_THRESHOLD   = 158;   // degrees — above this = standing idle
const CRICKET_WRIST_ABOVE_SHOULDER_MARGIN = 0.04; // normalized y offset

/** Number of recent angles to keep for rolling window analysis */
const WINDOW_SIZE = 15; // ~0.5s at 30fps

// ─────────────────────────────────────────────────────────────────
// Activity Detector Class
// ─────────────────────────────────────────────────────────────────

export class ActivityDetector {
  private activity: 'fitness' | 'cricket';

  // Rolling windows for angle history
  private leftKneeWindow:    number[] = [];
  private rightKneeWindow:   number[] = [];
  private leftShoulderWindow: number[] = [];
  private rightShoulderWindow: number[] = [];

  // Running counters for scoring
  private totalScoredFrames  = 0;
  private goodFrames         = 0;

  constructor(activity: 'fitness' | 'cricket') {
    this.activity = activity;
  }

  /** Change activity type (resets history) */
  setActivity(activity: 'fitness' | 'cricket'): void {
    this.activity = activity;
    this.reset();
  }

  /** Reset all history (call on session start/stop) */
  reset(): void {
    this.leftKneeWindow      = [];
    this.rightKneeWindow     = [];
    this.leftShoulderWindow  = [];
    this.rightShoulderWindow = [];
    this.totalScoredFrames   = 0;
    this.goodFrames          = 0;
  }

  /** Compute overall session performance score (0-100) */
  getSessionScore(): number {
    if (this.totalScoredFrames === 0) return 100; // no data yet — neutral
    return Math.round((this.goodFrames / this.totalScoredFrames) * 100);
  }

  /** Total frames analysed for scoring */
  getScoredFrameCount(): number {
    return this.totalScoredFrames;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * MAIN EVALUATION
   * ═══════════════════════════════════════════════════════════════
   *
   * @param frame       Biomechanics angles for current frame
   * @param landmarks   Raw pose landmarks for position checks
   * @param violations  Active rule violations in this frame
   */
  evaluate(
    frame:      BiomechanicsFrame | null,
    landmarks:  Landmark[] | null,
    violations: RuleViolation[]
  ): ActivityDetectionResult {

    // ── 1. Human presence check ──────────────────────────────────
    if (!landmarks || landmarks.length === 0) {
      return {
        status: 'no_human',
        message: 'No athlete detected — please step into frame.',
        severity: 'error',
        frameQualityScore: 0,
      };
    }

    const humanPresent = this.isHumanPresent(landmarks);
    if (!humanPresent) {
      return {
        status: 'no_human',
        message: 'No athlete detected — please step fully into frame.',
        severity: 'error',
        frameQualityScore: 0,
      };
    }

    // ── 2. Push angles into rolling windows ──────────────────────
    if (frame) {
      this.pushWindow(this.leftKneeWindow,      frame.leftKneeAngle);
      this.pushWindow(this.rightKneeWindow,     frame.rightKneeAngle);
      this.pushWindow(this.leftShoulderWindow,  frame.leftShoulderAngle);
      this.pushWindow(this.rightShoulderWindow, frame.rightShoulderAngle);
    }

    // ── 3. Activity-specific detection ───────────────────────────
    if (this.activity === 'fitness') {
      return this.evaluateSquat(violations);
    } else {
      return this.evaluateCricketBowling(landmarks, violations);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Private — Squat Detection
  // ─────────────────────────────────────────────────────────────

  private evaluateSquat(violations: RuleViolation[]): ActivityDetectionResult {
    const minLeftKnee  = this.windowMin(this.leftKneeWindow);
    const minRightKnee = this.windowMin(this.rightKneeWindow);
    const minKnee      = Math.min(minLeftKnee, minRightKnee);

    const avgLeftKnee  = this.windowAvg(this.leftKneeWindow);
    const avgRightKnee = this.windowAvg(this.rightKneeWindow);
    const avgKnee      = (avgLeftKnee + avgRightKnee) / 2;

    // Not enough data yet or knee landmarks not visible
    if (!isFinite(minKnee) || !isFinite(avgKnee)) {
      return {
        status: 'idle',
        message: 'Position yourself so your full body is visible. Begin squatting.',
        severity: 'info',
        frameQualityScore: 0,
      };
    }

    const isSquatting = minKnee < SQUAT_ACTIVE_KNEE_THRESHOLD;
    const isIdle      = avgKnee > SQUAT_IDLE_KNEE_THRESHOLD;

    if (isIdle && !isSquatting) {
      return {
        status: 'idle',
        message: 'Standing idle — begin your squat to start scoring.',
        severity: 'info',
        frameQualityScore: 0,
      };
    }

    // Person is performing a squat or transitioning
    const frameScore = this.computeFrameScore(violations);
    this.totalScoredFrames++;
    if (frameScore >= 80) this.goodFrames++;

    const errorViolations   = violations.filter(v => v.severity === 'error').length;
    const warningViolations = violations.filter(v => v.severity === 'warning').length;

    if (errorViolations > 0) {
      return {
        status: 'performing',
        message: `Squat detected — fix critical form errors  (score: ${frameScore}/100)`,
        severity: 'error',
        frameQualityScore: frameScore,
      };
    }

    if (warningViolations > 0) {
      return {
        status: 'performing',
        message: `Squat in progress — improve your form  (score: ${frameScore}/100)`,
        severity: 'warning',
        frameQualityScore: frameScore,
      };
    }

    return {
      status: 'performing',
      message: `Perfect squat form!  (score: ${frameScore}/100)`,
      severity: 'info',
      frameQualityScore: frameScore,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Private — Cricket Bowling Detection
  // ─────────────────────────────────────────────────────────────

  private evaluateCricketBowling(
    landmarks: Landmark[],
    violations: RuleViolation[]
  ): ActivityDetectionResult {
    // Check if wrist has been raised above shoulder (key bowling cue)
    const rightShoulder = landmarks[LANDMARK_INDICES.RIGHT_SHOULDER];
    const rightWrist    = landmarks[LANDMARK_INDICES.RIGHT_WRIST];
    const leftWrist     = landmarks[LANDMARK_INDICES.LEFT_WRIST];

    const shoulderRange = this.windowRange(this.rightShoulderWindow);

    let armRaised = false;
    if (rightShoulder && rightWrist) {
      // In normalized coords, y increases downward → wrist above shoulder = wrist.y < shoulder.y
      armRaised = (rightWrist.y < rightShoulder.y + CRICKET_WRIST_ABOVE_SHOULDER_MARGIN) ||
                  (leftWrist && leftWrist.y  < rightShoulder.y + CRICKET_WRIST_ABOVE_SHOULDER_MARGIN);
    }

    const shoulderRotating = isFinite(shoulderRange) && shoulderRange > 30;

    if (!armRaised && !shoulderRotating) {
      return {
        status: 'idle',
        message: 'Standing idle — perform your bowling action to start scoring.',
        severity: 'info',
        frameQualityScore: 0,
      };
    }

    const frameScore = this.computeFrameScore(violations);
    this.totalScoredFrames++;
    if (frameScore >= 80) this.goodFrames++;

    const errorViolations = violations.filter(v => v.severity === 'error').length;
    if (errorViolations > 0) {
      return {
        status: 'performing',
        message: `Bowling action detected — fix illegal action  (score: ${frameScore}/100)`,
        severity: 'error',
        frameQualityScore: frameScore,
      };
    }

    return {
      status: 'performing',
      message: `Bowling action in progress  (score: ${frameScore}/100)`,
      severity: violations.length > 0 ? 'warning' : 'info',
      frameQualityScore: frameScore,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Private — Helpers
  // ─────────────────────────────────────────────────────────────

  /**
   * Strict human-presence gate — prevents skeletons on non-human objects.
   *
   * Requires ALL of the following:
   *  1. At least 6 of 8 major body joints visible at ≥ 0.5 confidence
   *  2. Both shoulders visible at ≥ 0.5 (upper-body anchor)
   *  3. At least one hip visible at ≥ 0.5 (torso anchor)
   *  4. Mean confidence of the 8 joints ≥ 0.45
   *  5. Torso geometry: shoulders y < hips y (person is upright, not inverted noise)
   *
   * This prevents MediaPipe from "finding" a pose on chairs, walls, or props.
   */
  private isHumanPresent(landmarks: Landmark[]): boolean {
    const VIS_THRESHOLD = 0.50;

    const criticalIndices = [
      LANDMARK_INDICES.LEFT_SHOULDER,
      LANDMARK_INDICES.RIGHT_SHOULDER,
      LANDMARK_INDICES.LEFT_HIP,
      LANDMARK_INDICES.RIGHT_HIP,
      LANDMARK_INDICES.LEFT_KNEE,
      LANDMARK_INDICES.RIGHT_KNEE,
      LANDMARK_INDICES.LEFT_ANKLE,
      LANDMARK_INDICES.RIGHT_ANKLE,
    ];

    // Gate 1: At least 6 / 8 joints at sufficient visibility
    let visibleCount = 0;
    let visibilitySum = 0;
    for (const idx of criticalIndices) {
      const vis = idx < landmarks.length ? (landmarks[idx]?.visibility ?? 0) : 0;
      visibilitySum += vis;
      if (vis >= VIS_THRESHOLD) visibleCount++;
    }
    if (visibleCount < 6) return false;

    // Gate 2: Both shoulders must be confidently detected (upper-body anchor)
    const lShoulderVis = (landmarks[LANDMARK_INDICES.LEFT_SHOULDER]?.visibility ?? 0);
    const rShoulderVis = (landmarks[LANDMARK_INDICES.RIGHT_SHOULDER]?.visibility ?? 0);
    if (lShoulderVis < VIS_THRESHOLD || rShoulderVis < VIS_THRESHOLD) return false;

    // Gate 3: At least one hip visible (torso anchor)
    const lHipVis = (landmarks[LANDMARK_INDICES.LEFT_HIP]?.visibility ?? 0);
    const rHipVis = (landmarks[LANDMARK_INDICES.RIGHT_HIP]?.visibility ?? 0);
    if (lHipVis < VIS_THRESHOLD && rHipVis < VIS_THRESHOLD) return false;

    // Gate 4: Mean confidence of all 8 joints must be ≥ 0.45
    const meanVis = visibilitySum / criticalIndices.length;
    if (meanVis < 0.45) return false;

    // Gate 5: Torso geometry — shoulders should be ABOVE hips in frame
    // (MediaPipe normalized y: 0 = top, 1 = bottom, so shoulder.y < hip.y is upright)
    const lShoulder = landmarks[LANDMARK_INDICES.LEFT_SHOULDER];
    const rShoulder = landmarks[LANDMARK_INDICES.RIGHT_SHOULDER];
    const lHip = landmarks[LANDMARK_INDICES.LEFT_HIP];
    const rHip = landmarks[LANDMARK_INDICES.RIGHT_HIP];

    if (lShoulder && rShoulder && (lHip || rHip)) {
      const avgShoulderY = (lShoulder.y + rShoulder.y) / 2;
      const validHips = [lHip, rHip].filter(Boolean) as Landmark[];
      const avgHipY = validHips.reduce((s, h) => s + h.y, 0) / validHips.length;
      // Shoulders must be at least 5% of frame height above hips
      if (avgShoulderY > avgHipY - 0.05) return false;
    }

    return true;
  }

  /** Push a value into a rolling window, trimming to WINDOW_SIZE */
  private pushWindow(window: number[], value: number | null | undefined): void {
    if (value !== null && value !== undefined && isFinite(value)) {
      window.push(value);
      if (window.length > WINDOW_SIZE) window.shift();
    }
  }

  /** Minimum value in window (Infinity if empty) */
  private windowMin(window: number[]): number {
    return window.length > 0 ? Math.min(...window) : Infinity;
  }

  /** Average value in window (NaN if empty) */
  private windowAvg(window: number[]): number {
    if (window.length === 0) return NaN;
    return window.reduce((a, b) => a + b, 0) / window.length;
  }

  /** Range (max - min) in window */
  private windowRange(window: number[]): number {
    if (window.length < 2) return 0;
    return Math.max(...window) - Math.min(...window);
  }

  /**
   * Per-frame quality score based on violations:
   *  - No violations        → 100
   *  - Info violations      → 85
   *  - Warning violations   → 60
   *  - Error violations     → 20
   */
  private computeFrameScore(violations: RuleViolation[]): number {
    const errors   = violations.filter(v => v.severity === 'error').length;
    const warnings = violations.filter(v => v.severity === 'warning').length;
    const infos    = violations.filter(v => v.severity === 'info').length;

    if (errors > 0)   return Math.max(0, 20 - errors * 5);
    if (warnings > 0) return Math.max(0, 60 - warnings * 10);
    if (infos > 0)    return 85;
    return 100;
  }
}
