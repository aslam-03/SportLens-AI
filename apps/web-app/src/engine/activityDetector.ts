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

  // Debug counter to throttle console logs
  private _debugCounter = 0;

  // Velocity-based movement tracking (fallback when angle data is sparse)
  private prevLandmarks: Landmark[] | null = null;
  private velocityWindow: number[] = [];
  private readonly VELOCITY_WINDOW_SIZE = 10;

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
    this._debugCounter       = 0;
    this.prevLandmarks       = null;
    this.velocityWindow      = [];
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

      // Debug: log angle availability every ~60 frames
      if (this._debugCounter % 60 === 0) {
        console.log(`[ActivityDetector] Angles — LKnee: ${frame.leftKneeAngle?.toFixed(1) ?? 'null'}, RKnee: ${frame.rightKneeAngle?.toFixed(1) ?? 'null'}, LShoulder: ${frame.leftShoulderAngle?.toFixed(1) ?? 'null'}, RShoulder: ${frame.rightShoulderAngle?.toFixed(1) ?? 'null'} | Windows: LK=${this.leftKneeWindow.length} RK=${this.rightKneeWindow.length} LS=${this.leftShoulderWindow.length} RS=${this.rightShoulderWindow.length}`);
      }
    } else {
      // No biomechanics frame — log warning
      if (this._debugCounter % 60 === 0) {
        console.warn(`[ActivityDetector] No biomechanics frame — angles not available`);
      }
    }

    // ── 2b. Velocity-based movement tracking ─────────────────────
    const velocity = this.computeBodyVelocity(landmarks);
    this.pushWindow(this.velocityWindow, velocity);
    if (this.velocityWindow.length > this.VELOCITY_WINDOW_SIZE) {
      this.velocityWindow.shift();
    }
    this.prevLandmarks = [...landmarks];

    // ── 3. Activity-specific detection ───────────────────────────
    if (this.activity === 'fitness') {
      return this.evaluateSquat(violations, velocity);
    } else {
      return this.evaluateCricketBowling(landmarks, violations, velocity);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Private — Squat Detection
  // ─────────────────────────────────────────────────────────────

  private evaluateSquat(violations: RuleViolation[], velocity: number): ActivityDetectionResult {
    // ── Use whichever knee side has data (fixes NaN when only one side visible) ──
    const hasLeft  = this.leftKneeWindow.length > 0;
    const hasRight = this.rightKneeWindow.length > 0;

    let minKnee: number;
    let avgKnee: number;

    if (hasLeft && hasRight) {
      minKnee = Math.min(this.windowMin(this.leftKneeWindow), this.windowMin(this.rightKneeWindow));
      avgKnee = (this.windowAvg(this.leftKneeWindow) + this.windowAvg(this.rightKneeWindow)) / 2;
    } else if (hasLeft) {
      minKnee = this.windowMin(this.leftKneeWindow);
      avgKnee = this.windowAvg(this.leftKneeWindow);
    } else if (hasRight) {
      minKnee = this.windowMin(this.rightKneeWindow);
      avgKnee = this.windowAvg(this.rightKneeWindow);
    } else {
      // No knee data at all — check if hip angles show movement as fallback
      const hasHipData = this.leftShoulderWindow.length > 0 || this.rightShoulderWindow.length > 0;
      if (hasHipData) {
        // Hip/shoulder movement detected but no knee data — likely legs are partially occluded
        return {
          status: 'idle',
          message: 'Knees not visible — adjust camera to show your full body.',
          severity: 'warning',
          frameQualityScore: 0,
        };
      }
      return {
        status: 'idle',
        message: 'Position yourself so your full body is visible. Begin squatting.',
        severity: 'info',
        frameQualityScore: 0,
      };
    }

    // Safety check (shouldn't happen now, but guard against edge cases)
    if (!isFinite(minKnee) || !isFinite(avgKnee)) {
      return {
        status: 'idle',
        message: 'Position yourself so your full body is visible. Begin squatting.',
        severity: 'info',
        frameQualityScore: 0,
      };
    }

    // Debug logging (every ~30 frames to avoid flooding)
    if (this._debugCounter++ % 30 === 0) {
      console.log(`[ActivityDetector] Squat check — minKnee: ${minKnee.toFixed(1)}°, avgKnee: ${avgKnee.toFixed(1)}°, L-window: ${this.leftKneeWindow.length}, R-window: ${this.rightKneeWindow.length}, threshold: <${SQUAT_ACTIVE_KNEE_THRESHOLD}° = squatting, >${SQUAT_IDLE_KNEE_THRESHOLD}° = idle`);
    }

    const isSquatting = minKnee < SQUAT_ACTIVE_KNEE_THRESHOLD;
    const isIdle      = avgKnee > SQUAT_IDLE_KNEE_THRESHOLD;

    // Velocity fallback: if angles say "idle" but body is clearly moving,
    // treat as "performing" (catches partial squats, transitions, warm-up moves)
    const avgVelocity = this.windowAvg(this.velocityWindow);
    const significantMovement = isFinite(avgVelocity) && avgVelocity > 0.005;

    if (isIdle && !isSquatting && !significantMovement) {
      return {
        status: 'idle',
        message: 'Standing idle — begin your squat to start scoring.',
        severity: 'info',
        frameQualityScore: 0,
      };
    }

    // If knee angles say idle but velocity is high → person is moving/transitioning
    if (isIdle && !isSquatting && significantMovement) {
      return {
        status: 'performing',
        message: 'Movement detected — performing exercise (bend deeper for better score)',
        severity: 'info',
        frameQualityScore: 40,  // Lower score since form isn't in ideal range yet
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
    violations: RuleViolation[],
    velocity: number
  ): ActivityDetectionResult {
    // Check if wrist has been raised above shoulder (key bowling cue)
    // Check BOTH sides — supports left-handed and right-handed bowlers
    const rightShoulder = landmarks[LANDMARK_INDICES.RIGHT_SHOULDER];
    const leftShoulder  = landmarks[LANDMARK_INDICES.LEFT_SHOULDER];
    const rightWrist    = landmarks[LANDMARK_INDICES.RIGHT_WRIST];
    const leftWrist     = landmarks[LANDMARK_INDICES.LEFT_WRIST];

    const rightShoulderRange = this.windowRange(this.rightShoulderWindow);
    const leftShoulderRange  = this.windowRange(this.leftShoulderWindow);
    const shoulderRange = Math.max(
      isFinite(rightShoulderRange) ? rightShoulderRange : 0,
      isFinite(leftShoulderRange)  ? leftShoulderRange  : 0
    );

    let armRaised = false;

    // Right side: wrist above right shoulder
    if (rightShoulder && rightWrist) {
      if (rightWrist.y < rightShoulder.y + CRICKET_WRIST_ABOVE_SHOULDER_MARGIN) {
        armRaised = true;
      }
    }
    // Left side: wrist above left shoulder
    if (!armRaised && leftShoulder && leftWrist) {
      if (leftWrist.y < leftShoulder.y + CRICKET_WRIST_ABOVE_SHOULDER_MARGIN) {
        armRaised = true;
      }
    }
    // Cross-check: either wrist above either shoulder
    if (!armRaised) {
      const anyShoulder = rightShoulder || leftShoulder;
      if (anyShoulder) {
        const shoulderY = anyShoulder.y + CRICKET_WRIST_ABOVE_SHOULDER_MARGIN;
        if ((rightWrist && rightWrist.y < shoulderY) || (leftWrist && leftWrist.y < shoulderY)) {
          armRaised = true;
        }
      }
    }

    const shoulderRotating = shoulderRange > 30;

    // Debug logging
    if (this._debugCounter % 30 === 0) {
      console.log(`[ActivityDetector] Cricket check — armRaised: ${armRaised}, shoulderRange: ${shoulderRange.toFixed(1)}°, shoulderRotating: ${shoulderRotating}, L-shoulder-window: ${this.leftShoulderWindow.length}, R-shoulder-window: ${this.rightShoulderWindow.length}`);
    }

    if (!armRaised && !shoulderRotating) {
      // Velocity fallback: if pose angles don't detect bowling but body is moving fast
      const avgVelocity = this.windowAvg(this.velocityWindow);
      const significantMovement = isFinite(avgVelocity) && avgVelocity > 0.008;

      if (significantMovement) {
        const frameScore = this.computeFrameScore(violations);
        this.totalScoredFrames++;
        if (frameScore >= 80) this.goodFrames++;
        return {
          status: 'performing',
          message: `Athletic movement detected — analyzing action (score: ${frameScore}/100)`,
          severity: 'info',
          frameQualityScore: frameScore,
        };
      }

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
   * Compute total body velocity from landmark displacement between frames.
   * Returns normalized velocity (0 = no movement, higher = faster movement).
   * Tracks key joints: shoulders, hips, knees, wrists.
   */
  private computeBodyVelocity(landmarks: Landmark[]): number {
    if (!this.prevLandmarks || this.prevLandmarks.length === 0) {
      return 0;
    }

    const trackedIndices = [
      LANDMARK_INDICES.LEFT_SHOULDER,
      LANDMARK_INDICES.RIGHT_SHOULDER,
      LANDMARK_INDICES.LEFT_HIP,
      LANDMARK_INDICES.RIGHT_HIP,
      LANDMARK_INDICES.LEFT_KNEE,
      LANDMARK_INDICES.RIGHT_KNEE,
      LANDMARK_INDICES.LEFT_WRIST,
      LANDMARK_INDICES.RIGHT_WRIST,
    ];

    let totalDisplacement = 0;
    let count = 0;

    for (const idx of trackedIndices) {
      const curr = landmarks[idx];
      const prev = this.prevLandmarks[idx];
      if (!curr || !prev) continue;
      if ((curr.visibility ?? 0) < 0.3 || (prev.visibility ?? 0) < 0.3) continue;

      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      totalDisplacement += Math.sqrt(dx * dx + dy * dy);
      count++;
    }

    return count > 0 ? totalDisplacement / count : 0;
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
