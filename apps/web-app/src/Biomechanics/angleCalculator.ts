import { Landmark, PoseLandmarks } from '../ai/poseEstimator';

/**
 * Calculate the angle between three points using vector geometry.
 * Uses the dot product formula: angle = arccos((BA · BC) / (|BA| * |BC|))
 * @param pointA The first point
 * @param pointB The middle point (vertex of the angle)
 * @param pointC The third point
 * @returns Angle in degrees (0-180), or null if any point is missing
 */
export function calculateAngleBetweenPoints(pointA: Landmark | null, pointB: Landmark | null, pointC: Landmark | null): number | null {
  if (!pointA || !pointB || !pointC) {
    return null;
  }

  // Vector BA (from B to A)
  const baX = pointA.x - pointB.x;
  const baY = pointA.y - pointB.y;
  const baZ = (pointA.z ?? 0) - (pointB.z ?? 0);

  // Vector BC (from B to C)
  const bcX = pointC.x - pointB.x;
  const bcY = pointC.y - pointB.y;
  const bcZ = (pointC.z ?? 0) - (pointB.z ?? 0);

  // Dot product
  const dotProduct = baX * bcX + baY * bcY + baZ * bcZ;

  // Magnitudes
  const magnitudeBA = Math.sqrt(baX * baX + baY * baY + baZ * baZ);
  const magnitudeBC = Math.sqrt(bcX * bcX + bcY * bcY + bcZ * bcZ);

  if (magnitudeBA === 0 || magnitudeBC === 0) {
    return null;
  }

  // Calculate angle in radians
  const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
  // Clamp to [-1, 1] to avoid floating point errors in acos
  const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));
  const angleRadians = Math.acos(clampedCosAngle);

  // Convert to degrees
  const angleDegrees = (angleRadians * 180) / Math.PI;

  return angleDegrees;
}

/**
 * Validate that a landmark has sufficient visibility
 * @param landmark The landmark to check
 * @param minVisibility Minimum visibility threshold (0-1). Default 0.3
 * @returns True if landmark is visible enough
 */
export function isLandmarkVisible(landmark: Landmark | null, minVisibility: number = 0.3): boolean {
  if (!landmark) return false;
  const visibility = landmark.visibility ?? 0.5;
  return visibility >= minVisibility;
}

/**
 * MediaPipe Pose landmark indices
 * Reference: https://developers.google.com/mediapipe/solutions/vision/pose_detector
 */
export const LANDMARK_INDICES = {
  // Head
  NOSE: 0,
  LEFT_EYE: 1,
  RIGHT_EYE: 2,

  // Shoulders & Torso
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,

  // Hips
  LEFT_HIP: 23,
  RIGHT_HIP: 24,

  // Legs
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

/**
 * Joint angle definition
 */
export interface JointAngle {
  name: string;
  angle: number | null; // degrees, or null if cannot be calculated
  confidence: number; // 0-1, based on visibility of involved landmarks
}

/**
 * All biomechanical angles for a frame
 */
export interface BiomechanicsFrame {
  leftKneeAngle: number | null;
  rightKneeAngle: number | null;
  leftHipAngle: number | null;
  rightHipAngle: number | null;
  leftElbowAngle: number | null;
  rightElbowAngle: number | null;
  leftShoulderAngle: number | null;
  rightShoulderAngle: number | null;
  frameTimestamp: number;
}

/**
 * Calculate all key joint angles from pose landmarks
 * @param poseLandmarks The pose landmarks from MediaPipe
 * @param minVisibility Minimum visibility threshold for landmarks (0-1)
 * @returns BiomechanicsFrame with all angles and null for invalid/missing joints
 */
export function calculateBiomechanics(poseLandmarks: PoseLandmarks | null, minVisibility: number = 0.3): BiomechanicsFrame {
  const frame: BiomechanicsFrame = {
    leftKneeAngle: null,
    rightKneeAngle: null,
    leftHipAngle: null,
    rightHipAngle: null,
    leftElbowAngle: null,
    rightElbowAngle: null,
    leftShoulderAngle: null,
    rightShoulderAngle: null,
    frameTimestamp: Date.now(),
  };

  if (!poseLandmarks || !poseLandmarks.landmarks || poseLandmarks.landmarks.length === 0) {
    return frame;
  }

  const landmarks = poseLandmarks.landmarks;

  // Left Knee: Hip → Knee → Ankle
  if (isLandmarkVisible(landmarks[LANDMARK_INDICES.LEFT_HIP], minVisibility) &&
      isLandmarkVisible(landmarks[LANDMARK_INDICES.LEFT_KNEE], minVisibility) &&
      isLandmarkVisible(landmarks[LANDMARK_INDICES.LEFT_ANKLE], minVisibility)) {
    frame.leftKneeAngle = calculateAngleBetweenPoints(
      landmarks[LANDMARK_INDICES.LEFT_HIP],
      landmarks[LANDMARK_INDICES.LEFT_KNEE],
      landmarks[LANDMARK_INDICES.LEFT_ANKLE]
    );
  }

  // Right Knee: Hip → Knee → Ankle
  if (isLandmarkVisible(landmarks[LANDMARK_INDICES.RIGHT_HIP], minVisibility) &&
      isLandmarkVisible(landmarks[LANDMARK_INDICES.RIGHT_KNEE], minVisibility) &&
      isLandmarkVisible(landmarks[LANDMARK_INDICES.RIGHT_ANKLE], minVisibility)) {
    frame.rightKneeAngle = calculateAngleBetweenPoints(
      landmarks[LANDMARK_INDICES.RIGHT_HIP],
      landmarks[LANDMARK_INDICES.RIGHT_KNEE],
      landmarks[LANDMARK_INDICES.RIGHT_ANKLE]
    );
  }

  // Left Hip: Shoulder → Hip → Knee
  if (isLandmarkVisible(landmarks[LANDMARK_INDICES.LEFT_SHOULDER], minVisibility) &&
      isLandmarkVisible(landmarks[LANDMARK_INDICES.LEFT_HIP], minVisibility) &&
      isLandmarkVisible(landmarks[LANDMARK_INDICES.LEFT_KNEE], minVisibility)) {
    frame.leftHipAngle = calculateAngleBetweenPoints(
      landmarks[LANDMARK_INDICES.LEFT_SHOULDER],
      landmarks[LANDMARK_INDICES.LEFT_HIP],
      landmarks[LANDMARK_INDICES.LEFT_KNEE]
    );
  }

  // Right Hip: Shoulder → Hip → Knee
  if (isLandmarkVisible(landmarks[LANDMARK_INDICES.RIGHT_SHOULDER], minVisibility) &&
      isLandmarkVisible(landmarks[LANDMARK_INDICES.RIGHT_HIP], minVisibility) &&
      isLandmarkVisible(landmarks[LANDMARK_INDICES.RIGHT_KNEE], minVisibility)) {
    frame.rightHipAngle = calculateAngleBetweenPoints(
      landmarks[LANDMARK_INDICES.RIGHT_SHOULDER],
      landmarks[LANDMARK_INDICES.RIGHT_HIP],
      landmarks[LANDMARK_INDICES.RIGHT_KNEE]
    );
  }

  // Left Elbow: Shoulder → Elbow → Wrist
  if (isLandmarkVisible(landmarks[LANDMARK_INDICES.LEFT_SHOULDER], minVisibility) &&
      isLandmarkVisible(landmarks[LANDMARK_INDICES.LEFT_ELBOW], minVisibility) &&
      isLandmarkVisible(landmarks[LANDMARK_INDICES.LEFT_WRIST], minVisibility)) {
    frame.leftElbowAngle = calculateAngleBetweenPoints(
      landmarks[LANDMARK_INDICES.LEFT_SHOULDER],
      landmarks[LANDMARK_INDICES.LEFT_ELBOW],
      landmarks[LANDMARK_INDICES.LEFT_WRIST]
    );
  }

  // Right Elbow: Shoulder → Elbow → Wrist
  if (isLandmarkVisible(landmarks[LANDMARK_INDICES.RIGHT_SHOULDER], minVisibility) &&
      isLandmarkVisible(landmarks[LANDMARK_INDICES.RIGHT_ELBOW], minVisibility) &&
      isLandmarkVisible(landmarks[LANDMARK_INDICES.RIGHT_WRIST], minVisibility)) {
    frame.rightElbowAngle = calculateAngleBetweenPoints(
      landmarks[LANDMARK_INDICES.RIGHT_SHOULDER],
      landmarks[LANDMARK_INDICES.RIGHT_ELBOW],
      landmarks[LANDMARK_INDICES.RIGHT_WRIST]
    );
  }

  // Left Shoulder: Elbow → Shoulder → Hip
  if (isLandmarkVisible(landmarks[LANDMARK_INDICES.LEFT_ELBOW], minVisibility) &&
      isLandmarkVisible(landmarks[LANDMARK_INDICES.LEFT_SHOULDER], minVisibility) &&
      isLandmarkVisible(landmarks[LANDMARK_INDICES.LEFT_HIP], minVisibility)) {
    frame.leftShoulderAngle = calculateAngleBetweenPoints(
      landmarks[LANDMARK_INDICES.LEFT_ELBOW],
      landmarks[LANDMARK_INDICES.LEFT_SHOULDER],
      landmarks[LANDMARK_INDICES.LEFT_HIP]
    );
  }

  // Right Shoulder: Elbow → Shoulder → Hip
  if (isLandmarkVisible(landmarks[LANDMARK_INDICES.RIGHT_ELBOW], minVisibility) &&
      isLandmarkVisible(landmarks[LANDMARK_INDICES.RIGHT_SHOULDER], minVisibility) &&
      isLandmarkVisible(landmarks[LANDMARK_INDICES.RIGHT_HIP], minVisibility)) {
    frame.rightShoulderAngle = calculateAngleBetweenPoints(
      landmarks[LANDMARK_INDICES.RIGHT_ELBOW],
      landmarks[LANDMARK_INDICES.RIGHT_SHOULDER],
      landmarks[LANDMARK_INDICES.RIGHT_HIP]
    );
  }

  return frame;
}

/**
 * Moving average smoother for joint angles
 * Keeps a window of recent angles and averages them
 */
export class AngleSmoother {
  private windowSize: number;
  private angleHistories: Map<string, number[]> = new Map();

  constructor(windowSize: number = 5) {
    this.windowSize = Math.max(1, windowSize);
  }

  /**
   * Smooth a single angle value using moving average
   * @param jointName Unique identifier for this joint (e.g., "leftKnee")
   * @param angle Current angle value
   * @returns Smoothed angle value
   */
  smoothAngle(jointName: string, angle: number | null): number | null {
    if (angle === null || isNaN(angle)) {
      return null;
    }

    if (!this.angleHistories.has(jointName)) {
      this.angleHistories.set(jointName, []);
    }

    const history = this.angleHistories.get(jointName)!;
    history.push(angle);

    // Keep only recent values
    if (history.length > this.windowSize) {
      history.shift();
    }

    // Calculate average
    const sum = history.reduce((a, b) => a + b, 0);
    return sum / history.length;
  }

  /**
   * Smooth all angles in a biomechanics frame
   * @param frame The current frame with angles
   * @returns Frame with smoothed angles
   */
  smoothFrame(frame: BiomechanicsFrame): BiomechanicsFrame {
    return {
      leftKneeAngle: this.smoothAngle('leftKnee', frame.leftKneeAngle),
      rightKneeAngle: this.smoothAngle('rightKnee', frame.rightKneeAngle),
      leftHipAngle: this.smoothAngle('leftHip', frame.leftHipAngle),
      rightHipAngle: this.smoothAngle('rightHip', frame.rightHipAngle),
      leftElbowAngle: this.smoothAngle('leftElbow', frame.leftElbowAngle),
      rightElbowAngle: this.smoothAngle('rightElbow', frame.rightElbowAngle),
      leftShoulderAngle: this.smoothAngle('leftShoulder', frame.leftShoulderAngle),
      rightShoulderAngle: this.smoothAngle('rightShoulder', frame.rightShoulderAngle),
      frameTimestamp: frame.frameTimestamp,
    };
  }

  /**
   * Reset the smoother (useful when stopping/restarting)
   */
  reset(): void {
    this.angleHistories.clear();
  }
}
