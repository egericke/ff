/**
 * Risk and consistency model interfaces for advanced VOR calculations.
 * These interfaces support injury risk assessment, age-based decline modeling,
 * and consistency scoring for fantasy football player evaluation.
 */

/**
 * Health status values representing a player's current injury status.
 */
export type HealthStatus =
  | 'healthy'
  | 'questionable'
  | 'doubtful'
  | 'out'
  | 'ir';

/**
 * Injury history tracking for a player over a 3-year period.
 */
export interface IInjuryHistory {
  /** Games played in each of the last 3 seasons (most recent first) */
  gamesPlayed: [number, number, number];
  /** Current health status */
  currentStatus: HealthStatus;
}

/**
 * Risk profile for a player containing injury and consistency metrics.
 */
export interface IRiskProfile {
  /** Injury risk score from 0 (low risk) to 100 (high risk) */
  injuryScore: number;
  /** Consistency score from 0 (inconsistent) to 1 (highly consistent) */
  consistencyScore: number;
  /** Floor projection - minimum expected weekly points */
  floor: number;
  /** Ceiling projection - maximum expected weekly points */
  ceiling: number;
  /** Week-to-week variance in scoring */
  weeklyVariance: number;
}

/**
 * Age thresholds by position indicating when age-related decline typically begins.
 * Players approaching or exceeding these ages carry additional risk.
 */
export interface IPositionAgeThresholds {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  K: number;
  DST: number;
}

/**
 * Base risk values by position representing inherent position-based injury risk.
 * Values from 0 (low risk) to 1 (high risk).
 */
export interface IPositionBaseRisk {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  K: number;
  DST: number;
}

/**
 * Weights for different risk factors in the overall risk calculation.
 */
export interface IRiskWeights {
  /** Weight for historical injury data */
  historical: number;
  /** Weight for age-based risk */
  age: number;
  /** Weight for position-based risk */
  position: number;
  /** Weight for current health status */
  status: number;
}

/**
 * Complete risk settings configuration for risk-adjusted VOR calculations.
 */
export interface IRiskSettings {
  /** User's risk tolerance from 0 (risk-averse) to 1 (risk-seeking), 0.5 is balanced */
  riskTolerance: number;
  /** Age thresholds for each position */
  positionAgeThresholds: IPositionAgeThresholds;
  /** Base risk values for each position */
  positionBaseRisk: IPositionBaseRisk;
  /** Weights for different risk factors */
  weights: IRiskWeights;
}

/**
 * Default balanced risk settings.
 */
export const DEFAULT_RISK_SETTINGS: IRiskSettings = {
  riskTolerance: 0.5,
  positionAgeThresholds: {
    QB: 35,
    RB: 27,
    WR: 30,
    TE: 30,
    K: 38,
    DST: 99,
  },
  positionBaseRisk: {
    QB: 0.2,
    RB: 0.7,
    WR: 0.4,
    TE: 0.5,
    K: 0.1,
    DST: 0.1,
  },
  weights: {
    historical: 0.4,
    age: 0.25,
    position: 0.2,
    status: 0.15,
  },
};

/**
 * Type guard function to validate if an object is a valid IRiskProfile.
 * Checks for presence of all required properties and validates their ranges.
 *
 * @param obj - The object to validate
 * @returns true if the object is a valid IRiskProfile, false otherwise
 */
export function isValidRiskProfile(obj: unknown): obj is IRiskProfile {
  // Check for null/undefined
  if (obj === null || obj === undefined) {
    return false;
  }

  // Check if it's an object (and not an array)
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  const profile = obj as Record<string, unknown>;

  // Check all required properties exist and are numbers
  const requiredProps = [
    'injuryScore',
    'consistencyScore',
    'floor',
    'ceiling',
    'weeklyVariance',
  ];

  for (const prop of requiredProps) {
    if (!(prop in profile) || typeof profile[prop] !== 'number') {
      return false;
    }
  }

  // Validate injury score range (0-100)
  const injuryScore = profile.injuryScore as number;
  if (injuryScore < 0 || injuryScore > 100) {
    return false;
  }

  // Validate consistency score range (0-1)
  const consistencyScore = profile.consistencyScore as number;
  if (consistencyScore < 0 || consistencyScore > 1) {
    return false;
  }

  // Validate floor <= ceiling
  const floor = profile.floor as number;
  const ceiling = profile.ceiling as number;
  if (floor > ceiling) {
    return false;
  }

  return true;
}
