/**
 * Schedule strength calculator engine functions.
 * Provides calculations for matchup ratings, week weights,
 * schedule scores, and strength of schedule (SOS) metrics.
 */

import {
  MatchupRating,
  IDefenseRankings,
  IWeeklyMatchup,
  IScheduleSettings,
} from '../models/Schedule';
import { Position } from '../models/Player';

/**
 * Converts a defensive rank (1-32) to a matchup rating (1-5).
 * Lower ranks (better defenses) result in lower ratings (tougher matchups).
 *
 * @param rank - The defensive rank from 1 (best) to 32 (worst)
 * @returns The matchup rating from 1 (tough) to 5 (easy)
 */
function rankToRating(rank: number): MatchupRating {
  if (rank <= 6) return 1;
  if (rank <= 12) return 2;
  if (rank <= 19) return 3;
  if (rank <= 26) return 4;
  return 5;
}

/**
 * Calculates the matchup rating for a position against a defense.
 *
 * Position-specific logic:
 * - QB: average of passRush + secondary
 * - RB: use rushDefense
 * - WR/TE: use secondary
 * - K: use overall
 * - DST: invert overall (33 - overall) - easy matchup against bad offense
 *
 * @param position - The player's position
 * @param defense - The opponent's defensive rankings
 * @returns The matchup rating from 1 (tough) to 5 (easy)
 */
export function calculateMatchupRating(
  position: Position,
  defense: IDefenseRankings
): MatchupRating {
  let relevantRank: number;

  switch (position) {
    case 'QB':
      // QB success depends on both pass rush and secondary coverage
      relevantRank = (defense.passRush + defense.secondary) / 2;
      break;
    case 'RB':
      relevantRank = defense.rushDefense;
      break;
    case 'WR':
    case 'TE':
      relevantRank = defense.secondary;
      break;
    case 'K':
      relevantRank = defense.overall;
      break;
    case 'DST':
      // For DST, playing against a good defense (low rank) means their offense
      // is likely good too, so invert: 33 - overall gives higher rank for better defenses
      relevantRank = 33 - defense.overall;
      break;
    default:
      // For other positions (FLEX, SUPERFLEX, BENCH, ?), use overall
      relevantRank = defense.overall;
  }

  return rankToRating(relevantRank);
}

/**
 * Calculates the weight for a specific week based on settings.
 *
 * Week periods:
 * - Early weeks (1-4): 0.8 (default)
 * - Regular weeks (5-13): 1.0 (default)
 * - Playoff weeks (14-17): 1.5 (default)
 *
 * @param week - The NFL week number (1-18)
 * @param settings - The schedule settings containing week classifications
 * @returns The weight multiplier for the week
 */
export function calculateWeekWeight(
  week: number,
  settings: IScheduleSettings
): number {
  if (settings.earlyWeeks.includes(week)) {
    return settings.weekWeights.early;
  }

  if (settings.playoffWeeks.includes(week)) {
    return settings.weekWeights.playoff;
  }

  return settings.weekWeights.regular;
}

/**
 * Calculates the overall schedule score for a player's matchups.
 *
 * Formula:
 * - Weighted average of (rating - 3) * weekWeight for non-bye matchups
 * - Scale to -15 to +15 range
 * - Apply bye week penalties from settings
 * - Clamp to range
 *
 * @param matchups - Array of weekly matchups for the season
 * @param byeWeek - The bye week number
 * @param settings - The schedule settings
 * @returns The schedule score from -15 to +15
 */
export function calculateScheduleScore(
  matchups: IWeeklyMatchup[],
  byeWeek: number,
  settings: IScheduleSettings
): number {
  // Filter out bye weeks for the weighted average calculation
  const nonByeMatchups = matchups.filter((m) => !m.isBye);

  if (nonByeMatchups.length === 0) {
    // Handle edge case: no actual matchups
    const byePenalty = settings.byeWeekPenalties[byeWeek] ?? 0;
    return Math.max(
      settings.maxSchedulePenalty,
      Math.min(settings.maxScheduleBonus, byePenalty)
    );
  }

  // Calculate weighted sum and total weight
  let weightedSum = 0;
  let totalWeight = 0;

  for (const matchup of nonByeMatchups) {
    const weekWeight = calculateWeekWeight(matchup.week, settings);
    // rating - 3 gives us a value from -2 (tough) to +2 (easy)
    const ratingDeviation = matchup.rating - 3;
    weightedSum += ratingDeviation * weekWeight;
    totalWeight += weekWeight;
  }

  // Calculate weighted average
  const weightedAverage = weightedSum / totalWeight;

  // Scale to -15 to +15 range
  // The maximum weighted average is 2 (all rating 5) and minimum is -2 (all rating 1)
  // So we scale by multiplying by 15/2 = 7.5
  let rawScore = weightedAverage * 7.5;

  // Apply bye week penalty/bonus
  const byePenalty = settings.byeWeekPenalties[byeWeek] ?? 0;
  rawScore += byePenalty;

  // Clamp to the valid range
  return Math.max(
    settings.maxSchedulePenalty,
    Math.min(settings.maxScheduleBonus, rawScore)
  );
}

/**
 * Calculates the Strength of Schedule (SOS) metric.
 *
 * Formula:
 * - Calculate average of ratings for non-bye matchups
 * - Convert to 0-1 scale: 1 - (avgRating - 1) / 4
 *
 * The result is inverted so that:
 * - Lower SOS values (close to 0) = harder schedule
 * - Higher SOS values (close to 1) = easier schedule
 *
 * @param matchups - Array of weekly matchups for the season
 * @returns The SOS value from 0 to 1 (1 = easiest)
 */
export function calculateSOS(matchups: IWeeklyMatchup[]): number {
  // Filter out bye weeks
  const nonByeMatchups = matchups.filter((m) => !m.isBye);

  if (nonByeMatchups.length === 0) {
    // No matchups to analyze, return neutral value
    return 0.5;
  }

  // Calculate average rating
  const totalRating = nonByeMatchups.reduce((sum, m) => sum + m.rating, 0);
  const avgRating = totalRating / nonByeMatchups.length;

  // Convert to 0-1 scale
  // avgRating ranges from 1 to 5
  // Formula: 1 - (avgRating - 1) / 4
  // When avgRating = 1: SOS = 1 - 0/4 = 1 - 0 = 0 (hardest)
  // When avgRating = 3: SOS = 1 - 2/4 = 1 - 0.5 = 0.5 (average)
  // When avgRating = 5: SOS = 1 - 4/4 = 1 - 1 = 0 (wait, that's wrong)
  //
  // Let me recalculate. We want:
  // - Rating 5 (easy matchups) -> SOS = 1 (easy schedule)
  // - Rating 1 (hard matchups) -> SOS = 0 (hard schedule)
  //
  // Correct formula: (avgRating - 1) / 4
  // When avgRating = 1: SOS = (1-1)/4 = 0 (hardest)
  // When avgRating = 3: SOS = (3-1)/4 = 0.5 (average)
  // When avgRating = 5: SOS = (5-1)/4 = 1 (easiest)

  const sos = (avgRating - 1) / 4;

  // Clamp to ensure we stay in [0, 1] range
  return Math.max(0, Math.min(1, sos));
}
