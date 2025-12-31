/**
 * Scarcity model interfaces for dynamic draft tracking.
 * These interfaces support position scarcity analysis, tier-based value adjustments,
 * and drop-off alerts for fantasy football draft decision-making.
 */

import { Position } from './Player';

/**
 * Position supply tracking interface.
 * Tracks the availability of players at each position during the draft.
 */
export interface IPositionSupply {
  /** The position being tracked */
  position: Position;
  /** Total number of players at this position in the player pool */
  totalPlayers: number;
  /** Number of players already drafted */
  draftedCount: number;
  /** Number of players remaining (totalPlayers - draftedCount) */
  remainingCount: number;
  /** Tier 1 (elite players) remaining */
  tier1Remaining: number;
  /** Tier 2 (good starters) remaining */
  tier2Remaining: number;
  /** Tier 3 (flex/bench) remaining */
  tier3Remaining: number;
}

/**
 * Scarcity severity levels indicating how scarce a position has become.
 * Used to determine premium adjustments to VOR values.
 */
export type ScarcitySeverity = 'none' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Scarcity premium interface.
 * Represents the additional VOR points to add for a position due to scarcity.
 */
export interface IScarcityPremium {
  /** The position receiving the premium */
  position: Position;
  /** VOR points to add to players at this position */
  premium: number;
  /** Current scarcity severity level */
  severity: ScarcitySeverity;
  /** Optional message explaining the premium */
  message?: string;
}

/**
 * Alert severity levels for drop-off notifications.
 */
export type AlertSeverity = 'warning' | 'critical';

/**
 * Drop-off alert interface.
 * Represents an alert when there's a significant value drop-off approaching.
 */
export interface IDropOffAlert {
  /** The position with the upcoming drop-off */
  position: Position;
  /** Average VOR of players in the current tier */
  currentTierAvgVOR: number;
  /** Average VOR of players in the next tier */
  nextTierAvgVOR: number;
  /** Point difference between tiers (currentTierAvgVOR - nextTierAvgVOR) */
  dropOffPoints: number;
  /** Estimated number of picks until the drop-off occurs */
  picksUntilDrop: number;
  /** Alert severity level */
  severity: AlertSeverity;
}

/**
 * Scarcity settings configuration.
 * Configures how scarcity is calculated and premiums are applied.
 */
export interface IScarcitySettings {
  /** VOR thresholds for tier classification */
  tierThresholds: {
    /** Minimum VOR for Tier 1 (elite) players */
    tier1: number;
    /** Minimum VOR for Tier 2 (good starter) players */
    tier2: number;
  };
  /** Multipliers for calculating scarcity premiums at each severity level */
  premiumMultipliers: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  /** VOR point difference threshold to trigger drop-off alerts */
  dropOffThreshold: number;
  /** Position-specific weight modifiers for scarcity calculations */
  positionWeights: Partial<Record<Position, number>>;
}

/**
 * Complete draft scarcity state.
 * Represents the current scarcity situation during a draft.
 */
export interface IDraftScarcityState {
  /** Current pick number in the draft */
  currentPick: number;
  /** Supply information for each position */
  positionSupply: Partial<Record<Position, IPositionSupply>>;
  /** Active scarcity premiums for each position */
  scarcityPremiums: IScarcityPremium[];
  /** Currently active drop-off alerts */
  activeAlerts: IDropOffAlert[];
}

/**
 * Default scarcity settings with balanced values.
 * - tierThresholds: VOR >= 50 for elite, >= 25 for good starters
 * - premiumMultipliers: Progressive increases from 1.5x to 8x
 * - dropOffThreshold: Alert when tier gap is >= 25 VOR points
 * - positionWeights: RB weighted highest (1.2) due to typical scarcity,
 *   K/DST weighted lowest (0.3) as they're typically interchangeable
 */
export const DEFAULT_SCARCITY_SETTINGS: IScarcitySettings = {
  tierThresholds: {
    tier1: 50,
    tier2: 25,
  },
  premiumMultipliers: {
    low: 1.5,
    medium: 3,
    high: 5,
    critical: 8,
  },
  dropOffThreshold: 25,
  positionWeights: {
    QB: 0.8,
    RB: 1.2,
    WR: 1.0,
    TE: 1.1,
    K: 0.3,
    DST: 0.3,
  },
};

/**
 * Type guard function to validate if an object is a valid IDraftScarcityState.
 * Checks for presence of all required properties and validates their types.
 *
 * @param obj - The object to validate
 * @returns true if the object is a valid IDraftScarcityState, false otherwise
 */
export function isValidScarcityState(obj: unknown): obj is IDraftScarcityState {
  // Check for null/undefined
  if (obj === null || obj === undefined) {
    return false;
  }

  // Check if it's an object (and not an array)
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  const state = obj as Record<string, unknown>;

  // Check currentPick exists and is a non-negative number
  if (!('currentPick' in state) || typeof state.currentPick !== 'number') {
    return false;
  }
  if (state.currentPick < 0) {
    return false;
  }

  // Check positionSupply exists and is an object (not an array)
  if (!('positionSupply' in state)) {
    return false;
  }
  if (
    typeof state.positionSupply !== 'object' ||
    state.positionSupply === null ||
    Array.isArray(state.positionSupply)
  ) {
    return false;
  }

  // Check scarcityPremiums exists and is an array
  if (!('scarcityPremiums' in state) || !Array.isArray(state.scarcityPremiums)) {
    return false;
  }

  // Check activeAlerts exists and is an array
  if (!('activeAlerts' in state) || !Array.isArray(state.activeAlerts)) {
    return false;
  }

  return true;
}
