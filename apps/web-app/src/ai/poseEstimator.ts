/**
 * PoseEstimator Module
 * Uses MediaPipe Pose via CDN for real-time pose detection
 * No UI logic - purely for pose estimation
 */

// Type definitions for pose landmarks
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseLandmarks {
  landmarks: Landmark[];
  worldLandmarks?: Landmark[];
  segmentationMask?: ImageData;
}

/**
 * Declare Pose from CDN global scope
 * MediaPipe is loaded via CDN in index.html
 */
const globalWindow = typeof window !== 'undefined' ? window : ({} as any);

// State management
let pose: any = null;
let isInitialized = false;
let isInitializing = false;
let latestResults: PoseLandmarks | null = null;
let onResultsCallback: any = null;

/**
 * Wait for MediaPipe scripts to load
 * Polls window.Pose until it's available
 */
async function waitForMediaPipe(maxWaitTime: number = 10000): Promise<void> {
  const startTime = Date.now();

  while (!(globalWindow as any).Pose) {
    if (Date.now() - startTime > maxWaitTime) {
      throw new Error(
        'MediaPipe Pose failed to load from CDN. Check network and script tags in index.html'
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('MediaPipe Pose library loaded from CDN');
}

/**
 * Initialize MediaPipe Pose
 * @param videoElement - Video element to process
 * @param onResults - Callback function for pose results
 */
export async function initializePose(
  videoElement: HTMLVideoElement,
  onResults: any
): Promise<void> {
  if (isInitialized) {
    console.log('Pose already initialized');
    return;
  }

  if (isInitializing) {
    console.log('Pose initialization in progress...');
    return;
  }

  isInitializing = true;

  try {
    // Wait for MediaPipe to load from CDN
    await waitForMediaPipe();

    // Create Pose instance
    pose = new (globalWindow as any).Pose({
      locateFile: (file: string) => {
        // CDN location for MediaPipe assets
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      },
    });

    // Configure Pose
    pose.setOptions({
      modelComplexity: 1, // 0: Lite, 1: Full, 2: Heavy
      smoothLandmarks: true, // Enable temporal smoothing
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5, // Detection threshold
      minTrackingConfidence: 0.5, // Tracking threshold
    });

    // Store callback
    onResultsCallback = onResults;

    // Set onResults callback
    pose.onResults((results: any) => {
      if (results.poseLandmarks) {
        latestResults = {
          landmarks: results.poseLandmarks,
          worldLandmarks: results.poseWorldLandmarks || undefined,
          segmentationMask: results.segmentationMask || undefined,
        };

        // Call user callback
        if (onResultsCallback) {
          onResultsCallback(latestResults);
        }
      }
    });

    isInitialized = true;
    console.log('Pose initialized successfully with CDN MediaPipe');
  } catch (error) {
    isInitializing = false;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Failed to initialize Pose:', errorMsg);
    throw new Error(`Pose initialization failed: ${errorMsg}`);
  }

  isInitializing = false;
}

/**
 * Detect pose from video element
 * Must call initializePose first
 * @param videoElement - Video element with frames to process
 */
export async function detectPose(videoElement: HTMLVideoElement): Promise<PoseLandmarks | null> {
  if (!isInitialized || !pose) {
    console.error('Pose not initialized. Call initializePose() first.');
    return null;
  }

  // Check video is ready
  if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    return null;
  }

  try {
    // Send video frame to MediaPipe
    await pose.send({ image: videoElement });

    // Return latest results
    return latestResults;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Pose detection error:', errorMsg);
    return null;
  }
}

/**
 * Get the latest pose results without processing new frames
 * Useful when combined with requestAnimationFrame
 */
export function getLatestResults(): PoseLandmarks | null {
  return latestResults;
}

/**
 * Check if a specific landmark is visible/confident
 */
export function isLandmarkVisible(landmark: Landmark, threshold: number = 0.5): boolean {
  return (landmark.visibility ?? 0) >= threshold;
}

/**
 * Calculate distance between two landmarks
 */
export function calculateDistance(landmark1: Landmark, landmark2: Landmark): number {
  const dx = landmark2.x - landmark1.x;
  const dy = landmark2.y - landmark1.y;
  const dz = (landmark2.z ?? 0) - (landmark1.z ?? 0);

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate angle between three landmarks (in degrees)
 */
export function calculateAngle(
  landmarkA: Landmark,
  landmarkB: Landmark,
  landmarkC: Landmark
): number {
  const vectorBA = {
    x: landmarkA.x - landmarkB.x,
    y: landmarkA.y - landmarkB.y,
    z: (landmarkA.z ?? 0) - (landmarkB.z ?? 0),
  };

  const vectorBC = {
    x: landmarkC.x - landmarkB.x,
    y: landmarkC.y - landmarkB.y,
    z: (landmarkC.z ?? 0) - (landmarkB.z ?? 0),
  };

  const dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y + vectorBA.z * vectorBC.z;
  const magnitudeBA = Math.sqrt(vectorBA.x ** 2 + vectorBA.y ** 2 + vectorBA.z ** 2);
  const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2 + vectorBC.z ** 2);

  const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
  const radians = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  const degrees = (radians * 180) / Math.PI;

  return degrees;
}

/**
 * Standard MediaPipe Pose landmark indices (33 landmarks)
 */
export const PoseLandmarkIndices = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

/**
 * Clean up and close Pose instance
 * Call this when component unmounts
 */
export async function closePose(): Promise<void> {
  if (pose) {
    try {
      await pose.close();
      pose = null;
      isInitialized = false;
      latestResults = null;
      onResultsCallback = null;
      console.log('Pose closed successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Error closing Pose:', errorMsg);
    }
  }
}

/**
 * Check if Pose is ready
 */
export function isPoseReady(): boolean {
  return isInitialized && pose !== null;
}

/**
 * Check if MediaPipe is available in window
 */
export function isMediaPipeAvailable(): boolean {
  return !!(globalWindow as any).Pose;
}
