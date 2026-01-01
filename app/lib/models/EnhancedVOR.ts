/**
 * Enhanced VOR model interfaces for unified VOR calculations.
 * Combines base VOR with risk adjustments, schedule adjustments,
 * and scarcity premiums for comprehensive player valuation.
 */

import { Position, IPlayerExtended } from './Player';

/**
 * Urgency level for player recommendations.
 * Indicates how urgently a player should be drafted.
 */
export type Urgency = 'must-draft' | 'high' | 'medium' | 'low';

/**
 * Value indicator for player recommendations.
 * Indicates the relative value of a player compared to their ADP.
 */
export type ValueIndicator = 'steal' | 'good-value' | 'fair' | 'reach' | 'avoid';

/**
 * Complete VOR breakdown for a player.
 * Contains base values, all adjustments, and final enhanced VOR.
 */
export interface IEnhancedVOR {
  /** Unique player identifier */
  playerId: string;
  /** Player's display name */
  playerName: string;
  /** Player's position */
  position: Position;

  // Base values
  /** Base VOR before any adjustments */
  baseVOR: number;
  /** Season forecast in fantasy points */
  forecast: number;

  // Adjustments
  /** Risk adjustment from Phase 1 (negative = higher risk) */
  riskAdjustment: number;
  /** Schedule adjustment from Phase 2 */
  scheduleAdjustment: number;
  /** Scarcity premium from Phase 3 */
  scarcityPremium: number;

  // Final value
  /** Final enhanced VOR after all adjustments */
  enhancedVOR: number;

  // Rankings
  /** Overall rank among all players */
  overallRank: number;
  /** Rank within position group */
  positionRank: number;
  /** Your rank - ADP rank (positive = value, negative = reach) */
  adpDiff: number;
}

/**
 * Player recommendation with enhanced VOR analysis.
 * Provides actionable draft advice with reasoning.
 */
export interface IPlayerRecommendation {
  /** The player being recommended */
  player: IPlayerExtended;
  /** Enhanced VOR breakdown for the player */
  enhancedVOR: IEnhancedVOR;
  /** Reasons for the recommendation */
  reasons: string[];
  /** How urgently the player should be drafted */
  urgency: Urgency;
  /** Relative value compared to ADP */
  valueIndicator: ValueIndicator;
}

/**
 * Settings for generating player recommendations.
 * Configures thresholds for urgency and value indicators.
 */
export interface IRecommendationSettings {
  /** Number of top players to recommend */
  topNPlayers: number;
  /** ADP difference threshold to classify as "steal" */
  adpValueThreshold: number;
  /** Thresholds for urgency classification based on enhanced VOR */
  urgencyThresholds: {
    /** Enhanced VOR threshold for "must-draft" urgency */
    mustDraft: number;
    /** Enhanced VOR threshold for "high" urgency */
    high: number;
    /** Enhanced VOR threshold for "medium" urgency */
    medium: number;
  };
}

/**
 * Default recommendation settings.
 * - topNPlayers: 5 recommendations
 * - adpValueThreshold: 15 picks difference for "steal"
 * - urgencyThresholds: 30/20/10 for must-draft/high/medium
 */
export const DEFAULT_RECOMMENDATION_SETTINGS: IRecommendationSettings = {
  topNPlayers: 5,
  adpValueThreshold: 15,
  urgencyThresholds: { mustDraft: 30, high: 20, medium: 10 },
};

/** Valid urgency values for type guard validation */
const VALID_URGENCY_VALUES: Urgency[] = ['must-draft', 'high', 'medium', 'low'];

/** Valid value indicator values for type guard validation */
const VALID_VALUE_INDICATORS: ValueIndicator[] = [
  'steal',
  'good-value',
  'fair',
  'reach',
  'avoid',
];

/**
 * Type guard function to validate if an object is a valid IEnhancedVOR.
 * Checks for presence of all required properties and validates their types.
 *
 * @param obj - The object to validate
 * @returns true if the object is a valid IEnhancedVOR, false otherwise
 */
export function isValidEnhancedVOR(obj: unknown): obj is IEnhancedVOR {
  // Check for null/undefined
  if (obj === null || obj === undefined) {
    return false;
  }

  // Check if it's an object (and not an array)
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  const vor = obj as Record<string, unknown>;

  // Check string properties exist and are strings
  const stringProps = ['playerId', 'playerName', 'position'];
  for (const prop of stringProps) {
    if (!(prop in vor) || typeof vor[prop] !== 'string') {
      return false;
    }
  }

  // Check numeric properties exist and are numbers
  const numericProps = [
    'baseVOR',
    'forecast',
    'riskAdjustment',
    'scheduleAdjustment',
    'scarcityPremium',
    'enhancedVOR',
    'overallRank',
    'positionRank',
    'adpDiff',
  ];

  for (const prop of numericProps) {
    if (!(prop in vor) || typeof vor[prop] !== 'number') {
      return false;
    }
  }

  return true;
}

/**
 * Type guard function to validate if an object is a valid IPlayerRecommendation.
 * Checks for presence of all required properties and validates their types.
 *
 * @param obj - The object to validate
 * @returns true if the object is a valid IPlayerRecommendation, false otherwise
 */
export function isValidRecommendation(obj: unknown): obj is IPlayerRecommendation {
  // Check for null/undefined
  if (obj === null || obj === undefined) {
    return false;
  }

  // Check if it's an object (and not an array)
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  const rec = obj as Record<string, unknown>;

  // Check player exists and is an object
  if (!('player' in rec) || typeof rec.player !== 'object' || rec.player === null) {
    return false;
  }

  // Check enhancedVOR exists and is an object
  if (
    !('enhancedVOR' in rec) ||
    typeof rec.enhancedVOR !== 'object' ||
    rec.enhancedVOR === null
  ) {
    return false;
  }

  // Check reasons exists and is an array
  if (!('reasons' in rec) || !Array.isArray(rec.reasons)) {
    return false;
  }

  // Check urgency exists and is a valid value
  if (!('urgency' in rec) || typeof rec.urgency !== 'string') {
    return false;
  }
  if (!VALID_URGENCY_VALUES.includes(rec.urgency as Urgency)) {
    return false;
  }

  // Check valueIndicator exists and is a valid value
  if (!('valueIndicator' in rec) || typeof rec.valueIndicator !== 'string') {
    return false;
  }
  if (!VALID_VALUE_INDICATORS.includes(rec.valueIndicator as ValueIndicator)) {
    return false;
  }

  return true;
}
