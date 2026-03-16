/**
 * ═══════════════════════════════════════════════════════════════════
 * DETECTION PIPELINE — Multi-Stage Human Detection & Pose Processing
 * ═══════════════════════════════════════════════════════════════════
 *
 * Implements the full production detection pipeline:
 *
 *   Camera Frame
 *     ↓
 *   1. Person Detector (COCO-SSD)
 *     ↓
 *   2. Select Primary Person
 *     ↓
 *   3. Distance Validation
 *     ↓
 *   4. Pose Estimation (MediaPipe)
 *     ↓
 *   5. Confidence Filtering
 *     ↓
 *   6. Temporal Smoothing (EMA on keypoints)
 *     ↓
 *   7. Pose Tracking (center-distance matching)
 *     ↓
 *   8. Stability Buffer (5 consecutive valid frames)
 *     ↓
 *   Skeleton Rendering + Biomechanics + Scoring
 *
 * This replaces ad-hoc checks scattered across components with a
 * single, deterministic pipeline.
 */

import { Landmark, PoseLandmarks } from '../ai/poseEstimator';
import { PersonDetector, PersonDetectionResult, DistanceStatus } from '../ai/personDetector';
import { LANDMARK_INDICES } from '../Biomechanics/angleCalculator';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type PipelineStatus =
  | 'no_human'           // COCO-SSD found no person
  | 'too_far'            // Person detected but too small
  | 'too_close'          // Person detected but too large
  | 'low_confidence'     // Pose keypoints below quality threshold
  | 'stabilizing'        // Pose valid but not stable long enough
  | 'ready'              // Pipeline fully validated — proceed with scoring
  | 'initializing';      // Models still loading

export interface PipelineResult {
  /** Current pipeline status */
  status: PipelineStatus;
  /** User-facing guidance message */
  message: string;
  /** Message severity for UI coloring */
  severity: 'info' | 'warning' | 'error';
  /** Smoothed landmarks (null if not ready) */
  landmarks: Landmark[] | null;
  /** Full PoseLandmarks with smoothed data (null if not ready) */
  poseLandmarks: PoseLandmarks | null;
  /** Should skeleton be drawn? */
  shouldDrawSkeleton: boolean;
  /** Should scoring/biomechanics proceed? */
  shouldScore: boolean;
  /** How many people are in frame */
  personCount: number;
  /** Distance status for UI feedback */
  distanceStatus: DistanceStatus;
  /** Frames until stability threshold (0 = stable) */
  stabilityFramesRemaining: number;
  /** Average keypoint confidence this frame */
  avgConfidence: number;
}

export interface PipelineConfig {
  /** Minimum visible keypoints for pose to be valid */
  minVisibleKeypoints: number;
  /** Minimum average confidence across keypoints */
  minAvgConfidence: number;
  /** Minimum torso (shoulder + hip) confidence */
  minTorsoConfidence: number;
  /** Confidence threshold to count a keypoint as "visible" */
  keypointVisibilityThreshold: number;
  /** EMA smoothing alpha (0-1, higher = more responsive) */
  smoothingAlpha: number;
  /** Consecutive valid frames needed before enabling skeleton */
  stabilityFrameCount: number;
  /** Max distance (normalized) between frame centers to be considered same person */
  trackingMaxDistance: number;
}

// ─────────────────────────────────────────────────────────────────
// Default Config
// ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: PipelineConfig = {
  minVisibleKeypoints: 6,
  minAvgConfidence: 0.4,
  minTorsoConfidence: 0.5,
  keypointVisibilityThreshold: 0.4,
  smoothingAlpha: 0.35,
  stabilityFrameCount: 3,
  trackingMaxDistance: 0.45,  // normalized coords — allow normal exercise movement
};

// Torso keypoint indices for torso confidence check
const TORSO_INDICES = [
  LANDMARK_INDICES.LEFT_SHOULDER,
  LANDMARK_INDICES.RIGHT_SHOULDER,
  LANDMARK_INDICES.LEFT_HIP,
  LANDMARK_INDICES.RIGHT_HIP,
];

// ─────────────────────────────────────────────────────────────────
// Detection Pipeline Class
// ─────────────────────────────────────────────────────────────────

export class DetectionPipeline {
  private config: PipelineConfig;
  private personDetector: PersonDetector;

  // Temporal smoothing state
  private previousLandmarks: Landmark[] | null = null;

  // Pose tracking state
  private previousCenter: { x: number; y: number } | null = null;

  // Stability buffer
  private consecutiveValidFrames = 0;
  private isStable = false;
  private consecutiveFailFrames = 0;  // count consecutive failures AFTER becoming stable
  /** How many consecutive failures an already-stable pipeline tolerates before losing stability */
  private static readonly STABLE_GRACE_FAILURES = 4;

  // Debug logging
  private _debugCounter = 0;

  constructor(config?: Partial<PipelineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.personDetector = new PersonDetector();
  }

  /**
   * Initialize the pipeline (loads COCO-SSD model).
   * Call once before using process().
   */
  async initialize(): Promise<void> {
    await this.personDetector.initialize();
    console.log('[DetectionPipeline] ✅ Pipeline initialized');
  }

  /** Check if pipeline is ready */
  get ready(): boolean {
    return this.personDetector.ready;
  }

  /** Get the PersonDetector instance (for direct access if needed) */
  getPersonDetector(): PersonDetector {
    return this.personDetector;
  }

  /**
   * Update pipeline configuration at runtime.
   */
  updateConfig(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * PROCESS — Run full pipeline on a frame
   * ═══════════════════════════════════════════════════════════════
   *
   * @param video         The video element (for COCO-SSD)
   * @param poseLandmarks Raw pose landmarks from MediaPipe (may be null)
   * @returns             PipelineResult with status, smoothed landmarks, and guidance
   */
  async process(
    video: HTMLVideoElement,
    poseLandmarks: PoseLandmarks | null
  ): Promise<PipelineResult> {
    this._debugCounter++;

    // ── STAGE 1 & 2: Person Detection + Primary Selection ────────
    const personResult = await this.personDetector.detect(video);

    if (!personResult.personDetected) {
      this.resetStability();
      this.previousLandmarks = null;
      this.previousCenter = null;
      return {
        status: 'no_human',
        message: 'No human detected — please step into frame.',
        severity: 'error',
        landmarks: null,
        poseLandmarks: null,
        shouldDrawSkeleton: false,
        shouldScore: false,
        personCount: 0,
        distanceStatus: 'ok',
        stabilityFramesRemaining: this.config.stabilityFrameCount,
        avgConfidence: 0,
      };
    }

    // ── STAGE 3: Distance Validation ─────────────────────────────
    if (personResult.distanceStatus !== 'ok') {
      this.resetStability();
      return {
        status: personResult.distanceStatus === 'too_far' ? 'too_far' : 'too_close',
        message: personResult.message || (
          personResult.distanceStatus === 'too_far'
            ? 'You are too far from the camera. Move closer.'
            : 'You are too close to the camera. Step back.'
        ),
        severity: 'warning',
        landmarks: null,
        poseLandmarks: null,
        shouldDrawSkeleton: false,
        shouldScore: false,
        personCount: personResult.personCount,
        distanceStatus: personResult.distanceStatus,
        stabilityFramesRemaining: this.config.stabilityFrameCount,
        avgConfidence: 0,
      };
    }

    // ── STAGE 4: Check pose landmarks exist ──────────────────────
    if (
      !poseLandmarks ||
      !poseLandmarks.landmarks ||
      poseLandmarks.landmarks.length === 0
    ) {
      // COCO-SSD sees a person but pose failed — transient
      this.decrementStability();
      return {
        status: 'low_confidence',
        message: 'Detecting pose — hold still...',
        severity: 'info',
        landmarks: null,
        poseLandmarks: null,
        shouldDrawSkeleton: false,
        shouldScore: false,
        personCount: personResult.personCount,
        distanceStatus: 'ok',
        stabilityFramesRemaining: Math.max(0, this.config.stabilityFrameCount - this.consecutiveValidFrames),
        avgConfidence: 0,
      };
    }

    const rawLandmarks = poseLandmarks.landmarks;

    // ── STAGE 5: Confidence Filtering ────────────────────────────
    const confidenceResult = this.validateConfidence(rawLandmarks);

    if (!confidenceResult.valid) {
      this.decrementStability();
      return {
        status: 'low_confidence',
        message: confidenceResult.message,
        severity: 'warning',
        landmarks: null,
        poseLandmarks: null,
        shouldDrawSkeleton: false,
        shouldScore: false,
        personCount: personResult.personCount,
        distanceStatus: 'ok',
        stabilityFramesRemaining: Math.max(0, this.config.stabilityFrameCount - this.consecutiveValidFrames),
        avgConfidence: confidenceResult.avgConfidence,
      };
    }

    // ── STAGE 6: Temporal Smoothing (EMA) ────────────────────────
    const smoothedLandmarks = this.applyTemporalSmoothing(rawLandmarks);

    // ── STAGE 7: Pose Tracking ───────────────────────────────────
    const tracked = this.trackPose(smoothedLandmarks);
    if (!tracked) {
      // Pose center jumped — if we're already stable, tolerate a few misses
      // (normal exercise movement can cause center jumps)
      this.decrementStability();
      if (this.isStable) {
        // Still stable (grace period) — show skeleton but skip scoring
        return {
          status: 'ready',
          message: '',
          severity: 'info',
          landmarks: smoothedLandmarks,
          poseLandmarks: { ...poseLandmarks, landmarks: smoothedLandmarks },
          shouldDrawSkeleton: true,
          shouldScore: false,  // skip scoring on tracking miss
          personCount: personResult.personCount,
          distanceStatus: 'ok',
          stabilityFramesRemaining: 0,
          avgConfidence: confidenceResult.avgConfidence,
        };
      }
      return {
        status: 'low_confidence',
        message: 'Pose tracking lost — hold position.',
        severity: 'warning',
        landmarks: null,
        poseLandmarks: null,
        shouldDrawSkeleton: false,
        shouldScore: false,
        personCount: personResult.personCount,
        distanceStatus: 'ok',
        stabilityFramesRemaining: Math.max(0, this.config.stabilityFrameCount - this.consecutiveValidFrames),
        avgConfidence: confidenceResult.avgConfidence,
      };
    }

    // ── STAGE 8: Stability Buffer ────────────────────────────────
    this.consecutiveValidFrames++;
    this.consecutiveFailFrames = 0;  // good frame resets fail counter
    const framesRemaining = Math.max(0, this.config.stabilityFrameCount - this.consecutiveValidFrames);

    if (this.consecutiveValidFrames >= this.config.stabilityFrameCount) {
      this.isStable = true;
    }

    if (!this.isStable) {
      return {
        status: 'stabilizing',
        message: `Stabilizing pose detection... (${framesRemaining} frames)`,
        severity: 'info',
        landmarks: smoothedLandmarks,
        poseLandmarks: { ...poseLandmarks, landmarks: smoothedLandmarks },
        shouldDrawSkeleton: false,  // Don't draw until stable
        shouldScore: false,
        personCount: personResult.personCount,
        distanceStatus: 'ok',
        stabilityFramesRemaining: framesRemaining,
        avgConfidence: confidenceResult.avgConfidence,
      };
    }

    // ── ALL STAGES PASSED — Ready for scoring ────────────────────
    const smoothedPoseLandmarks: PoseLandmarks = {
      ...poseLandmarks,
      landmarks: smoothedLandmarks,
    };

    // Debug logging
    if (this._debugCounter % 60 === 0) {
      console.log(
        `[DetectionPipeline] ✅ READY — persons: ${personResult.personCount}, ` +
        `avgConf: ${confidenceResult.avgConfidence.toFixed(2)}, ` +
        `stable: ${this.consecutiveValidFrames} frames`
      );
    }

    return {
      status: 'ready',
      message: '',
      severity: 'info',
      landmarks: smoothedLandmarks,
      poseLandmarks: smoothedPoseLandmarks,
      shouldDrawSkeleton: true,
      shouldScore: true,
      personCount: personResult.personCount,
      distanceStatus: 'ok',
      stabilityFramesRemaining: 0,
      avgConfidence: confidenceResult.avgConfidence,
    };
  }

  /**
   * Fast synchronous process for when COCO-SSD detection is cached.
   * Use this when you already have fresh person detection results
   * and just need to run stages 4-8 on new pose data.
   */
  processSync(
    poseLandmarks: PoseLandmarks | null,
    cachedPersonResult?: PersonDetectionResult
  ): PipelineResult {
    this._debugCounter++;
    const personResult = cachedPersonResult || this.personDetector.getLastResult();

    if (!personResult.personDetected) {
      this.resetStability();
      this.previousLandmarks = null;
      this.previousCenter = null;
      return {
        status: 'no_human',
        message: 'No human detected — please step into frame.',
        severity: 'error',
        landmarks: null,
        poseLandmarks: null,
        shouldDrawSkeleton: false,
        shouldScore: false,
        personCount: 0,
        distanceStatus: 'ok',
        stabilityFramesRemaining: this.config.stabilityFrameCount,
        avgConfidence: 0,
      };
    }

    if (personResult.distanceStatus !== 'ok') {
      this.resetStability();
      return {
        status: personResult.distanceStatus === 'too_far' ? 'too_far' : 'too_close',
        message: personResult.message || 'Adjust your distance from camera.',
        severity: 'warning',
        landmarks: null,
        poseLandmarks: null,
        shouldDrawSkeleton: false,
        shouldScore: false,
        personCount: personResult.personCount,
        distanceStatus: personResult.distanceStatus,
        stabilityFramesRemaining: this.config.stabilityFrameCount,
        avgConfidence: 0,
      };
    }

    if (!poseLandmarks?.landmarks?.length) {
      this.decrementStability();
      return {
        status: 'low_confidence',
        message: 'Detecting pose — hold still...',
        severity: 'info',
        landmarks: null,
        poseLandmarks: null,
        shouldDrawSkeleton: false,
        shouldScore: false,
        personCount: personResult.personCount,
        distanceStatus: 'ok',
        stabilityFramesRemaining: Math.max(0, this.config.stabilityFrameCount - this.consecutiveValidFrames),
        avgConfidence: 0,
      };
    }

    const rawLandmarks = poseLandmarks.landmarks;
    const confidenceResult = this.validateConfidence(rawLandmarks);

    if (!confidenceResult.valid) {
      this.decrementStability();
      return {
        status: 'low_confidence',
        message: confidenceResult.message,
        severity: 'warning',
        landmarks: null,
        poseLandmarks: null,
        shouldDrawSkeleton: false,
        shouldScore: false,
        personCount: personResult.personCount,
        distanceStatus: 'ok',
        stabilityFramesRemaining: Math.max(0, this.config.stabilityFrameCount - this.consecutiveValidFrames),
        avgConfidence: confidenceResult.avgConfidence,
      };
    }

    const smoothedLandmarks = this.applyTemporalSmoothing(rawLandmarks);
    const tracked = this.trackPose(smoothedLandmarks);

    if (!tracked) {
      this.decrementStability();
      if (this.isStable) {
        const smoothedPose: PoseLandmarks = { ...poseLandmarks, landmarks: smoothedLandmarks };
        return {
          status: 'ready',
          message: '',
          severity: 'info',
          landmarks: smoothedLandmarks,
          poseLandmarks: smoothedPose,
          shouldDrawSkeleton: true,
          shouldScore: false,
          personCount: personResult.personCount,
          distanceStatus: 'ok',
          stabilityFramesRemaining: 0,
          avgConfidence: confidenceResult.avgConfidence,
        };
      }
      return {
        status: 'low_confidence',
        message: 'Pose tracking lost — hold position.',
        severity: 'warning',
        landmarks: null,
        poseLandmarks: null,
        shouldDrawSkeleton: false,
        shouldScore: false,
        personCount: personResult.personCount,
        distanceStatus: 'ok',
        stabilityFramesRemaining: Math.max(0, this.config.stabilityFrameCount - this.consecutiveValidFrames),
        avgConfidence: confidenceResult.avgConfidence,
      };
    }

    this.consecutiveValidFrames++;
    this.consecutiveFailFrames = 0;  // good frame resets fail counter
    const framesRemaining = Math.max(0, this.config.stabilityFrameCount - this.consecutiveValidFrames);

    if (this.consecutiveValidFrames >= this.config.stabilityFrameCount) {
      this.isStable = true;
    }

    const smoothedPose: PoseLandmarks = { ...poseLandmarks, landmarks: smoothedLandmarks };

    if (!this.isStable) {
      return {
        status: 'stabilizing',
        message: `Stabilizing pose detection... (${framesRemaining} frames)`,
        severity: 'info',
        landmarks: smoothedLandmarks,
        poseLandmarks: smoothedPose,
        shouldDrawSkeleton: false,
        shouldScore: false,
        personCount: personResult.personCount,
        distanceStatus: 'ok',
        stabilityFramesRemaining: framesRemaining,
        avgConfidence: confidenceResult.avgConfidence,
      };
    }

    return {
      status: 'ready',
      message: '',
      severity: 'info',
      landmarks: smoothedLandmarks,
      poseLandmarks: smoothedPose,
      shouldDrawSkeleton: true,
      shouldScore: true,
      personCount: personResult.personCount,
      distanceStatus: 'ok',
      stabilityFramesRemaining: 0,
      avgConfidence: confidenceResult.avgConfidence,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 5: Confidence Filtering
  // ─────────────────────────────────────────────────────────────

  private validateConfidence(landmarks: Landmark[]): {
    valid: boolean;
    message: string;
    avgConfidence: number;
    visibleCount: number;
  } {
    const threshold = this.config.keypointVisibilityThreshold;

    // Count visible keypoints
    let visibleCount = 0;
    let totalConfidence = 0;
    for (const lm of landmarks) {
      const vis = lm.visibility ?? 0;
      totalConfidence += vis;
      if (vis >= threshold) visibleCount++;
    }
    const avgConfidence = landmarks.length > 0 ? totalConfidence / landmarks.length : 0;

    // Check minimum visible keypoints
    if (visibleCount < this.config.minVisibleKeypoints) {
      return {
        valid: false,
        message: `Pose not detected clearly. Only ${visibleCount} keypoints visible (need ${this.config.minVisibleKeypoints}).`,
        avgConfidence,
        visibleCount,
      };
    }

    // Check average confidence
    if (avgConfidence < this.config.minAvgConfidence) {
      return {
        valid: false,
        message: `Pose confidence too low (${(avgConfidence * 100).toFixed(0)}%). Face the camera and ensure good lighting.`,
        avgConfidence,
        visibleCount,
      };
    }

    // Check torso confidence
    let torsoConfidenceSum = 0;
    let torsoCount = 0;
    for (const idx of TORSO_INDICES) {
      if (idx < landmarks.length && landmarks[idx]) {
        torsoConfidenceSum += landmarks[idx].visibility ?? 0;
        torsoCount++;
      }
    }
    const torsoConfidence = torsoCount > 0 ? torsoConfidenceSum / torsoCount : 0;

    if (torsoConfidence < this.config.minTorsoConfidence) {
      return {
        valid: false,
        message: `Torso not clearly visible (${(torsoConfidence * 100).toFixed(0)}%). Face the camera directly.`,
        avgConfidence,
        visibleCount,
      };
    }

    return { valid: true, message: '', avgConfidence, visibleCount };
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 6: Temporal Smoothing (EMA)
  // ─────────────────────────────────────────────────────────────

  private applyTemporalSmoothing(currentLandmarks: Landmark[]): Landmark[] {
    const alpha = this.config.smoothingAlpha;

    if (!this.previousLandmarks || this.previousLandmarks.length !== currentLandmarks.length) {
      // First valid frame — store and return as-is
      this.previousLandmarks = currentLandmarks.map(lm => ({ ...lm }));
      return currentLandmarks;
    }

    const smoothed: Landmark[] = currentLandmarks.map((curr, i) => {
      const prev = this.previousLandmarks![i];
      if (!prev) return curr;

      return {
        x: alpha * curr.x + (1 - alpha) * prev.x,
        y: alpha * curr.y + (1 - alpha) * prev.y,
        z: alpha * (curr.z ?? 0) + (1 - alpha) * (prev.z ?? 0),
        visibility: alpha * (curr.visibility ?? 0) + (1 - alpha) * (prev.visibility ?? 0),
      };
    });

    // Store for next frame
    this.previousLandmarks = smoothed.map(lm => ({ ...lm }));

    return smoothed;
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 7: Pose Tracking (center-distance matching)
  // ─────────────────────────────────────────────────────────────

  private trackPose(landmarks: Landmark[]): boolean {
    // Compute pose center from shoulders + hips
    const center = this.computePoseCenter(landmarks);
    if (!center) {
      return true; // Can't compute center — allow through
    }

    if (!this.previousCenter) {
      // First frame center
      this.previousCenter = center;
      return true;
    }

    // Calculate distance between current and previous center
    const dist = Math.sqrt(
      (center.x - this.previousCenter.x) ** 2 +
      (center.y - this.previousCenter.y) ** 2
    );

    // Update previous center (use smoothed approach)
    this.previousCenter = {
      x: 0.5 * center.x + 0.5 * this.previousCenter.x,
      y: 0.5 * center.y + 0.5 * this.previousCenter.y,
    };

    // If pose jumped too far, likely switched to different person
    if (dist > this.config.trackingMaxDistance) {
      if (this._debugCounter % 10 === 0) {
        console.warn(
          `[DetectionPipeline] Pose jumped ${dist.toFixed(3)} (max ${this.config.trackingMaxDistance}) — tracking lost`
        );
      }
      return false;
    }

    return true;
  }

  private computePoseCenter(landmarks: Landmark[]): { x: number; y: number } | null {
    const indices = [
      LANDMARK_INDICES.LEFT_SHOULDER,
      LANDMARK_INDICES.RIGHT_SHOULDER,
      LANDMARK_INDICES.LEFT_HIP,
      LANDMARK_INDICES.RIGHT_HIP,
    ];

    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (const idx of indices) {
      if (idx < landmarks.length && landmarks[idx]) {
        const vis = landmarks[idx].visibility ?? 0;
        if (vis >= 0.3) {
          sumX += landmarks[idx].x;
          sumY += landmarks[idx].y;
          count++;
        }
      }
    }

    if (count < 2) return null;
    return { x: sumX / count, y: sumY / count };
  }

  // ─────────────────────────────────────────────────────────────
  // Stability helpers
  // ─────────────────────────────────────────────────────────────

  private resetStability(): void {
    this.consecutiveValidFrames = 0;
    this.consecutiveFailFrames = 0;
    this.isStable = false;
  }

  private decrementStability(): void {
    // If we're already stable, use a grace period — don't drop stability on
    // individual bad frames (movement, partial occlusion, etc.)
    if (this.isStable) {
      this.consecutiveFailFrames++;
      if (this.consecutiveFailFrames >= DetectionPipeline.STABLE_GRACE_FAILURES) {
        // Too many consecutive failures — actually lost the person
        this.isStable = false;
        this.consecutiveValidFrames = 0;
        this.consecutiveFailFrames = 0;
      }
      return;
    }
    // Not yet stable — decrement by 1 (was 2, which was too aggressive)
    this.consecutiveValidFrames = Math.max(0, this.consecutiveValidFrames - 1);
  }

  /**
   * Full reset (call on session start/stop or camera change).
   */
  reset(): void {
    this.previousLandmarks = null;
    this.previousCenter = null;
    this.consecutiveValidFrames = 0;
    this.consecutiveFailFrames = 0;
    this.isStable = false;
    this._debugCounter = 0;
    this.personDetector.reset();
    console.log('[DetectionPipeline] Reset');
  }

  /**
   * Dispose all resources (call on component unmount).
   */
  dispose(): void {
    this.personDetector.dispose();
    this.reset();
    console.log('[DetectionPipeline] Disposed');
  }
}
