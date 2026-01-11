import { PoseLandmarks, Landmark } from '../ai/poseEstimator';

// Skeleton connection pairs (bone connections between joints)
const SKELETON_CONNECTIONS: Array<[number, number]> = [
  // Head connections
  [0, 1], [1, 2], [2, 3], [3, 7], // Left eye
  [0, 4], [4, 5], [5, 6], [6, 8], // Right eye
  [9, 10], // Mouth
  
  // Upper body
  [11, 12], // Shoulders
  [11, 13], [13, 15], // Left arm
  [12, 14], [14, 16], // Right arm
  
  // Hands
  [15, 17], [17, 19], [19, 21], // Left hand
  [16, 18], [18, 20], [20, 22], // Right hand
  
  // Torso
  [11, 23], [12, 24], // Shoulders to hips
  [23, 24], // Hip connection
  
  // Left leg
  [23, 25], [25, 27], [27, 29], [29, 31], // Left leg chain
  
  // Right leg
  [24, 26], [26, 28], [28, 30], [30, 32], // Right leg chain
];

interface DrawSkeletonOptions {
  jointRadius?: number;
  lineWidth?: number;
  jointColor?: string;
  lineColor?: string;
  visibilityThreshold?: number;
  clearColor?: string;
}

const DEFAULT_OPTIONS: Required<DrawSkeletonOptions> = {
  jointRadius: 6,
  lineWidth: 2,
  jointColor: '#07cff6', // Brand cyan
  lineColor: '#194162', // Brand blue
  visibilityThreshold: 0.5,
  clearColor: 'transparent',
};

/**
 * Draw skeleton pose landmarks on a canvas
 * 
 * @param canvas - Canvas element to draw on
 * @param poseLandmarks - Pose landmarks from poseEstimator
 * @param options - Drawing options
 */
export function drawSkeleton(
  canvas: HTMLCanvasElement | null | undefined,
  poseLandmarks: PoseLandmarks | null | undefined,
  options: DrawSkeletonOptions = {}
): void {
  if (!canvas || !poseLandmarks) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Clear canvas
  if (opts.clearColor === 'transparent') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = opts.clearColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const { landmarks } = poseLandmarks;
  if (!landmarks || landmarks.length === 0) return;

  // Draw connections (bones) first so they appear behind joints
  drawConnections(ctx, landmarks, opts, canvas);

  // Draw joints (landmarks) on top
  drawJoints(ctx, landmarks, opts, canvas);
}

/**
 * Draw connection lines between landmark pairs
 */
function drawConnections(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  options: Required<DrawSkeletonOptions>,
  canvas: HTMLCanvasElement
): void {
  ctx.strokeStyle = options.lineColor;
  ctx.lineWidth = options.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const [start, end] of SKELETON_CONNECTIONS) {
    const startLandmark = landmarks[start];
    const endLandmark = landmarks[end];

    if (!startLandmark || !endLandmark) continue;

    // Check visibility of both landmarks
    const startVisible = (startLandmark.visibility ?? 0) >= options.visibilityThreshold;
    const endVisible = (endLandmark.visibility ?? 0) >= options.visibilityThreshold;

    if (!startVisible || !endVisible) continue;

    // Scale to canvas coordinates
    const startX = startLandmark.x * canvas.width;
    const startY = startLandmark.y * canvas.height;
    const endX = endLandmark.x * canvas.width;
    const endY = endLandmark.y * canvas.height;

    // Draw line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }
}

/**
 * Draw joint circles at landmark positions
 */
function drawJoints(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  options: Required<DrawSkeletonOptions>,
  canvas: HTMLCanvasElement
): void {
  ctx.fillStyle = options.jointColor;

  landmarks.forEach((landmark) => {
    // Check visibility
    if ((landmark.visibility ?? 0) < options.visibilityThreshold) {
      return;
    }

    // Scale to canvas coordinates
    const x = landmark.x * canvas.width;
    const y = landmark.y * canvas.height;

    // Draw circle
    ctx.beginPath();
    ctx.arc(x, y, options.jointRadius, 0, 2 * Math.PI);
    ctx.fill();
  });
}

/**
 * Draw skeleton with minimal options (convenience function)
 * 
 * @param canvas - Canvas element
 * @param poseLandmarks - Pose landmarks
 */
export function drawSkeletonSimple(
  canvas: HTMLCanvasElement | null | undefined,
  poseLandmarks: PoseLandmarks | null | undefined
): void {
  drawSkeleton(canvas, poseLandmarks);
}

/**
 * Draw only the joints without connections
 * 
 * @param canvas - Canvas element
 * @param landmarks - Array of landmarks
 * @param options - Drawing options
 */
export function drawJointsOnly(
  canvas: HTMLCanvasElement | null | undefined,
  landmarks: Landmark[] | null | undefined,
  options: DrawSkeletonOptions = {}
): void {
  if (!canvas || !landmarks) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = opts.jointColor;

  landmarks.forEach((landmark) => {
    if ((landmark.visibility ?? 0) < opts.visibilityThreshold) {
      return;
    }

    const x = landmark.x * canvas.width;
    const y = landmark.y * canvas.height;

    ctx.beginPath();
    ctx.arc(x, y, opts.jointRadius, 0, 2 * Math.PI);
    ctx.fill();
  });
}

/**
 * Draw only the connections without joints
 * 
 * @param canvas - Canvas element
 * @param landmarks - Array of landmarks
 * @param options - Drawing options
 */
export function drawConnectionsOnly(
  canvas: HTMLCanvasElement | null | undefined,
  landmarks: Landmark[] | null | undefined,
  options: DrawSkeletonOptions = {}
): void {
  if (!canvas || !landmarks) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = opts.lineColor;
  ctx.lineWidth = opts.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const [start, end] of SKELETON_CONNECTIONS) {
    const startLandmark = landmarks[start];
    const endLandmark = landmarks[end];

    if (!startLandmark || !endLandmark) continue;

    const startVisible = (startLandmark.visibility ?? 0) >= opts.visibilityThreshold;
    const endVisible = (endLandmark.visibility ?? 0) >= opts.visibilityThreshold;

    if (!startVisible || !endVisible) continue;

    const startX = startLandmark.x * canvas.width;
    const startY = startLandmark.y * canvas.height;
    const endX = endLandmark.x * canvas.width;
    const endY = endLandmark.y * canvas.height;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }
}

/**
 * Get skeleton connection pairs
 * Useful for custom rendering implementations
 */
export function getSkeletonConnections(): Array<[number, number]> {
  return [...SKELETON_CONNECTIONS];
}
