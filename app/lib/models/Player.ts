import { IScoring } from './Scoring';
import { IInjuryHistory, IRiskProfile } from './Risk';

/**
 * Roster positions.
 * Flex encompasses multiple other positions. ? is an unknown position
 * for an empty position on the Bench
 */
export type Position =
  | 'QB'
  | 'RB'
  | 'WR'
  | 'FLEX'
  | 'SUPERFLEX'
  | 'TE'
  | 'DST'
  | 'K'
  | 'BENCH'
  | '?';

/** Map between wildcard positions and all the other positions they could be */
export const wildCardPositions: { [key: string]: Set<string> } = {
  QB: new Set([]),
  RB: new Set([]),
  WR: new Set([]),
  FLEX: new Set(['WR', 'RB', 'TE']),
  SUPERFLEX: new Set(['QB', 'WR', 'RB', 'TE']),
  TE: new Set([]),
  DST: new Set([]),
  K: new Set([]),
  BENCH: new Set([]),
  '?': new Set([]),
};

/** Positions to show in the TeamPicks component */
export const StarterPositions: Position[] = [
  'QB',
  'RB',
  'WR',
  'FLEX',
  'SUPERFLEX',
  'TE',
  'DST',
  'K',
];

/** Positions assigned to players */
export const DraftablePositions: Position[] = [
  'QB',
  'RB',
  'WR',
  'TE',
  'DST',
  'K',
];

/**
 * A single player. Extends the scoring metrics from IScoring. All optional
 * parameters are set client-side and are based on roster and league scoring
 * settings.
 */
export interface IPlayer extends IScoring {
  index: number;
  key: string;
  name: string;
  pos: Position;
  team: string;
  bye: number;

  /**
   * average draft position
   */
  std: number;
  halfPpr: number;
  ppr: number;

  /**
   * forecasted number of points. Multiple each of the player's
   * stats by the number of points assigned to each
   */
  forecast?: number;

  /**
   * Player's value over other players in the same position
   *
   * Is a function of the number of teams and number of players
   * in that position drafted within the first 10 rounds
   */
  vor?: number;

  /**
   * First initial and last name of each player. Not set on initial
   * load (with forecast payload), but is computed once
   *
   * Used because (based on Reddit feedback) it makes it easier to
   * draft players
   */
  tableName?: string;
  href?: string;
}

/**
 * Advanced stats for player evaluation.
 * These metrics provide deeper insight into player performance
 * beyond basic stats.
 */
export interface IPlayerAdvanced {
  /** WR/TE target percentage */
  targetShare?: number;
  /** Total air yards */
  airYards?: number;
  /** Red zone opportunities */
  redZoneTargets?: number;
  /** Snap count percentage */
  snapPct?: number;
  /** WR/TE efficiency */
  yardsPerRouteRun?: number;
  /** RB talent metric */
  yardsAfterContact?: number;
  /** QB pressure rate */
  pressureRate?: number;
  /** O-line quality */
  passBlockWinRate?: number;
}

/**
 * Risk-related data for a player.
 * Used in advanced VOR calculations.
 */
export interface IPlayerRisk {
  /** Player age */
  age: number;
  /** Historical injury data */
  injuryHistory: IInjuryHistory;
  /** Calculated risk profile - may not exist until calculated */
  riskProfile?: IRiskProfile;
  /** Historical weekly scores for consistency calculation */
  weeklyScores?: number[];
}

/**
 * Extended player interface with advanced stats and risk data.
 * Extends the base IPlayer with optional advanced analytics.
 */
export interface IPlayerExtended extends IPlayer {
  /** Advanced performance metrics */
  advanced?: IPlayerAdvanced;
  /** Risk and consistency data */
  risk?: IPlayerRisk;
  /** Risk-adjusted VOR value */
  adjustedVOR?: number;
}

/**
 * Type guard to check if a player has advanced stats data.
 * @param player - The player to check
 * @returns true if the player has advanced stats, false otherwise
 */
export function hasAdvancedStats(player: IPlayerExtended): boolean {
  return player.advanced !== undefined;
}

/**
 * Type guard to check if a player has a calculated risk profile.
 * @param player - The player to check
 * @returns true if the player has a risk profile, false otherwise
 */
export function hasRiskProfile(player: IPlayerExtended): boolean {
  return player.risk?.riskProfile !== undefined;
}
