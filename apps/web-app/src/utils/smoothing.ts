import { Landmark, PoseLandmarks } from '../ai/poseEstimator';

/**
 * Smoothing configuration
 */
export interface SmoothingConfig {
  /**
   * Exponential moving average factor (0-1)
   * Higher = more responsive but jerkier
   * Lower = smoother but more lag
   * Default: 0.3 (good balance)
   */
  alpha?: number;

  /**
   * Minimum visibility threshold to use landmark (0-1)
   * Landmarks below this are ignored
   * Default: 0.3
   */
  visibilityThreshold?: number;

  /**
   * Whether to apply smoothing (useful for toggling)
   * Default: true
   */
  enabled?: boolean;
}

/**
 * History storage for EMA smoothing
 * Keyed by landmark index
 */
class LandmarkHistory {
  private history: Map<number, Landmark> = new Map();

  /**
   * Get smoothed landmark using exponential moving average
   * @param index - Landmark index
   * @param current - Current landmark
   * @param alpha - EMA factor (0-1)
   * @param visibilityThreshold - Min visibility to use
   * @returns Smoothed landmark
   */
  smoothLandmark(
    index: number,
    current: Landmark,
    alpha: number,
    visibilityThreshold: number
  ): Landmark {
    // Check if current landmark is visible
    const isCurrentVisible = (current.visibility ?? 0) >= visibilityThreshold;

    if (!isCurrentVisible) {
      // If not visible, return as-is but mark visibility as low
      return {
        ...current,
        visibility: 0,
      };
    }

    const previous = this.history.get(index);

    // First frame or no history
    if (!previous) {
      this.history.set(index, { ...current });
      return current;
    }

    // Apply exponential moving average (EMA)
    // new_value = alpha * current + (1 - alpha) * previous
    const smoothed: Landmark = {
      x: alpha * current.x + (1 - alpha) * previous.x,
      y: alpha * current.y + (1 - alpha) * previous.y,
      z: alpha * (current.z ?? 0) + (1 - alpha) * (previous.z ?? 0),
      visibility: current.visibility,
    };

    // Update history
    this.history.set(index, smoothed);

    return smoothed;
  }

  /**
   * Clear history (useful when camera restarts)
   */
  clear(): void {
    this.history.clear();
  }

  /**
   * Get size of history
   */
  size(): number {
    return this.history.size;
  }
}

/**
 * Global history instance for smoothing
 */
let globalHistory = new LandmarkHistory();

const DEFAULT_CONFIG: Required<SmoothingConfig> = {
  alpha: 0.3,
  visibilityThreshold: 0.3,
  enabled: true,
};

/**
 * Smooth a single landmark using EMA
 * @param landmark - Landmark to smooth
 * @param index - Landmark index for history
 * @param config - Smoothing configuration
 * @returns Smoothed landmark
 */
export function smoothLandmark(
  landmark: Landmark,
  index: number,
  config: SmoothingConfig = {}
): Landmark {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (!cfg.enabled) {
    return landmark;
  }

  return globalHistory.smoothLandmark(index, landmark, cfg.alpha, cfg.visibilityThreshold);
}

/**
 * Smooth all landmarks in a pose
 * @param poseLandmarks - Pose landmarks to smooth
 * @param config - Smoothing configuration
 * @returns Smoothed pose landmarks
 */
export function smoothPoseLandmarks(
  poseLandmarks: PoseLandmarks,
  config: SmoothingConfig = {}
): PoseLandmarks {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (!cfg.enabled) {
    return poseLandmarks;
  }

  const smoothedLandmarks = poseLandmarks.landmarks.map((landmark, index) =>
    globalHistory.smoothLandmark(index, landmark, cfg.alpha, cfg.visibilityThreshold)
  );

  return {
    ...poseLandmarks,
    landmarks: smoothedLandmarks,
  };
}

/**
 * Reset smoothing history
 * Call when camera restarts or switching between users
 */
export function resetSmoothingHistory(): void {
  globalHistory.clear();
}

/**
 * Get smoothing statistics (for debugging)
 */
export function getSmoothingStats(): {
  landmarksInHistory: number;
} {
  return {
    landmarksInHistory: globalHistory.size(),
  };
}

/**
 * Batch smooth multiple pose frames
 * Useful for post-processing recorded sessions
 * @param poseLandmarksArray - Array of pose landmarks
 * @param config - Smoothing configuration
 * @returns Array of smoothed pose landmarks
 */
export function batchSmoothPoses(
  poseLandmarksArray: PoseLandmarks[],
  config: SmoothingConfig = {}
): PoseLandmarks[] {
  // Reset history for batch processing
  resetSmoothingHistory();

  return poseLandmarksArray.map((pose) => smoothPoseLandmarks(pose, config));
}

/**
 * Advanced: Two-pass smoothing (forward-backward)
 * Reduces lag more than single-pass while maintaining smoothness
 * More computationally expensive but better quality
 * @param poseLandmarksArray - Array of pose landmarks
 * @param config - Smoothing configuration
 * @returns Array of double-smoothed pose landmarks
 */
export function twoPassSmooth(
  poseLandmarksArray: PoseLandmarks[],
  config: SmoothingConfig = {}
): PoseLandmarks[] {
  // Forward pass
  resetSmoothingHistory();
  const forwardPass = poseLandmarksArray.map((pose) => smoothPoseLandmarks(pose, config));

  // Backward pass (reverse order)
  resetSmoothingHistory();
  const backwardPass = [...forwardPass]
    .reverse()
    .map((pose) => smoothPoseLandmarks(pose, config))
    .reverse();

  // Average forward and backward
  return forwardPass.map((forward, index) => {
    const backward = backwardPass[index];
    return {
      ...forward,
      landmarks: forward.landmarks.map((land, landIndex) => {
        const backLand = backward.landmarks[landIndex];
        return {
          x: (land.x + backLand.x) / 2,
          y: (land.y + backLand.y) / 2,
          z: ((land.z ?? 0) + (backLand.z ?? 0)) / 2,
          visibility: Math.max(land.visibility ?? 0, backLand.visibility ?? 0),
        };
      }),
    };
  });
}

/**
 * Calculate velocity of a landmark (for motion analysis)
 * @param currentLandmark - Current landmark position
 * @param previousLandmark - Previous landmark position
 * @param deltaTime - Time elapsed in milliseconds
 * @returns Velocity in pixels/millisecond
 */
export function calculateLandmarkVelocity(
  currentLandmark: Landmark,
  previousLandmark: Landmark,
  deltaTime: number = 16 // ~60fps
): number {
  const dx = currentLandmark.x - previousLandmark.x;
  const dy = currentLandmark.y - previousLandmark.y;
  const dz = (currentLandmark.z ?? 0) - (previousLandmark.z ?? 0);

  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return distance / deltaTime;
}

/**
 * Detect if landmark is moving (has significant velocity)
 * @param currentLandmark - Current landmark
 * @param previousLandmark - Previous landmark
 * @param velocityThreshold - Threshold for movement (pixels/ms)
 * @returns True if moving
 */
export function isLandmarkMoving(
  currentLandmark: Landmark,
  previousLandmark: Landmark,
  velocityThreshold: number = 0.005 // ~0.08 pixels per 16ms frame
): boolean {
  return calculateLandmarkVelocity(currentLandmark, previousLandmark) > velocityThreshold;
}

/**
 * Create a new independent smoothing instance
 * Useful if you need multiple independent smoothing streams
 */
export class LandmarkSmoother {
  private history: LandmarkHistory = new LandmarkHistory();
  private config: Required<SmoothingConfig>;

  constructor(config: SmoothingConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update configuration
   */
  setConfig(config: SmoothingConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Smooth a single landmark
   */
  smooth(landmark: Landmark, index: number): Landmark {
    if (!this.config.enabled) {
      return landmark;
    }
    return this.history.smoothLandmark(index, landmark, this.config.alpha, this.config.visibilityThreshold);
  }

  /**
   * Smooth all landmarks in a pose
   */
  smoothPose(poseLandmarks: PoseLandmarks): PoseLandmarks {
    if (!this.config.enabled) {
      return poseLandmarks;
    }

    const smoothedLandmarks = poseLandmarks.landmarks.map((landmark, index) =>
      this.history.smoothLandmark(index, landmark, this.config.alpha, this.config.visibilityThreshold)
    );

    return {
      ...poseLandmarks,
      landmarks: smoothedLandmarks,
    };
  }

  /**
   * Reset history
   */
  reset(): void {
    this.history.clear();
  }

  /**
   * Get stats
   */
  getStats(): { landmarksInHistory: number } {
    return {
      landmarksInHistory: this.history.size(),
    };
  }
}
