/**
 * Risk profile builder for fantasy football players.
 * Builds complete risk profiles from player data using the risk calculation engine.
 */

import { IPlayerExtended } from '../models/Player';
import { IRiskProfile, IRiskSettings } from '../models/Risk';
import {
  calculateInjuryRisk,
  calculateConsistencyScore,
  calculateFloorCeiling,
} from './risk';

/** Default injury score for players without risk data (moderate risk) */
const DEFAULT_INJURY_SCORE = 50;

/** Default consistency score for players without weekly data (moderate consistency) */
const DEFAULT_CONSISTENCY_SCORE = 0.7;

/** Default weekly variance for players without weekly data */
const DEFAULT_WEEKLY_VARIANCE = 0.3;

/**
 * Builds a complete risk profile for a player.
 *
 * If the player has risk data (age, injury history, weekly scores), calculates
 * actual risk metrics using the risk calculation functions.
 *
 * If the player lacks risk data, returns sensible defaults:
 * - injuryScore: 50 (moderate risk)
 * - consistencyScore: 0.7 (moderate consistency)
 * - floor/ceiling: same as forecast
 * - weeklyVariance: 0.3
 *
 * @param player - The player with optional risk data
 * @param settings - Risk settings for calculations
 * @returns A complete IRiskProfile
 */
export function buildRiskProfile(
  player: IPlayerExtended,
  settings: IRiskSettings
): IRiskProfile {
  const forecast = player.forecast ?? 0;

  // If player has no risk data, return defaults
  if (!player.risk) {
    return {
      injuryScore: DEFAULT_INJURY_SCORE,
      consistencyScore: DEFAULT_CONSISTENCY_SCORE,
      floor: forecast,
      ceiling: forecast,
      weeklyVariance: DEFAULT_WEEKLY_VARIANCE,
    };
  }

  const { age, injuryHistory, weeklyScores } = player.risk;

  // Calculate injury risk score using the risk engine
  const injuryScore = calculateInjuryRisk(
    injuryHistory,
    age,
    player.pos,
    settings
  );

  // Check if we have valid weekly scores to calculate consistency and floor/ceiling
  const hasValidWeeklyScores = weeklyScores && weeklyScores.length > 0;

  if (!hasValidWeeklyScores) {
    // No weekly scores - use calculated injury but defaults for consistency
    return {
      injuryScore,
      consistencyScore: DEFAULT_CONSISTENCY_SCORE,
      floor: forecast,
      ceiling: forecast,
      weeklyVariance: DEFAULT_WEEKLY_VARIANCE,
    };
  }

  // Calculate consistency score from weekly patterns
  const consistencyScore = calculateConsistencyScore(weeklyScores);

  // Calculate floor, ceiling, and weekly variance
  const floorCeilingResult = calculateFloorCeiling(weeklyScores, forecast);

  return {
    injuryScore,
    consistencyScore,
    floor: floorCeilingResult.floor,
    ceiling: floorCeilingResult.ceiling,
    weeklyVariance: floorCeilingResult.weeklyVariance,
  };
}
