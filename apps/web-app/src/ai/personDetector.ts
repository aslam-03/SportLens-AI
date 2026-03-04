/**
 * ═══════════════════════════════════════════════════════════════════
 * PERSON DETECTOR — COCO-SSD Based Human Detection
 * ═══════════════════════════════════════════════════════════════════
 *
 * Runs BEFORE pose estimation to:
 *  1. Confirm a real human is present (eliminates hallucinated skeletons)
 *  2. Select the primary subject when multiple people exist
 *  3. Validate distance (too far / too close)
 *
 * Uses TensorFlow.js COCO-SSD model loaded from CDN.
 *
 * Pipeline position:
 *   Camera Frame → [PERSON DETECTOR] → Pose Estimation → ...
 */

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface BoundingBox {
  x: number;      // top-left x (pixels)
  y: number;      // top-left y (pixels)
  width: number;  // width (pixels)
  height: number; // height (pixels)
}

export interface DetectedPerson {
  bbox: BoundingBox;
  score: number;           // detection confidence 0-1
  selectionScore: number;  // combined area + proximity score
}

export type DistanceStatus = 'ok' | 'too_far' | 'too_close';

export interface PersonDetectionResult {
  /** Whether any person was detected in the frame */
  personDetected: boolean;
  /** The selected primary subject (null if none) */
  primaryPerson: DetectedPerson | null;
  /** All detected persons (for debugging) */
  allPersons: DetectedPerson[];
  /** Distance validation result */
  distanceStatus: DistanceStatus;
  /** Human-readable guidance message */
  message: string | null;
  /** Number of people detected */
  personCount: number;
}

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────

/** Minimum COCO-SSD confidence to count as a person */
const MIN_PERSON_CONFIDENCE = 0.45;

/** Weight for bounding box area in subject selection */
const AREA_WEIGHT = 0.7;

/** Weight for center proximity in subject selection */
const CENTER_WEIGHT = 0.3;

/** Person too far if height < 25% of frame */
const MIN_HEIGHT_RATIO = 0.25;

/** Person too close if height > 85% of frame */
const MAX_HEIGHT_RATIO = 0.85;

/** How often to run COCO-SSD (every N frames) — it's slower than pose */
const DETECTION_INTERVAL_FRAMES = 3;

// ─────────────────────────────────────────────────────────────────
// PersonDetector Class
// ─────────────────────────────────────────────────────────────────

export class PersonDetector {
  private model: any = null;
  private isLoading = false;
  private isReady = false;
  private frameCounter = 0;
  private lastResult: PersonDetectionResult = {
    personDetected: false,
    primaryPerson: null,
    allPersons: [],
    distanceStatus: 'ok',
    message: 'Initializing person detection...',
    personCount: 0,
  };

  /**
   * Load the COCO-SSD model.
   * Call this once during initialization.
   */
  async initialize(): Promise<void> {
    if (this.isReady || this.isLoading) return;
    this.isLoading = true;

    try {
      // Wait for TF.js and COCO-SSD to load from CDN
      await this.waitForCocoSsd();

      const cocoSsd = (window as any).cocoSsd;
      if (!cocoSsd) {
        throw new Error('COCO-SSD not found on window. Check CDN script tags.');
      }

      console.log('[PersonDetector] Loading COCO-SSD model...');
      this.model = await cocoSsd.load({
        base: 'lite_mobilenet_v2', // Fastest variant for real-time
      });

      this.isReady = true;
      this.isLoading = false;
      console.log('[PersonDetector] ✅ COCO-SSD model loaded successfully');
    } catch (err) {
      this.isLoading = false;
      console.error('[PersonDetector] ❌ Failed to load COCO-SSD:', err);
      throw err;
    }
  }

  /**
   * Poll until cocoSsd is available on window.
   */
  private async waitForCocoSsd(maxWaitMs = 15000): Promise<void> {
    const start = Date.now();
    while (!(window as any).cocoSsd) {
      if (Date.now() - start > maxWaitMs) {
        throw new Error('COCO-SSD CDN scripts did not load in time.');
      }
      await new Promise(r => setTimeout(r, 150));
    }
    console.log('[PersonDetector] COCO-SSD library available');
  }

  /** Check if detector is ready */
  get ready(): boolean {
    return this.isReady;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * DETECT — Run person detection on a video frame
   * ═══════════════════════════════════════════════════════════════
   *
   * Runs COCO-SSD every N frames for performance.
   * Returns cached result on skipped frames.
   */
  async detect(video: HTMLVideoElement): Promise<PersonDetectionResult> {
    if (!this.isReady || !this.model) {
      return this.lastResult;
    }

    // Skip frames for performance (COCO-SSD is heavier than pose)
    this.frameCounter++;
    if (this.frameCounter % DETECTION_INTERVAL_FRAMES !== 0) {
      return this.lastResult;
    }

    // Ensure video is ready
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return this.lastResult;
    }

    try {
      const predictions = await this.model.detect(video);

      // Filter to only "person" class with sufficient confidence
      const persons: DetectedPerson[] = predictions
        .filter((p: any) => p.class === 'person' && p.score >= MIN_PERSON_CONFIDENCE)
        .map((p: any) => {
          const bbox: BoundingBox = {
            x: p.bbox[0],
            y: p.bbox[1],
            width: p.bbox[2],
            height: p.bbox[3],
          };
          return {
            bbox,
            score: p.score,
            selectionScore: this.computeSelectionScore(bbox, video.videoWidth, video.videoHeight),
          };
        });

      if (persons.length === 0) {
        this.lastResult = {
          personDetected: false,
          primaryPerson: null,
          allPersons: [],
          distanceStatus: 'ok',
          message: 'No human detected — please step into frame.',
          personCount: 0,
        };
        return this.lastResult;
      }

      // Select primary subject (highest selection score)
      persons.sort((a, b) => b.selectionScore - a.selectionScore);
      const primary = persons[0];

      // Distance validation
      const heightRatio = primary.bbox.height / video.videoHeight;
      let distanceStatus: DistanceStatus = 'ok';
      let distanceMessage: string | null = null;

      if (heightRatio < MIN_HEIGHT_RATIO) {
        distanceStatus = 'too_far';
        distanceMessage = 'You are too far from the camera. Move closer.';
      } else if (heightRatio > MAX_HEIGHT_RATIO) {
        distanceStatus = 'too_close';
        distanceMessage = 'You are too close to the camera. Step back.';
      }

      this.lastResult = {
        personDetected: true,
        primaryPerson: primary,
        allPersons: persons,
        distanceStatus,
        message: distanceMessage,
        personCount: persons.length,
      };

      return this.lastResult;
    } catch (err) {
      console.error('[PersonDetector] Detection error:', err);
      return this.lastResult;
    }
  }

  /**
   * Get the last detection result without running detection.
   */
  getLastResult(): PersonDetectionResult {
    return this.lastResult;
  }

  /**
   * Compute selection score for choosing the primary subject.
   *
   * Formula: score = (bbox_area_ratio * 0.7) + (center_proximity * 0.3)
   *
   * - Larger bounding box = more prominent subject
   * - Closer to center = more likely the intended subject
   */
  private computeSelectionScore(bbox: BoundingBox, frameW: number, frameH: number): number {
    // Area ratio (0 to 1)
    const areaRatio = (bbox.width * bbox.height) / (frameW * frameH);

    // Center proximity (1 = perfectly centered, 0 = at edge)
    const bboxCenterX = bbox.x + bbox.width / 2;
    const bboxCenterY = bbox.y + bbox.height / 2;
    const frameCenterX = frameW / 2;
    const frameCenterY = frameH / 2;

    // Distance from center, normalized to frame diagonal
    const maxDist = Math.sqrt(frameCenterX ** 2 + frameCenterY ** 2);
    const dist = Math.sqrt(
      (bboxCenterX - frameCenterX) ** 2 + (bboxCenterY - frameCenterY) ** 2
    );
    const centerProximity = 1 - (dist / maxDist);

    return (areaRatio * AREA_WEIGHT) + (centerProximity * CENTER_WEIGHT);
  }

  /**
   * Reset detector state.
   */
  reset(): void {
    this.frameCounter = 0;
    this.lastResult = {
      personDetected: false,
      primaryPerson: null,
      allPersons: [],
      distanceStatus: 'ok',
      message: null,
      personCount: 0,
    };
  }

  /**
   * Dispose of the model (call on unmount).
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose?.();
      this.model = null;
    }
    this.isReady = false;
    this.isLoading = false;
    this.reset();
    console.log('[PersonDetector] Disposed');
  }
}
