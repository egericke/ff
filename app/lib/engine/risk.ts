/**
 * Risk calculation engine for injury risk scoring.
 * Provides pure functions to calculate various risk factors for fantasy football players.
 */

import { IInjuryHistory, IRiskSettings, HealthStatus } from '../models/Risk';
import { Position } from '../models/Player';

/** Maximum games in an NFL season */
const GAMES_PER_SEASON = 17;

/** Recency weights for the 3 seasons (most recent first) */
const SEASON_WEIGHTS = [0.5, 0.3, 0.2];

/** Age factor increase per year over threshold */
const AGE_FACTOR_PER_YEAR = 0.15;

/** Default risk for unknown positions */
const DEFAULT_POSITION_RISK = 0.3;

/** Status factors for each health status */
const STATUS_FACTORS: Record<HealthStatus, number> = {
  healthy: 0,
  questionable: 0.3,
  doubtful: 0.5,
  out: 0.8,
  ir: 1.0,
};

/**
 * Calculates the historical injury rate based on games played over 3 seasons.
 * Uses weighted averaging with more recent seasons weighted more heavily (50%, 30%, 20%).
 *
 * @param history - The player's injury history containing games played per season
 * @returns A value between 0 (no games missed) and 1 (all games missed)
 */
export function calculateHistoricalInjuryRate(history: IInjuryHistory): number {
  const { gamesPlayed } = history;

  // Calculate weighted average of games played ratio
  let weightedPlayedRatio = 0;

  for (let i = 0; i < gamesPlayed.length; i++) {
    const gamesRatio = gamesPlayed[i] / GAMES_PER_SEASON;
    weightedPlayedRatio += gamesRatio * SEASON_WEIGHTS[i];
  }

  // Injury rate is inverse of games played ratio
  const injuryRate = 1 - weightedPlayedRatio;

  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, injuryRate));
}

/**
 * Calculates the age-based risk factor for a player.
 * Returns 0 for players at or under the position's age threshold,
 * then increases by 0.15 per year over the threshold, capped at 1.0.
 *
 * @param age - The player's current age
 * @param position - The player's position
 * @param settings - Risk settings containing position age thresholds
 * @returns A value between 0 and 1 representing age-based risk
 */
export function calculateAgeFactor(
  age: number,
  position: Position,
  settings: IRiskSettings
): number {
  // Get the age threshold for this position
  const positionKey = position as keyof typeof settings.positionAgeThresholds;
  const threshold = settings.positionAgeThresholds[positionKey];

  // If position doesn't have a threshold, return 0
  if (threshold === undefined) {
    return 0;
  }

  // Calculate years over threshold
  const yearsOver = age - threshold;

  // Return 0 if at or under threshold
  if (yearsOver <= 0) {
    return 0;
  }

  // Calculate factor (0.15 per year over), capped at 1.0
  const factor = yearsOver * AGE_FACTOR_PER_YEAR;
  return Math.min(1.0, factor);
}

/**
 * Calculates the position-based risk factor.
 * Returns the base risk value for the position from settings.
 *
 * @param position - The player's position
 * @param settings - Risk settings containing position base risk values
 * @returns A value between 0 and 1 representing position-based risk
 */
export function calculatePositionRisk(
  position: Position,
  settings: IRiskSettings
): number {
  const positionKey = position as keyof typeof settings.positionBaseRisk;
  const baseRisk = settings.positionBaseRisk[positionKey];

  // Return default risk for unknown positions
  if (baseRisk === undefined) {
    return DEFAULT_POSITION_RISK;
  }

  return baseRisk;
}

/**
 * Calculates the current health status risk factor.
 *
 * @param status - The player's current health status
 * @returns A value between 0 (healthy) and 1 (IR)
 */
export function calculateStatusFactor(status: HealthStatus): number {
  return STATUS_FACTORS[status];
}

/**
 * Calculates the overall injury risk score for a player.
 * Combines all risk factors using the following weights:
 * - Historical injury rate: 40%
 * - Age factor: 25%
 * - Position risk: 20%
 * - Current status: 15%
 *
 * @param history - The player's injury history
 * @param age - The player's current age
 * @param position - The player's position
 * @param settings - Risk settings for calculations
 * @returns A risk score from 0 (low risk) to 100 (high risk)
 */
export function calculateInjuryRisk(
  history: IInjuryHistory,
  age: number,
  position: Position,
  settings: IRiskSettings
): number {
  // Calculate individual factors
  const historicalRate = calculateHistoricalInjuryRate(history);
  const ageFactor = calculateAgeFactor(age, position, settings);
  const positionRisk = calculatePositionRisk(position, settings);
  const statusFactor = calculateStatusFactor(history.currentStatus);

  // Get weights from settings
  const { weights } = settings;

  // Calculate weighted sum
  const weightedSum =
    historicalRate * weights.historical +
    ageFactor * weights.age +
    positionRisk * weights.position +
    statusFactor * weights.status;

  // Convert to 0-100 scale and clamp
  const riskScore = weightedSum * 100;
  return Math.max(0, Math.min(100, riskScore));
}
