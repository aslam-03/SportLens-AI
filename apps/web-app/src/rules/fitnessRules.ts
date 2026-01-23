import { CoachingRule, createRule, createRangeRule } from './ruleEngine';

/**
 * Fitness coaching rules for squat analysis
 * Based on biomechanical best practices
 */

/**
 * Squat Depth Rules
 * Target: Knee angle should be 70-100° at bottom of squat
 */
export const SQUAT_DEPTH_RULES: CoachingRule[] = [
  // Insufficient depth (too shallow)
  createRule(
    'SQUAT_DEPTH_SHALLOW',
    'leftKneeAngle',
    'greaterThan',
    110,
    'Go lower for proper squat depth',
    'warning',
    3000
  ),
  
  createRule(
    'SQUAT_DEPTH_SHALLOW_RIGHT',
    'rightKneeAngle',
    'greaterThan',
    110,
    'Go lower for proper squat depth',
    'warning',
    3000
  ),

  // Excessive depth (below parallel - advanced)
  createRule(
    'SQUAT_DEPTH_EXCESSIVE',
    'leftKneeAngle',
    'lessThan',
    50,
    'You\'re going too deep - maintain control',
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
    170,
    'Avoid locking your knees completely',
    'warning',
    3000
  ),
  
  createRule(
    'KNEE_LOCKOUT_RIGHT',
    'rightKneeAngle',
    'greaterThan',
    170,
    'Avoid locking your knees completely',
    'warning',
    3000
  ),
];

/**
 * Hip Hinge Rules
 * Target: Proper hip flexion (hip angle should decrease during squat)
 */
export const HIP_HINGE_RULES: CoachingRule[] = [
  // Hip angle too upright (not hinging)
  createRule(
    'HIP_HINGE_POOR',
    'leftHipAngle',
    'greaterThan',
    160,
    'Bend at your hips more - push hips back',
    'warning',
    3000
  ),

  // Excessive forward lean (hip angle too acute)
  createRule(
    'HIP_FORWARD_LEAN',
    'leftHipAngle',
    'lessThan',
    100,
    'Chest up - avoid excessive forward lean',
    'warning',
    3000
  ),
];

/**
 * Torso Alignment Rules
 * Target: Maintain upright torso (shoulder angle stability)
 */
export const TORSO_ALIGNMENT_RULES: CoachingRule[] = [
  // Torso collapsing forward (shoulder angle too acute)
  createRule(
    'TORSO_COLLAPSE',
    'leftShoulderAngle',
    'lessThan',
    50,
    'Keep your chest upright',
    'warning',
    2500
  ),
];

/**
 * Asymmetry Detection Rules
 * Target: Detect left/right imbalances
 * Note: This requires custom logic - placeholder for now
 */

/**
 * All fitness rules combined
 */
export const FITNESS_RULES: CoachingRule[] = [
  ...SQUAT_DEPTH_RULES,
  ...KNEE_LOCKOUT_RULES,
  ...HIP_HINGE_RULES,
  ...TORSO_ALIGNMENT_RULES,
];

/**
 * Get rules for specific fitness exercise
 */
export function getFitnessRules(exercise: 'squat' | 'deadlift' | 'lunge'): CoachingRule[] {
  switch (exercise) {
    case 'squat':
      return FITNESS_RULES; // All current rules are squat-focused
    
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
