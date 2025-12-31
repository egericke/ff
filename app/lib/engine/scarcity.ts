/**
 * Scarcity Calculator Engine.
 * Calculates position scarcity based on drafted players and remaining supply,
 * then computes VOR premiums for positions that are becoming scarce.
 */

import {
  IPositionSupply,
  IScarcityPremium,
  IScarcitySettings,
  ScarcitySeverity,
} from '../models/Scarcity';
import { IPlayerExtended, Position, DraftablePositions } from '../models/Player';
import { IRoster } from '../models/Team';

/**
 * Calculates the supply of players at a specific position.
 * Filters players by position and categorizes remaining players by tier based on VOR thresholds.
 *
 * @param players - Array of all players in the draft pool
 * @param draftedKeys - Set of player keys that have already been drafted
 * @param position - The position to calculate supply for
 * @param settings - Scarcity settings containing tier thresholds
 * @returns Position supply information including tier breakdowns
 */
export function calculatePositionSupply(
  players: IPlayerExtended[],
  draftedKeys: Set<string>,
  position: Position,
  settings: IScarcitySettings
): IPositionSupply {
  // Filter players by position
  const positionPlayers = players.filter((p) => p.pos === position);

  // Count total and drafted
  const totalPlayers = positionPlayers.length;
  const draftedCount = positionPlayers.filter((p) => draftedKeys.has(p.key)).length;
  const remainingCount = totalPlayers - draftedCount;

  // Get remaining players (not drafted)
  const remainingPlayers = positionPlayers.filter((p) => !draftedKeys.has(p.key));

  // Categorize by tier using VOR thresholds
  const tier1Threshold = settings.tierThresholds.tier1;
  const tier2Threshold = settings.tierThresholds.tier2;

  let tier1Remaining = 0;
  let tier2Remaining = 0;
  let tier3Remaining = 0;

  for (const player of remainingPlayers) {
    const vor = player.vor ?? 0;
    if (vor >= tier1Threshold) {
      tier1Remaining++;
    } else if (vor >= tier2Threshold) {
      tier2Remaining++;
    } else {
      tier3Remaining++;
    }
  }

  return {
    position,
    totalPlayers,
    draftedCount,
    remainingCount,
    tier1Remaining,
    tier2Remaining,
    tier3Remaining,
  };
}

/**
 * Determines the scarcity severity based on remaining quality players vs expected need.
 *
 * Severity levels:
 * - none: tier1 + tier2 > expectedStarters * 1.5 (plenty of supply)
 * - low: tier1 + tier2 > expectedStarters (adequate supply)
 * - medium: tier1 + tier2 <= expectedStarters (getting tight)
 * - high: tier1 = 0 and tier2 <= expectedStarters / 2 (very scarce)
 * - critical: tier1 = 0 and tier2 = 0 (no quality players left)
 *
 * @param supply - Position supply information
 * @param expectedStarters - Number of starters expected at this position
 * @returns Scarcity severity level
 */
function determineScarcitySeverity(
  supply: IPositionSupply,
  expectedStarters: number
): ScarcitySeverity {
  const qualityPlayers = supply.tier1Remaining + supply.tier2Remaining;

  // Critical: no tier 1 or tier 2 players remain
  if (supply.tier1Remaining === 0 && supply.tier2Remaining === 0) {
    return 'critical';
  }

  // High: no tier 1 and tier 2 is at or below half of expected starters
  if (supply.tier1Remaining === 0 && supply.tier2Remaining <= expectedStarters / 2) {
    return 'high';
  }

  // Medium: quality players at or below expected starters
  if (qualityPlayers <= expectedStarters) {
    return 'medium';
  }

  // Low: quality players above expected but at or below 1.5x expected
  if (qualityPlayers <= expectedStarters * 1.5) {
    return 'low';
  }

  // None: plenty of quality players available
  return 'none';
}

/**
 * Calculates the scarcity premium for a position based on supply and expected need.
 *
 * Premium = severityMultiplier * positionWeight
 *
 * @param supply - Position supply information
 * @param expectedStarters - Number of starters expected at this position across all teams
 * @param settings - Scarcity settings containing multipliers and weights
 * @returns Scarcity premium with severity level and VOR adjustment
 */
export function calculateScarcityPremium(
  supply: IPositionSupply,
  expectedStarters: number,
  settings: IScarcitySettings
): IScarcityPremium {
  const severity = determineScarcitySeverity(supply, expectedStarters);

  // Get the position weight, defaulting to 1 if not specified
  const positionWeight = settings.positionWeights[supply.position] ?? 1;

  // Get severity multiplier (0 for 'none')
  let severityMultiplier = 0;
  if (severity !== 'none') {
    severityMultiplier = settings.premiumMultipliers[severity];
  }

  // Calculate premium
  const premium = severityMultiplier * positionWeight;

  // Build message describing the scarcity situation
  let message: string | undefined;
  if (severity !== 'none') {
    const qualityRemaining = supply.tier1Remaining + supply.tier2Remaining;
    message = `${supply.position} scarcity ${severity}: ${qualityRemaining} quality players remain for ${expectedStarters} expected starters`;
  }

  return {
    position: supply.position,
    premium,
    severity,
    message,
  };
}

/**
 * Calculates scarcity premiums for all draftable positions.
 *
 * Expected starters for each position is calculated as:
 * rosterFormat[position] * numberOfTeams
 *
 * @param players - Array of all players in the draft pool
 * @param draftedKeys - Set of player keys that have already been drafted
 * @param rosterFormat - Roster configuration specifying slots per position
 * @param numberOfTeams - Number of teams in the league
 * @param settings - Scarcity settings
 * @returns Array of scarcity premiums for each draftable position
 */
export function calculateAllScarcityPremiums(
  players: IPlayerExtended[],
  draftedKeys: Set<string>,
  rosterFormat: IRoster,
  numberOfTeams: number,
  settings: IScarcitySettings
): IScarcityPremium[] {
  const premiums: IScarcityPremium[] = [];

  for (const position of DraftablePositions) {
    // Calculate supply for this position
    const supply = calculatePositionSupply(players, draftedKeys, position, settings);

    // Calculate expected starters
    // Need to get the roster slot count for this position
    const rosterSlots = getRosterSlotsForPosition(rosterFormat, position);
    const expectedStarters = rosterSlots * numberOfTeams;

    // Calculate premium
    const premium = calculateScarcityPremium(supply, expectedStarters, settings);
    premiums.push(premium);
  }

  return premiums;
}

/**
 * Gets the number of roster slots for a specific position from the roster format.
 *
 * @param roster - Roster configuration
 * @param position - Position to look up
 * @returns Number of slots for that position
 */
function getRosterSlotsForPosition(roster: IRoster, position: Position): number {
  switch (position) {
    case 'QB':
      return roster.QB;
    case 'RB':
      return roster.RB;
    case 'WR':
      return roster.WR;
    case 'TE':
      return roster.TE;
    case 'K':
      return roster.K;
    case 'DST':
      return roster.DST;
    default:
      return 0;
  }
}

/**
 * Applies scarcity premium to a base VOR value for a specific position.
 *
 * @param baseVOR - The original VOR value before premium adjustment
 * @param position - The player's position
 * @param premiums - Array of scarcity premiums for all positions
 * @returns Adjusted VOR with scarcity premium added
 */
export function applyScarcityPremium(
  baseVOR: number,
  position: Position,
  premiums: IScarcityPremium[]
): number {
  // Find the premium for this position
  const positionPremium = premiums.find((p) => p.position === position);

  // If no premium found or premium is 0, return base VOR
  if (!positionPremium || positionPremium.premium === 0) {
    return baseVOR;
  }

  // Add premium to base VOR
  return baseVOR + positionPremium.premium;
}
