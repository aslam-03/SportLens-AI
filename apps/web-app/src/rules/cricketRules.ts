import { CoachingRule, createRule } from './ruleEngine';

/**
 * Cricket bowling coaching rules
 * Based on MCC (Marylebone Cricket Club) and ICC regulations
 */

/**
 * Elbow Angle Rules
 * Target: Elbow should be 140-180° at point of release
 * Below 140° indicates elbow drop (illegal bowling action)
 */
export const ELBOW_RULES: CoachingRule[] = [
  // Elbow drop (potential illegal action)
  createRule(
    'ELBOW_DROP_LEFT',
    'leftElbowAngle',
    'lessThan',
    140,
    'Straighten your bowling arm - elbow is dropping',
    'error',
    2000
  ),
  
  createRule(
    'ELBOW_DROP_RIGHT',
    'rightElbowAngle',
    'lessThan',
    140,
    'Straighten your bowling arm - elbow is dropping',
    'error',
    2000
  ),

  // Elbow bent during delivery (flexion > 15° tolerance)
  createRule(
    'ELBOW_BENT_DELIVERY',
    'rightElbowAngle',
    'lessThan',
    165,
    'Keep your arm straighter during delivery',
    'warning',
    3000
  ),
];

/**
 * Shoulder Alignment Rules
 * Target: Shoulders should rotate properly (shoulder angle 140-180°)
 */
export const SHOULDER_ALIGNMENT_RULES: CoachingRule[] = [
  // Poor shoulder rotation (shoulders too closed)
  createRule(
    'SHOULDER_CLOSED',
    'rightShoulderAngle',
    'lessThan',
    120,
    'Open your shoulders more during delivery',
    'warning',
    3000
  ),

  // Excessive shoulder pull (over-rotation)
  createRule(
    'SHOULDER_OVER_ROTATE',
    'leftShoulderAngle',
    'greaterThan',
    160,
    'Control your shoulder rotation',
    'info',
    4000
  ),
];

/**
 * Hip Alignment Rules  
 * Target: Hip rotation should be coordinated (hip angle stability)
 */
export const HIP_ALIGNMENT_RULES: CoachingRule[] = [
  // Hips not opening enough
  createRule(
    'HIP_CLOSED',
    'rightHipAngle',
    'greaterThan',
    160,
    'Rotate your hips more through delivery',
    'warning',
    3000
  ),

  // Excessive side collapse
  createRule(
    'HIP_COLLAPSE',
    'leftHipAngle',
    'lessThan',
    110,
    'Maintain hip stability - avoid collapsing',
    'warning',
    2500
  ),
];

/**
 * Knee Position Rules
 * Target: Front knee should flex properly (angle 120-150°)
 */
export const KNEE_POSITION_RULES: CoachingRule[] = [
  // Front knee too straight (lack of flexion)
  createRule(
    'KNEE_TOO_STRAIGHT',
    'leftKneeAngle',
    'greaterThan',
    160,
    'Bend your front knee more for stability',
    'info',
    3500
  ),

  // Front knee collapsing (too much flexion)
  createRule(
    'KNEE_COLLAPSE',
    'leftKneeAngle',
    'lessThan',
    100,
    'Don\'t let your front knee collapse',
    'warning',
    3000
  ),
];

/**
 * Torso Lean Rules
 * Target: Avoid excessive side lean (shoulder angle should be balanced)
 */
export const TORSO_LEAN_RULES: CoachingRule[] = [
  // Excessive side lean (unbalanced action)
  createRule(
    'TORSO_SIDE_LEAN',
    'leftShoulderAngle',
    'lessThan',
    50,
    'Reduce side lean - keep body more upright',
    'warning',
    3000
  ),

  // Falling away (loss of balance)
  createRule(
    'BALANCE_LOSS',
    'rightShoulderAngle',
    'greaterThan',
    170,
    'Maintain your balance through delivery',
    'warning',
    2500
  ),
];

/**
 * All cricket bowling rules combined
 */
export const CRICKET_BOWLING_RULES: CoachingRule[] = [
  ...ELBOW_RULES,
  ...SHOULDER_ALIGNMENT_RULES,
  ...HIP_ALIGNMENT_RULES,
  ...KNEE_POSITION_RULES,
  ...TORSO_LEAN_RULES,
];

/**
 * Get rules for specific cricket skill
 */
export function getCricketRules(skill: 'bowling' | 'batting' | 'fielding'): CoachingRule[] {
  switch (skill) {
    case 'bowling':
      return CRICKET_BOWLING_RULES;
    
    case 'batting':
      // TODO: Add batting-specific rules (stance, backlift, follow-through)
      return [];
    
    case 'fielding':
      // TODO: Add fielding-specific rules (catching position, throwing)
      return [];
    
    default:
      return CRICKET_BOWLING_RULES;
  }
}

/**
 * Get rules for specific bowling type
 */
export function getBowlingRules(type: 'fast' | 'spin'): CoachingRule[] {
  if (type === 'fast') {
    // Fast bowlers need stricter elbow rules
    return CRICKET_BOWLING_RULES;
  } else {
    // Spinners have different requirements (more wrist action)
    return CRICKET_BOWLING_RULES.filter(r => !r.id.includes('ELBOW'));
  }
}
