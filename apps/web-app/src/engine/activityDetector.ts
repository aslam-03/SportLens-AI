/**
 * ═══════════════════════════════════════════════════════════════════
 * ACTIVITY DETECTOR — Production-Grade Action Recognition & Scoring
 * ═══════════════════════════════════════════════════════════════════
 *
 * Determines:
 *   1. Is a human present in the frame? (strict visibility check)
 *   2. Is the person performing the selected activity?
 *   3. What is the per-frame quality score (0-100)?
 *
 * Scoring Model (replaces the old "100 unless violation" system):
 *
 *   Frame Score = weighted combination of:
 *     - Form Quality (50%): how close angles are to ideal ranges
 *     - Stability    (20%): smoothness of movement (low jitter)
 *     - Violations   (30%): penalty from rule engine violations
 *
 * Activity Heuristics:
 *   Fitness/Squat:
 *     Performing → min knee angle in window < 140° (bending)
 *     Idle       → both knees > 158° (standing straight)
 *
 *   Cricket/Bowling:
 *     Performing → wrist above shoulder OR shoulder range > 30°
 *     Idle       → standing neutral with no arm raise
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

// ─── Ideal angle ranges for scoring ─────────────────────────────
// Squat ideal ranges (degrees)
const SQUAT_KNEE_IDEAL   = { min: 75,  max: 100,  perfect: 90 };
const SQUAT_HIP_IDEAL    = { min: 70,  max: 120,  perfect: 95 };
const SQUAT_BACK_IDEAL   = { min: 50,  max: 90,   perfect: 70 };

// Bowling ideal ranges (degrees)
const BOWL_ELBOW_IDEAL     = { min: 160, max: 180, perfect: 175 };
const BOWL_SHOULDER_IDEAL  = { min: 140, max: 180, perfect: 165 };

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
  private totalScore         = 0;

  // Stability tracking — measures jitter in angles
  private prevFrame: BiomechanicsFrame | null = null;
  private jitterWindow: number[] = [];
  private readonly JITTER_WINDOW_SIZE = 10;

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
    this.totalScore          = 0;
    this._debugCounter       = 0;
    this.prevLandmarks       = null;
    this.velocityWindow      = [];
    this.prevFrame           = null;
    this.jitterWindow        = [];
  }

  /** Compute overall session performance score (0-100) */
  getSessionScore(): number {
    if (this.totalScoredFrames === 0) return 0; // no data = 0, not 100
    return Math.round(this.totalScore / this.totalScoredFrames);
  }

  /** Total frames analysed for scoring */
  getScoredFrameCount(): number {
    return this.totalScoredFrames;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * MAIN EVALUATION
   * ═══════════════════════════════════════════════════════════════
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
      return this.evaluateSquat(frame, violations, velocity);
    } else {
      return this.evaluateCricketBowling(frame, landmarks, violations, velocity);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Private — Squat Detection
  // ─────────────────────────────────────────────────────────────

  private evaluateSquat(
    frame: BiomechanicsFrame | null,
    violations: RuleViolation[],
    velocity: number
  ): ActivityDetectionResult {
    // ── Use whichever knee side has data ──
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
      const hasHipData = this.leftShoulderWindow.length > 0 || this.rightShoulderWindow.length > 0;
      if (hasHipData) {
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

    // Safety check
    if (!isFinite(minKnee) || !isFinite(avgKnee)) {
      return {
        status: 'idle',
        message: 'Position yourself so your full body is visible. Begin squatting.',
        severity: 'info',
        frameQualityScore: 0,
      };
    }

    // Debug logging (every ~30 frames)
    if (this._debugCounter++ % 30 === 0) {
      console.log(`[ActivityDetector] Squat check — minKnee: ${minKnee.toFixed(1)}°, avgKnee: ${avgKnee.toFixed(1)}°, L-window: ${this.leftKneeWindow.length}, R-window: ${this.rightKneeWindow.length}`);
    }

    const isSquatting = minKnee < SQUAT_ACTIVE_KNEE_THRESHOLD;
    const isIdle      = avgKnee > SQUAT_IDLE_KNEE_THRESHOLD;

    // Velocity fallback
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
      const transitionScore = this.computeContinuousFrameScore('fitness', frame, violations);
      this.totalScoredFrames++;
      this.totalScore += transitionScore;
      return {
        status: 'performing',
        message: `Movement detected — bend deeper for better score (${transitionScore}/100)`,
        severity: 'info',
        frameQualityScore: transitionScore,
      };
    }

    // Person is performing a squat or transitioning
    const frameScore = this.computeContinuousFrameScore('fitness', frame, violations);
    this.totalScoredFrames++;
    this.totalScore += frameScore;

    const errorViolations   = violations.filter(v => v.severity === 'error').length;
    const warningViolations = violations.filter(v => v.severity === 'warning').length;

    if (errorViolations > 0) {
      return {
        status: 'performing',
        message: `Fix critical form errors (score: ${frameScore}/100)`,
        severity: 'error',
        frameQualityScore: frameScore,
      };
    }

    if (warningViolations > 0) {
      return {
        status: 'performing',
        message: `Improve your form (score: ${frameScore}/100)`,
        severity: 'warning',
        frameQualityScore: frameScore,
      };
    }

    // Classify score into feedback tiers
    if (frameScore >= 85) {
      return {
        status: 'performing',
        message: `Excellent form! (score: ${frameScore}/100)`,
        severity: 'info',
        frameQualityScore: frameScore,
      };
    }

    if (frameScore >= 65) {
      return {
        status: 'performing',
        message: `Good form — keep it up! (score: ${frameScore}/100)`,
        severity: 'info',
        frameQualityScore: frameScore,
      };
    }

    return {
      status: 'performing',
      message: `Working on form (score: ${frameScore}/100)`,
      severity: 'warning',
      frameQualityScore: frameScore,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Private — Cricket Bowling Detection
  // ─────────────────────────────────────────────────────────────

  private evaluateCricketBowling(
    frame: BiomechanicsFrame | null,
    landmarks: Landmark[],
    violations: RuleViolation[],
    velocity: number
  ): ActivityDetectionResult {
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

    if (rightShoulder && rightWrist) {
      if (rightWrist.y < rightShoulder.y + CRICKET_WRIST_ABOVE_SHOULDER_MARGIN) {
        armRaised = true;
      }
    }
    if (!armRaised && leftShoulder && leftWrist) {
      if (leftWrist.y < leftShoulder.y + CRICKET_WRIST_ABOVE_SHOULDER_MARGIN) {
        armRaised = true;
      }
    }
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

    if (this._debugCounter % 30 === 0) {
      console.log(`[ActivityDetector] Cricket check — armRaised: ${armRaised}, shoulderRange: ${shoulderRange.toFixed(1)}°, shoulderRotating: ${shoulderRotating}`);
    }

    if (!armRaised && !shoulderRotating) {
      const avgVelocity = this.windowAvg(this.velocityWindow);
      const significantMovement = isFinite(avgVelocity) && avgVelocity > 0.008;

      if (significantMovement) {
        const frameScore = this.computeContinuousFrameScore('cricket', frame, violations);
        this.totalScoredFrames++;
        this.totalScore += frameScore;
        return {
          status: 'performing',
          message: `Athletic movement detected (score: ${frameScore}/100)`,
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

    const frameScore = this.computeContinuousFrameScore('cricket', frame, violations);
    this.totalScoredFrames++;
    this.totalScore += frameScore;

    const errorViolations = violations.filter(v => v.severity === 'error').length;

    if (errorViolations > 0) {
      return {
        status: 'performing',
        message: `Fix illegal action (score: ${frameScore}/100)`,
        severity: 'error',
        frameQualityScore: frameScore,
      };
    }

    if (frameScore >= 85) {
      return {
        status: 'performing',
        message: `Excellent bowling form! (score: ${frameScore}/100)`,
        severity: 'info',
        frameQualityScore: frameScore,
      };
    }

    return {
      status: 'performing',
      message: `Bowling action in progress (score: ${frameScore}/100)`,
      severity: violations.length > 0 ? 'warning' : 'info',
      frameQualityScore: frameScore,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Private — Helpers
  // ─────────────────────────────────────────────────────────────

  /**
   * Strict human-presence gate — prevents skeletons on non-human objects.
   */
  private isHumanPresent(landmarks: Landmark[]): boolean {
    const VIS_THRESHOLD = 0.35;

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

    let visibleCount = 0;
    let visibilitySum = 0;
    for (const idx of criticalIndices) {
      const vis = idx < landmarks.length ? (landmarks[idx]?.visibility ?? 0) : 0;
      visibilitySum += vis;
      if (vis >= VIS_THRESHOLD) visibleCount++;
    }
    if (visibleCount < 4) return false;

    const lShoulderVis = (landmarks[LANDMARK_INDICES.LEFT_SHOULDER]?.visibility ?? 0);
    const rShoulderVis = (landmarks[LANDMARK_INDICES.RIGHT_SHOULDER]?.visibility ?? 0);
    if (lShoulderVis < VIS_THRESHOLD && rShoulderVis < VIS_THRESHOLD) return false;

    const lHipVis = (landmarks[LANDMARK_INDICES.LEFT_HIP]?.visibility ?? 0);
    const rHipVis = (landmarks[LANDMARK_INDICES.RIGHT_HIP]?.visibility ?? 0);
    if (lHipVis < VIS_THRESHOLD && rHipVis < VIS_THRESHOLD) return false;

    const meanVis = visibilitySum / criticalIndices.length;
    if (meanVis < 0.30) return false;

    // Torso geometry — shoulders should be ABOVE hips
    const lShoulder = landmarks[LANDMARK_INDICES.LEFT_SHOULDER];
    const rShoulder = landmarks[LANDMARK_INDICES.RIGHT_SHOULDER];
    const lHip = landmarks[LANDMARK_INDICES.LEFT_HIP];
    const rHip = landmarks[LANDMARK_INDICES.RIGHT_HIP];

    const haveBothSides = (lShoulderVis >= VIS_THRESHOLD || rShoulderVis >= VIS_THRESHOLD)
                       && (lHipVis >= VIS_THRESHOLD || rHipVis >= VIS_THRESHOLD);
    if (haveBothSides) {
      const shoulders = [lShoulder, rShoulder].filter((s, i) => s && [lShoulderVis, rShoulderVis][i] >= VIS_THRESHOLD);
      const hips = [lHip, rHip].filter((h, i) => h && [lHipVis, rHipVis][i] >= VIS_THRESHOLD);
      if (shoulders.length > 0 && hips.length > 0) {
        const avgShoulderY = shoulders.reduce((s, lm) => s + lm!.y, 0) / shoulders.length;
        const avgHipY = hips.reduce((s, lm) => s + lm!.y, 0) / hips.length;
        if (avgShoulderY > avgHipY + 0.02) return false;
      }
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

  /** Minimum value in window */
  private windowMin(window: number[]): number {
    return window.length > 0 ? Math.min(...window) : Infinity;
  }

  /** Average value in window */
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

  // ═══════════════════════════════════════════════════════════════
  // PRODUCTION-GRADE CONTINUOUS FRAME SCORING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Compute a continuous 0-100 frame quality score based on:
   *   - Form Quality (50%): how close angles are to ideal ranges
   *   - Stability    (20%): how smooth/steady the movement is
   *   - Violations   (30%): penalty from rule engine violations
   *
   * This replaces the old "100 unless violation" approach.
   */
  private computeContinuousFrameScore(
    activity: 'fitness' | 'cricket',
    frame: BiomechanicsFrame | null,
    violations: RuleViolation[]
  ): number {
    // ── 1. Form Quality Score (0-100) ────────────────────────────
    const formScore = activity === 'fitness'
      ? this.computeSquatFormScore(frame)
      : this.computeBowlingFormScore(frame);

    // ── 2. Stability Score (0-100) ───────────────────────────────
    const stabilityScore = this.computeStabilityScore(frame);

    // ── 3. Violation Penalty (0-100, 100 = no violations) ────────
    const violationScore = this.computeViolationScore(violations);

    // ── Weighted combination ─────────────────────────────────────
    const combined = (formScore * 0.50) + (stabilityScore * 0.20) + (violationScore * 0.30);

    // Store previous frame for next stability check
    if (frame) {
      this.prevFrame = { ...frame };
    }

    const finalScore = Math.round(Math.max(0, Math.min(100, combined)));

    // Debug logging
    if (this._debugCounter % 30 === 0) {
      console.log(`[ActivityDetector] Score breakdown — form: ${formScore.toFixed(0)}, stability: ${stabilityScore.toFixed(0)}, violations: ${violationScore.toFixed(0)} → ${finalScore}`);
    }

    return finalScore;
  }

  /**
   * Score how close squat form is to ideal angles.
   * Uses a bell-curve-like scoring around ideal ranges.
   */
  private computeSquatFormScore(frame: BiomechanicsFrame | null): number {
    if (!frame) return 30; // no data = low score, not 100

    const scores: number[] = [];

    // Knee angle score
    const kneeAngle = frame.leftKneeAngle ?? frame.rightKneeAngle;
    if (kneeAngle !== null && isFinite(kneeAngle)) {
      scores.push(this.angleToScore(kneeAngle, SQUAT_KNEE_IDEAL));
    }

    // Hip angle score
    const hipAngle = frame.leftHipAngle ?? frame.rightHipAngle;
    if (hipAngle !== null && isFinite(hipAngle)) {
      scores.push(this.angleToScore(hipAngle, SQUAT_HIP_IDEAL));
    }

    // Back angle score (shoulder angle indicates torso position)
    const backAngle = frame.leftShoulderAngle ?? frame.rightShoulderAngle;
    if (backAngle !== null && isFinite(backAngle)) {
      scores.push(this.angleToScore(backAngle, SQUAT_BACK_IDEAL));
    }

    if (scores.length === 0) return 30;

    // Weighted average: knee is most important for squats
    if (scores.length >= 3) {
      return scores[0] * 0.5 + scores[1] * 0.3 + scores[2] * 0.2;
    }
    if (scores.length === 2) {
      return scores[0] * 0.6 + scores[1] * 0.4;
    }
    return scores[0];
  }

  /**
   * Score how close bowling form is to ideal angles.
   */
  private computeBowlingFormScore(frame: BiomechanicsFrame | null): number {
    if (!frame) return 30;

    const scores: number[] = [];

    // Elbow angle (straight arm is ideal for bowling)
    const elbowAngle = frame.leftElbowAngle ?? frame.rightElbowAngle;
    if (elbowAngle !== null && isFinite(elbowAngle)) {
      scores.push(this.angleToScore(elbowAngle, BOWL_ELBOW_IDEAL));
    }

    // Shoulder angle
    const shoulderAngle = frame.leftShoulderAngle ?? frame.rightShoulderAngle;
    if (shoulderAngle !== null && isFinite(shoulderAngle)) {
      scores.push(this.angleToScore(shoulderAngle, BOWL_SHOULDER_IDEAL));
    }

    if (scores.length === 0) return 30;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  /**
   * Convert an angle measurement to a 0-100 score based on how close
   * it is to an ideal range. Uses a smooth bell-curve-like function.
   *
   *   100 |    ┌──────┐
   *    80 |   ╱        ╲
   *    60 |  ╱          ╲
   *    40 | ╱            ╲
   *    20 |╱              ╲
   *     0 |________________
   *       far  ideal  far
   */
  private angleToScore(
    angle: number,
    ideal: { min: number; max: number; perfect: number }
  ): number {
    // Inside ideal range = score 80-100
    if (angle >= ideal.min && angle <= ideal.max) {
      // How close to the perfect center? Closer = higher
      const distFromPerfect = Math.abs(angle - ideal.perfect);
      const rangeHalf = (ideal.max - ideal.min) / 2;
      const centralScore = rangeHalf > 0
        ? Math.max(0, 1 - (distFromPerfect / rangeHalf))
        : 1;
      return 80 + centralScore * 20; // 80-100
    }

    // Outside ideal range — score drops sharply with distance
    const distFromIdeal = angle < ideal.min
      ? ideal.min - angle
      : angle - ideal.max;

    // Start dropping from 70 to create a clear gap between "in range" and "out of range"
    // Every 5° outside ideal loses ~15 points instead of 10° losing 15 points
    const penalty = Math.min(70, Math.floor(distFromIdeal / 5) * 15);
    return Math.max(0, 70 - penalty);
  }

  /**
   * Measure movement stability. Smooth, controlled movement scores high.
   * Jerky, inconsistent movement scores low.
   */
  private computeStabilityScore(frame: BiomechanicsFrame | null): number {
    if (!frame || !this.prevFrame) return 70; // neutral when no history

    // Compute angle jitter (sum of absolute changes)
    let jitter = 0;
    let count = 0;

    const pairs: Array<[keyof BiomechanicsFrame, keyof BiomechanicsFrame]> = [
      ['leftKneeAngle', 'leftKneeAngle'],
      ['rightKneeAngle', 'rightKneeAngle'],
      ['leftHipAngle', 'leftHipAngle'],
      ['rightHipAngle', 'rightHipAngle'],
      ['leftShoulderAngle', 'leftShoulderAngle'],
      ['rightShoulderAngle', 'rightShoulderAngle'],
    ];

    for (const [currKey, prevKey] of pairs) {
      const currVal = frame[currKey as keyof BiomechanicsFrame];
      const prevVal = this.prevFrame[prevKey as keyof BiomechanicsFrame];
      if (
        typeof currVal === 'number' && typeof prevVal === 'number' &&
        isFinite(currVal) && isFinite(prevVal)
      ) {
        jitter += Math.abs(currVal - prevVal);
        count++;
      }
    }

    if (count === 0) return 70;

    const avgJitter = jitter / count;
    this.jitterWindow.push(avgJitter);
    if (this.jitterWindow.length > this.JITTER_WINDOW_SIZE) {
      this.jitterWindow.shift();
    }

    // Average jitter over the window
    const smoothedJitter = this.jitterWindow.reduce((a, b) => a + b, 0) / this.jitterWindow.length;

    // < 2° of jitter = smooth, 100
    // 2-5° = good, 80-100
    // 5-10° = ok, 50-80
    // > 10° = jerky, <50
    if (smoothedJitter < 2) return 100;
    if (smoothedJitter < 5) return 80;
    if (smoothedJitter < 10) return 50;
    return Math.max(0, 30 - (smoothedJitter - 10) * 3);
  }

  /**
   * Score based on rule violations.
   *   - No violations        → 100
   *   - Info violations      → 85
   *   - Warning violations   → 55-70
   *   - Error violations     → 10-30
   */
  private computeViolationScore(violations: RuleViolation[]): number {
    const errors   = violations.filter(v => v.severity === 'error').length;
    const warnings = violations.filter(v => v.severity === 'warning').length;
    const infos    = violations.filter(v => v.severity === 'info').length;

    if (errors > 0)   return 0;        // Strict penalty for errors
    if (warnings > 0) return Math.max(0, 40 - warnings * 10); // Severe penalty for bad form
    if (infos > 0)    return 70;
    return 100;
  }
}
