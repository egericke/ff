/**
 * Enhanced VOR (Value Over Replacement) Calculator Engine.
 * Combines base VOR with risk adjustments, schedule adjustments,
 * and scarcity premiums for comprehensive player valuation.
 *
 * Note: Schedule score calculation currently returns 0 as schedule data
 * is not attached to players. Schedule scores can be passed in directly
 * to calculateEnhancedVOR when available.
 */

import { IPlayerExtended, Position } from '../models/Player';
import { IRiskSettings } from '../models/Risk';
import { IScarcitySettings } from '../models/Scarcity';
import { IScheduleSettings } from '../models/Schedule';
import { IEnhancedVOR } from '../models/EnhancedVOR';
import { IRoster } from '../models/Team';
import { calculateRiskAdjustedVOR } from './vor';
import { calculateAllScarcityPremiums } from './scarcity';

/**
 * Calculates the complete enhanced VOR for a single player.
 *
 * The enhanced VOR combines:
 * - Base VOR from the player's projection
 * - Risk adjustment based on injury history and consistency
 * - Schedule adjustment based on strength of schedule
 * - Scarcity premium based on positional scarcity
 *
 * Note: This function returns initial ranks of 0 and adpDiff of 0.
 * Use calculateAllEnhancedVORs to get proper ranks and adpDiff values,
 * which are computed after sorting all players.
 *
 * @param player - The player to calculate enhanced VOR for
 * @param riskSettings - Risk tolerance settings
 * @param scheduleScore - Pre-calculated schedule score for the player
 * @param scarcityPremium - Pre-calculated scarcity premium for the player's position
 * @returns Complete enhanced VOR breakdown (with initial ranks/adpDiff of 0)
 */
export function calculateEnhancedVOR(
  player: IPlayerExtended,
  riskSettings: IRiskSettings,
  scheduleScore: number,
  scarcityPremium: number
): IEnhancedVOR {
  // Get base values with defaults
  const baseVOR = player.vor ?? 0;
  const forecast = player.forecast ?? 0;

  // Calculate risk adjustment
  let riskAdjustment = 0;
  if (player.risk?.riskProfile) {
    const riskResult = calculateRiskAdjustedVOR(
      baseVOR,
      player.risk.riskProfile,
      riskSettings
    );
    // Risk adjustment is the difference between adjusted and base VOR
    riskAdjustment = riskResult.adjustedVOR - riskResult.baseVOR;
  }

  // Calculate enhanced VOR by summing all components
  const enhancedVOR = baseVOR + riskAdjustment + scheduleScore + scarcityPremium;

  return {
    playerId: player.key,
    playerName: player.name,
    position: player.pos,
    baseVOR,
    forecast,
    riskAdjustment,
    scheduleAdjustment: scheduleScore,
    scarcityPremium,
    enhancedVOR,
    // Ranks are set to 0 initially; they will be computed by calculateAllEnhancedVORs
    overallRank: 0,
    positionRank: 0,
    // adpDiff is set to 0 initially; it will be computed after ranking
    adpDiff: 0,
  };
}

/**
 * Calculates enhanced VOR for all available (non-drafted) players.
 *
 * This function:
 * 1. Filters out drafted players
 * 2. Calculates schedule scores for each player
 * 3. Calculates scarcity premiums based on positional supply
 * 4. Computes enhanced VOR for each player
 * 5. Sorts by enhanced VOR descending
 * 6. Assigns overall and position ranks
 * 7. Computes adpDiff for each player
 *
 * @param players - Array of all players in the draft pool
 * @param draftedKeys - Set of player keys that have been drafted
 * @param riskSettings - Risk tolerance settings
 * @param scarcitySettings - Scarcity calculation settings
 * @param scheduleSettings - Schedule score settings
 * @param rosterFormat - Roster configuration
 * @param numberOfTeams - Number of teams in the league
 * @returns Array of enhanced VOR breakdowns, sorted by enhanced VOR descending
 */
export function calculateAllEnhancedVORs(
  players: IPlayerExtended[],
  draftedKeys: Set<string>,
  riskSettings: IRiskSettings,
  scarcitySettings: IScarcitySettings,
  scheduleSettings: IScheduleSettings,
  rosterFormat: IRoster,
  numberOfTeams: number
): IEnhancedVOR[] {
  // Filter out drafted players
  const availablePlayers = players.filter((p) => !draftedKeys.has(p.key));

  if (availablePlayers.length === 0) {
    return [];
  }

  // Calculate scarcity premiums for all positions
  const scarcityPremiums = calculateAllScarcityPremiums(
    players,
    draftedKeys,
    rosterFormat,
    numberOfTeams,
    scarcitySettings
  );

  // Calculate enhanced VOR for each available player
  const enhancedVORs: IEnhancedVOR[] = availablePlayers.map((player) => {
    // Get schedule score for the player
    // For now, we use 0 if the player doesn't have a schedule
    // In a full implementation, we would look up or calculate the schedule score
    const scheduleScore = getPlayerScheduleScore(player, scheduleSettings);

    // Get scarcity premium for the player's position
    const premium = getScarcityPremiumForPlayer(player, scarcityPremiums);

    return calculateEnhancedVOR(player, riskSettings, scheduleScore, premium);
  });

  // Sort by enhanced VOR descending
  enhancedVORs.sort((a, b) => b.enhancedVOR - a.enhancedVOR);

  // Assign overall ranks (1-based)
  enhancedVORs.forEach((vor, index) => {
    vor.overallRank = index + 1;
  });

  // Assign position ranks
  const positionRankCounters: Partial<Record<Position, number>> = {};
  enhancedVORs.forEach((vor) => {
    const currentRank = (positionRankCounters[vor.position] ?? 0) + 1;
    positionRankCounters[vor.position] = currentRank;
    vor.positionRank = currentRank;
  });

  // Calculate adpDiff for each player using a Map for O(1) lookup
  const playerMap = new Map(availablePlayers.map((p) => [p.key, p]));
  enhancedVORs.forEach((vor) => {
    const player = playerMap.get(vor.playerId);
    if (player) {
      const adpRank = player.std ?? 999;
      // adpDiff = adpRank - overallRank
      // Positive = value (ranked higher than ADP suggests)
      // Negative = reach (ranked lower than ADP suggests)
      vor.adpDiff = adpRank - vor.overallRank;
    }
  });

  return enhancedVORs;
}

/**
 * Creates a new player object with the enhanced VOR attached.
 *
 * @param player - The original player
 * @param enhancedVOR - The calculated enhanced VOR breakdown
 * @returns Player with enhanced VOR attached
 */
export function getPlayerWithEnhancedVOR(
  player: IPlayerExtended,
  enhancedVOR: IEnhancedVOR
): IPlayerExtended & { enhancedVOR: IEnhancedVOR } {
  return {
    ...player,
    enhancedVOR,
  };
}

/**
 * Gets the schedule score for a player.
 * If the player has schedule data attached, calculates the score.
 * Otherwise returns 0.
 *
 * @param player - The player
 * @param settings - Schedule settings
 * @returns The schedule score
 */
function getPlayerScheduleScore(
  player: IPlayerExtended,
  settings: IScheduleSettings
): number {
  // In a full implementation, we would look up the player's team schedule
  // and calculate the schedule score using calculateScheduleScore.
  // For now, we return 0 as the schedule data may not be attached to the player.
  // The schedule score can be passed in directly when calling calculateEnhancedVOR.
  return 0;
}

/**
 * Gets the scarcity premium for a player based on their position.
 *
 * @param player - The player
 * @param premiums - Array of scarcity premiums by position
 * @returns The scarcity premium for the player's position
 */
function getScarcityPremiumForPlayer(
  player: IPlayerExtended,
  premiums: { position: Position; premium: number }[]
): number {
  const positionPremium = premiums.find((p) => p.position === player.pos);
  return positionPremium?.premium ?? 0;
}
