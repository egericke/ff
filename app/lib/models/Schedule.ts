/**
 * Schedule model interfaces for Strength of Schedule (SOS) analysis.
 * These interfaces support weekly matchup ratings, defensive rankings,
 * and schedule-based scoring adjustments for fantasy football player evaluation.
 */

/**
 * Matchup difficulty rating from 1 (tough) to 5 (easy).
 * Used to rate individual weekly matchups against opposing defenses.
 */
export type MatchupRating = 1 | 2 | 3 | 4 | 5;

/**
 * Defensive rankings for a team across multiple categories.
 * Rankings are typically 1-32 where 1 is the best defense.
 */
export interface IDefenseRankings {
  /** Team abbreviation (e.g., 'KC', 'SF') */
  team: string;
  /** Overall defensive ranking (1-32) */
  overall: number;
  /** Pass defense ranking (1-32) */
  passDefense: number;
  /** Rush defense ranking (1-32) */
  rushDefense: number;
  /** Pass rush ranking (1-32) */
  passRush: number;
  /** Secondary coverage ranking (1-32) */
  secondary: number;
}

/**
 * Individual weekly matchup information for schedule analysis.
 */
export interface IWeeklyMatchup {
  /** NFL week number (1-18) */
  week: number;
  /** Opponent team abbreviation or 'BYE' for bye weeks */
  opponent: string;
  /** Whether the game is a home game */
  isHome: boolean;
  /** Matchup rating: 1-5 for regular games, 0 for bye weeks */
  rating: MatchupRating | 0;
  /** Whether this is a bye week */
  isBye: boolean;
}

/**
 * Complete schedule information for a player's team.
 */
export interface IPlayerSchedule {
  /** Array of weekly matchups for the season */
  teamSchedule: IWeeklyMatchup[];
  /** Week number of the team's bye week (1-18) */
  byeWeek: number;
  /** Overall strength of schedule (0-1, where 1 is easiest) */
  sosOverall: number;
  /** Playoff weeks strength of schedule (0-1, where 1 is easiest) */
  sosPlayoffs: number;
  /** Calculated schedule score adjustment (-15 to +15) */
  scheduleScore: number;
}

/**
 * Week period weights for SOS calculations.
 */
export interface IWeekWeights {
  /** Weight for early season weeks */
  early: number;
  /** Weight for regular season weeks */
  regular: number;
  /** Weight for playoff weeks */
  playoff: number;
}

/**
 * Complete schedule settings configuration for SOS-adjusted calculations.
 */
export interface IScheduleSettings {
  /** Weights for different parts of the season */
  weekWeights: IWeekWeights;
  /** Array of week numbers considered playoff weeks */
  playoffWeeks: number[];
  /** Array of week numbers considered early season */
  earlyWeeks: number[];
  /** Maximum schedule bonus points */
  maxScheduleBonus: number;
  /** Maximum schedule penalty points (negative value) */
  maxSchedulePenalty: number;
  /** Bye week penalties/bonuses by week number */
  byeWeekPenalties: Record<number, number>;
}

/**
 * Default balanced schedule settings.
 */
export const DEFAULT_SCHEDULE_SETTINGS: IScheduleSettings = {
  weekWeights: {
    early: 0.8,
    regular: 1.0,
    playoff: 1.5,
  },
  playoffWeeks: [14, 15, 16, 17],
  earlyWeeks: [1, 2, 3, 4],
  maxScheduleBonus: 15,
  maxSchedulePenalty: -15,
  byeWeekPenalties: {
    14: -10,
    13: -5,
    5: 2,
    6: 2,
    7: 1,
  },
};

/**
 * Type guard function to validate if an object is a valid IPlayerSchedule.
 * Checks for presence of all required properties and validates their ranges.
 *
 * @param obj - The object to validate
 * @returns true if the object is a valid IPlayerSchedule, false otherwise
 */
export function isValidSchedule(obj: unknown): obj is IPlayerSchedule {
  // Check for null/undefined
  if (obj === null || obj === undefined) {
    return false;
  }

  // Check if it's an object (and not an array)
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  const schedule = obj as Record<string, unknown>;

  // Check all required properties exist
  const requiredProps = [
    'teamSchedule',
    'byeWeek',
    'sosOverall',
    'sosPlayoffs',
    'scheduleScore',
  ];

  for (const prop of requiredProps) {
    if (!(prop in schedule)) {
      return false;
    }
  }

  // Validate teamSchedule is an array
  if (!Array.isArray(schedule.teamSchedule)) {
    return false;
  }

  // Validate byeWeek is a number in range 1-18
  const byeWeek = schedule.byeWeek;
  if (typeof byeWeek !== 'number' || byeWeek < 1 || byeWeek > 18) {
    return false;
  }

  // Validate sosOverall is a number in range 0-1
  const sosOverall = schedule.sosOverall;
  if (typeof sosOverall !== 'number' || sosOverall < 0 || sosOverall > 1) {
    return false;
  }

  // Validate sosPlayoffs is a number in range 0-1
  const sosPlayoffs = schedule.sosPlayoffs;
  if (typeof sosPlayoffs !== 'number' || sosPlayoffs < 0 || sosPlayoffs > 1) {
    return false;
  }

  // Validate scheduleScore is a number in range -15 to 15
  const scheduleScore = schedule.scheduleScore;
  if (
    typeof scheduleScore !== 'number' ||
    scheduleScore < -15 ||
    scheduleScore > 15
  ) {
    return false;
  }

  return true;
}
