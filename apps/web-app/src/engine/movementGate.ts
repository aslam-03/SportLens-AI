/**
 * ═══════════════════════════════════════════════════════════════════
 * MOVEMENT GATE — Action Detection & Idle Prevention
 * ═══════════════════════════════════════════════════════════════════
 *
 * This module prevents scoring during idle standing, random walking,
 * or non-exercise movements. It acts as a gate that only opens
 * when genuine athletic movement is detected.
 *
 * Pipeline Position: ... → Validation → Smoothing → [MOVEMENT GATE] → ...
 *
 * Features:
 *  - Joint velocity tracking
 *  - Idle detection (pause scoring if idle > threshold)
 *  - Minimum movement duration before scoring begins
 *  - One-action-at-a-time lock
 */

import { Landmark, PoseLandmarks } from '../ai/poseEstimator';
import { LANDMARK_INDICES } from '../Biomechanics/angleCalculator';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export type MovementState = 'idle' | 'moving' | 'active_exercise';

export interface MovementGateResult {
    /** Current movement state */
    state: MovementState;
    /** Whether scoring should proceed */
    shouldScore: boolean;
    /** Total body velocity (normalized 0-1 scale) */
    totalVelocity: number;
    /** How long current movement has been sustained (ms) */
    movementDurationMs: number;
    /** User message if movement is insufficient */
    message: string | null;
}

export interface MovementGateConfig {
    /** Minimum joint velocity threshold to count as "moving" (normalized units/frame) */
    velocityThreshold: number;
    /** Number of milliseconds movement must sustain before scoring */
    minMovementDurationMs: number;
    /** Number of milliseconds of stillness before marking as idle */
    idleTimeoutMs: number;
    /** Minimum number of joints that must be moving */
    minMovingJoints: number;
}

// ─────────────────────────────────────────────────────────
// Joint indices to track for velocity
// ─────────────────────────────────────────────────────────

const VELOCITY_JOINTS = [
    LANDMARK_INDICES.LEFT_SHOULDER,
    LANDMARK_INDICES.RIGHT_SHOULDER,
    LANDMARK_INDICES.LEFT_ELBOW,
    LANDMARK_INDICES.RIGHT_ELBOW,
    LANDMARK_INDICES.LEFT_WRIST,
    LANDMARK_INDICES.RIGHT_WRIST,
    LANDMARK_INDICES.LEFT_HIP,
    LANDMARK_INDICES.RIGHT_HIP,
    LANDMARK_INDICES.LEFT_KNEE,
    LANDMARK_INDICES.RIGHT_KNEE,
    LANDMARK_INDICES.LEFT_ANKLE,
    LANDMARK_INDICES.RIGHT_ANKLE,
];

// ─────────────────────────────────────────────────────────
// Default Configuration
// ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG: MovementGateConfig = {
    velocityThreshold: 0.0003,   // Very sensitive: catch slow / subtle movements
    minMovementDurationMs: 200,  // 200ms before scoring starts (was 500ms)
    idleTimeoutMs: 5000,         // 5s idle grace before pausing scoring (was 3s)
    minMovingJoints: 1,          // Single joint moving is enough (was 2)
};

// ─────────────────────────────────────────────────────────
// Movement Gate Class
// ─────────────────────────────────────────────────────────

export class MovementGate {
    private config: MovementGateConfig;
    private previousLandmarks: Landmark[] | null = null;
    private previousTimestamp: number = 0;
    private movementStartTime: number = 0;
    private lastMovementTime: number = 0;
    private state: MovementState = 'idle';
    private isLocked = false; // One-action-at-a-time lock

    constructor(config?: Partial<MovementGateConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<MovementGateConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Reset state (call when session starts/stops)
     */
    reset(): void {
        this.previousLandmarks = null;
        this.previousTimestamp = 0;
        this.movementStartTime = 0;
        this.lastMovementTime = 0;
        this.state = 'idle';
        this.isLocked = false;
    }

    /**
     * Lock the gate (during an active action — prevents concurrent scoring)
     */
    lock(): void {
        this.isLocked = true;
    }

    /**
     * Unlock the gate
     */
    unlock(): void {
        this.isLocked = false;
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * MAIN EVALUATION — Should scoring proceed?
     * ═══════════════════════════════════════════════════════════════
     */
    evaluate(poseLandmarks: PoseLandmarks | null): MovementGateResult {
        const now = Date.now();

        // No landmarks → idle
        if (!poseLandmarks || !poseLandmarks.landmarks || poseLandmarks.landmarks.length === 0) {
            this.state = 'idle';
            return {
                state: 'idle',
                shouldScore: false,
                totalVelocity: 0,
                movementDurationMs: 0,
                message: null,
            };
        }

        const currentLandmarks = poseLandmarks.landmarks;

        // First frame — no previous data to compare
        if (!this.previousLandmarks) {
            this.previousLandmarks = [...currentLandmarks];
            this.previousTimestamp = now;
            this.state = 'idle';
            return {
                state: 'idle',
                shouldScore: false,
                totalVelocity: 0,
                movementDurationMs: 0,
                message: 'Initializing movement detection...',
            };
        }

        // Calculate velocities for tracked joints
        const deltaTime = Math.max(1, now - this.previousTimestamp);
        const { totalVelocity, movingJointCount } = this.calculateVelocities(
            currentLandmarks,
            this.previousLandmarks,
            deltaTime
        );

        // Update previous frame
        this.previousLandmarks = [...currentLandmarks];
        this.previousTimestamp = now;

        // Determine if currently moving
        const isMoving =
            totalVelocity > this.config.velocityThreshold &&
            movingJointCount >= this.config.minMovingJoints;

        // ── State Machine ──
        if (isMoving) {
            this.lastMovementTime = now;

            if (this.state === 'idle') {
                // Transition: idle → moving
                this.movementStartTime = now;
                this.state = 'moving';
            }

            // Check if movement has been sustained long enough
            const movementDuration = now - this.movementStartTime;
            if (movementDuration >= this.config.minMovementDurationMs) {
                this.state = 'active_exercise';
            }
        } else {
            // Not moving — check if idle timeout exceeded
            const timeSinceLastMovement = now - this.lastMovementTime;
            if (timeSinceLastMovement >= this.config.idleTimeoutMs) {
                if (this.state !== 'idle') {
                    this.state = 'idle';
                    this.movementStartTime = 0;
                }
            }
            // If between idle timeout, keep current state (grace period)
        }

        // Determine scoring permission
        const movementDurationMs =
            this.movementStartTime > 0 ? now - this.movementStartTime : 0;

        let shouldScore = this.state === 'active_exercise' && !this.isLocked;
        let message: string | null = null;

        if (this.isLocked) {
            shouldScore = false;
            message = 'Processing current action...';
        } else if (this.state === 'idle') {
            message = null; // Don't spam when idle
        } else if (this.state === 'moving') {
            const remaining = Math.max(
                0,
                this.config.minMovementDurationMs - movementDurationMs
            );
            if (remaining > 0) {
                message = `Detecting exercise... (${Math.ceil(remaining / 1000)}s)`;
            }
        }

        return {
            state: this.state,
            shouldScore,
            totalVelocity,
            movementDurationMs,
            message,
        };
    }

    /**
     * Get current state
     */
    getState(): MovementState {
        return this.state;
    }

    // ─────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────

    /**
     * Calculate velocity for each tracked joint
     */
    private calculateVelocities(
        current: Landmark[],
        previous: Landmark[],
        deltaTime: number
    ): { totalVelocity: number; movingJointCount: number } {
        let totalVelocity = 0;
        let movingJointCount = 0;

        for (const jointIdx of VELOCITY_JOINTS) {
            if (
                jointIdx >= current.length ||
                jointIdx >= previous.length ||
                !current[jointIdx] ||
                !previous[jointIdx]
            ) {
                continue;
            }

            const curr = current[jointIdx];
            const prev = previous[jointIdx];

            // Skip very low-visibility joints
            if ((curr.visibility ?? 0) < 0.1 || (prev.visibility ?? 0) < 0.1) {
                continue;
            }

            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const velocity = Math.sqrt(dx * dx + dy * dy);

            // Normalize by delta time (to per-16ms frame rate)
            const normalizedVelocity = velocity * (16 / deltaTime);

            totalVelocity += normalizedVelocity;

            if (normalizedVelocity > this.config.velocityThreshold) {
                movingJointCount++;
            }
        }

        // Average across all tracked joints
        totalVelocity = totalVelocity / VELOCITY_JOINTS.length;

        return { totalVelocity, movingJointCount };
    }
}
