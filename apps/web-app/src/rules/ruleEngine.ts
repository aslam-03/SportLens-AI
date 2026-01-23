import { BiomechanicsFrame } from '../Biomechanics/angleCalculator';

/**
 * Severity levels for coaching feedback
 */
export type RuleSeverity = 'info' | 'warning' | 'error';

/**
 * Rule condition operators for cleaner rule definitions
 */
export type RuleOperator = 'lessThan' | 'greaterThan' | 'between' | 'notBetween';

/**
 * A coaching rule definition
 */
export interface CoachingRule {
  id: string;
  name: string;
  description: string;
  severity: RuleSeverity;
  
  // Which angle to check (key from BiomechanicsFrame)
  joint: keyof Omit<BiomechanicsFrame, 'frameTimestamp'>;
  
  // Condition to evaluate
  operator: RuleOperator;
  threshold: number;      // For lessThan/greaterThan
  min?: number;           // For between/notBetween
  max?: number;           // For between/notBetween
  
  // Feedback to display when rule is violated
  message: string;
  
  // Cooldown in milliseconds (prevents spam)
  cooldownMs?: number;
}

/**
 * A rule violation instance
 */
export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  severity: RuleSeverity;
  message: string;
  timestamp: number;
  jointName: string;
  actualValue: number | null;
}

/**
 * Configuration for the rule engine
 */
export interface RuleEngineConfig {
  defaultCooldownMs: number;
  maxActiveViolations: number;
}

/**
 * Rule-based error detection engine
 * Evaluates biomechanics data against coaching rules
 */
export class RuleEngine {
  private rules: CoachingRule[] = [];
  private lastViolations: Map<string, number> = new Map();
  private config: RuleEngineConfig;

  constructor(config?: Partial<RuleEngineConfig>) {
    this.config = {
      defaultCooldownMs: 2000, // 2 seconds default cooldown
      maxActiveViolations: 3,   // Show max 3 feedback messages at once
      ...config,
    };
  }

  /**
   * Register a coaching rule
   */
  addRule(rule: CoachingRule): void {
    this.rules.push(rule);
  }

  /**
   * Register multiple coaching rules
   */
  addRules(rules: CoachingRule[]): void {
    this.rules.push(...rules);
  }

  /**
   * Clear all registered rules
   */
  clearRules(): void {
    this.rules = [];
    this.lastViolations.clear();
  }

  /**
   * Evaluate a single rule against biomechanics data
   */
  private evaluateRule(rule: CoachingRule, frame: BiomechanicsFrame): boolean {
    const value = frame[rule.joint];
    
    // Skip if value is null (landmark not visible)
    if (value === null) {
      return false;
    }

    switch (rule.operator) {
      case 'lessThan':
        return value < rule.threshold;
      
      case 'greaterThan':
        return value > rule.threshold;
      
      case 'between':
        if (rule.min === undefined || rule.max === undefined) {
          console.error(`Rule ${rule.id}: 'between' requires min and max`);
          return false;
        }
        return value >= rule.min && value <= rule.max;
      
      case 'notBetween':
        if (rule.min === undefined || rule.max === undefined) {
          console.error(`Rule ${rule.id}: 'notBetween' requires min and max`);
          return false;
        }
        return value < rule.min || value > rule.max;
      
      default:
        console.error(`Rule ${rule.id}: Unknown operator ${rule.operator}`);
        return false;
    }
  }

  /**
   * Check if a rule is on cooldown (prevents spam)
   */
  private isOnCooldown(ruleId: string, currentTime: number): boolean {
    const lastViolationTime = this.lastViolations.get(ruleId);
    if (!lastViolationTime) {
      return false;
    }

    const cooldown = this.rules.find(r => r.id === ruleId)?.cooldownMs ?? this.config.defaultCooldownMs;
    return currentTime - lastViolationTime < cooldown;
  }

  /**
   * Evaluate all rules against current biomechanics frame
   * Returns active violations (respecting cooldowns)
   */
  evaluate(frame: BiomechanicsFrame): RuleViolation[] {
    const currentTime = Date.now();
    const violations: RuleViolation[] = [];

    for (const rule of this.rules) {
      // Check if rule condition is violated
      if (!this.evaluateRule(rule, frame)) {
        continue;
      }

      // Check cooldown to prevent spam
      if (this.isOnCooldown(rule.id, currentTime)) {
        continue;
      }

      // Create violation
      const violation: RuleViolation = {
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        message: rule.message,
        timestamp: currentTime,
        jointName: rule.joint,
        actualValue: frame[rule.joint],
      };

      violations.push(violation);

      // Update last violation time
      this.lastViolations.set(rule.id, currentTime);
    }

    // Limit number of active violations (prioritize by severity)
    return this.prioritizeViolations(violations);
  }

  /**
   * Prioritize violations by severity and limit count
   */
  private prioritizeViolations(violations: RuleViolation[]): RuleViolation[] {
    // Sort by severity: error > warning > info
    const severityOrder: Record<RuleSeverity, number> = {
      error: 0,
      warning: 1,
      info: 2,
    };

    violations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Return top N violations
    return violations.slice(0, this.config.maxActiveViolations);
  }

  /**
   * Get all registered rules
   */
  getRules(): CoachingRule[] {
    return [...this.rules];
  }

  /**
   * Reset cooldown state (useful when stopping/restarting)
   */
  reset(): void {
    this.lastViolations.clear();
  }

  /**
   * Get engine configuration
   */
  getConfig(): RuleEngineConfig {
    return { ...this.config };
  }

  /**
   * Update engine configuration
   */
  updateConfig(config: Partial<RuleEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Helper function to create a simple rule
 */
export function createRule(
  id: string,
  joint: keyof Omit<BiomechanicsFrame, 'frameTimestamp'>,
  operator: RuleOperator,
  threshold: number,
  message: string,
  severity: RuleSeverity = 'warning',
  cooldownMs?: number
): CoachingRule {
  return {
    id,
    name: id.replace(/_/g, ' '),
    description: message,
    severity,
    joint,
    operator,
    threshold,
    message,
    cooldownMs,
  };
}

/**
 * Helper function to create a range rule (between/notBetween)
 */
export function createRangeRule(
  id: string,
  joint: keyof Omit<BiomechanicsFrame, 'frameTimestamp'>,
  operator: 'between' | 'notBetween',
  min: number,
  max: number,
  message: string,
  severity: RuleSeverity = 'warning',
  cooldownMs?: number
): CoachingRule {
  return {
    id,
    name: id.replace(/_/g, ' '),
    description: message,
    severity,
    joint,
    operator,
    threshold: 0, // Not used for range operators
    min,
    max,
    message,
    cooldownMs,
  };
}
