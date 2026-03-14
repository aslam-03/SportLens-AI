import { CoachingRule, createRule, createRangeRule } from './ruleEngine';

/**
 * Fitness coaching rules for squat analysis
 *
 * Production-grade thresholds calibrated to create meaningful score
 * differentiation between poor, average, and excellent form.
 *
 * Key changes from v1:
 * - Tighter thresholds that fire more often, creating score variation
 * - Added "excellent depth" encouragement at info level
 * - More granular severity levels
 */

/**
 * Squat Depth Rules
 * Target: Knee angle should be 75-100° at bottom of squat
 */
export const SQUAT_DEPTH_RULES: CoachingRule[] = [
  // Half squat warning (not deep enough)
  createRule(
    'SQUAT_DEPTH_HALF',
    'leftKneeAngle',
    'greaterThan',
    120,
    'Squat deeper — you\'re only doing a half squat',
    'warning',
    2500
  ),

  createRule(
    'SQUAT_DEPTH_HALF_RIGHT',
    'rightKneeAngle',
    'greaterThan',
    120,
    'Squat deeper — you\'re only doing a half squat',
    'warning',
    2500
  ),

  // Insufficient depth (quarter squat)
  createRule(
    'SQUAT_DEPTH_SHALLOW',
    'leftKneeAngle',
    'greaterThan',
    140,
    'Much more depth needed — this is a quarter squat',
    'error',
    3000
  ),

  createRule(
    'SQUAT_DEPTH_SHALLOW_RIGHT',
    'rightKneeAngle',
    'greaterThan',
    140,
    'Much more depth needed — this is a quarter squat',
    'error',
    3000
  ),

  // Excessive depth (below parallel - risky without mobility)
  createRule(
    'SQUAT_DEPTH_EXCESSIVE',
    'leftKneeAngle',
    'lessThan',
    55,
    'Very deep squat — ensure proper mobility to avoid injury',
    'info',
    4000
  ),
];

/**
 * Knee Lockout Rules
 * Target: Avoid fully locked knees (angle > 170°)
 */
export const KNEE_LOCKOUT_RULES: CoachingRule[] = [
  createRule(
    'KNEE_LOCKOUT_LEFT',
    'leftKneeAngle',
    'greaterThan',
    168,
    'Maintain a slight bend — avoid locking out your knees',
    'warning',
    2500
  ),

  createRule(
    'KNEE_LOCKOUT_RIGHT',
    'rightKneeAngle',
    'greaterThan',
    168,
    'Maintain a slight bend — avoid locking out your knees',
    'warning',
    2500
  ),
];

/**
 * Hip Hinge Rules
 * Target: Proper hip flexion during squat
 */
export const HIP_HINGE_RULES: CoachingRule[] = [
  // Hip angle too upright (not hinging)
  createRule(
    'HIP_HINGE_POOR',
    'leftHipAngle',
    'greaterThan',
    155,
    'Push your hips back more — initiate the squat from the hips',
    'warning',
    2500
  ),

  // Excessive forward lean (hip angle too acute)
  createRule(
    'HIP_FORWARD_LEAN',
    'leftHipAngle',
    'lessThan',
    60,
    'Excessive forward lean — keep your chest up',
    'error',
    3000
  ),

  // Moderate forward lean
  createRule(
    'HIP_MODERATE_LEAN',
    'leftHipAngle',
    'lessThan',
    80,
    'Chest up — you\'re leaning forward too much',
    'warning',
    3000
  ),
];

/**
 * Torso Alignment Rules
 * Target: Maintain upright torso
 */
export const TORSO_ALIGNMENT_RULES: CoachingRule[] = [
  // Torso collapsing forward
  createRule(
    'TORSO_COLLAPSE',
    'leftShoulderAngle',
    'lessThan',
    45,
    'Keep your chest upright — torso is collapsing',
    'error',
    2000
  ),

  // Slight torso lean
  createRule(
    'TORSO_LEAN',
    'leftShoulderAngle',
    'lessThan',
    55,
    'Engage your core to keep your torso more upright',
    'warning',
    2500
  ),
];

/**
 * Asymmetry Detection Rules
 * Detect significant left/right imbalances
 */
export const ASYMMETRY_RULES: CoachingRule[] = [];
// Note: Asymmetry checks require comparing L vs R in same frame,
// which the current rule engine doesn't support directly.
// The scoring system handles this through the balance metric.

/**
 * All fitness rules combined
 */
export const FITNESS_RULES: CoachingRule[] = [
  ...SQUAT_DEPTH_RULES,
  ...KNEE_LOCKOUT_RULES,
  ...HIP_HINGE_RULES,
  ...TORSO_ALIGNMENT_RULES,
  ...ASYMMETRY_RULES,
];

/**
 * Get rules for specific fitness exercise
 */
export function getFitnessRules(exercise: 'squat' | 'deadlift' | 'lunge'): CoachingRule[] {
  switch (exercise) {
    case 'squat':
      return FITNESS_RULES;

    case 'deadlift':
      // TODO: Add deadlift-specific rules
      return [];

    case 'lunge':
      // TODO: Add lunge-specific rules
      return [];

    default:
      return FITNESS_RULES;
  }
}
