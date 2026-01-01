/**
 * Recommendation Engine for Fantasy Football Draft.
 * Generates player recommendations based on enhanced VOR,
 * scarcity alerts, positional needs, and value indicators.
 */

import {
  IEnhancedVOR,
  IPlayerRecommendation,
  IRecommendationSettings,
  Urgency,
  ValueIndicator,
} from '../models/EnhancedVOR';
import { IPlayerExtended, Position } from '../models/Player';
import { IDropOffAlert } from '../models/Scarcity';

/**
 * Priority values for urgency levels (lower is higher priority).
 */
const URGENCY_PRIORITY: Record<Urgency, number> = {
  'must-draft': 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Determines the value indicator based on ADP difference.
 *
 * The value indicator shows how the player's enhanced VOR ranking
 * compares to their Average Draft Position (ADP):
 * - 'steal': Player ranked much higher than ADP (great value)
 * - 'good-value': Player ranked moderately higher than ADP
 * - 'fair': Player ranked close to ADP
 * - 'reach': Player ranked below ADP (slight overpay)
 * - 'avoid': Player ranked far below ADP (significant overpay)
 *
 * @param adpDiff - The difference between ADP rank and enhanced VOR rank (positive = value)
 * @param settings - Recommendation settings with thresholds
 * @returns The appropriate value indicator
 */
export function getValueIndicator(
  adpDiff: number,
  settings: IRecommendationSettings
): ValueIndicator {
  const { adpValueThreshold } = settings;

  if (adpDiff >= adpValueThreshold) {
    return 'steal';
  }
  if (adpDiff >= 5) {
    return 'good-value';
  }
  if (adpDiff >= -5) {
    return 'fair';
  }
  if (adpDiff >= -15) {
    return 'reach';
  }
  return 'avoid';
}

/**
 * Determines the urgency level for drafting a player.
 *
 * Urgency is based on:
 * - Scarcity premium thresholds (must-draft, high, medium)
 * - Drop-off alerts for the player's position
 *
 * @param enhancedVOR - The player's enhanced VOR data
 * @param alerts - Active drop-off alerts
 * @param settings - Recommendation settings with urgency thresholds
 * @returns The appropriate urgency level
 */
export function getUrgency(
  enhancedVOR: IEnhancedVOR,
  alerts: IDropOffAlert[],
  settings: IRecommendationSettings
): Urgency {
  const { scarcityPremium, position } = enhancedVOR;
  const { urgencyThresholds } = settings;

  // Check scarcity premium thresholds first (highest priority)
  if (scarcityPremium >= urgencyThresholds.mustDraft) {
    return 'must-draft';
  }

  // Check for critical alert at position OR high scarcity premium
  const hasCriticalAlert = alerts.some(
    (alert) => alert.position === position && alert.severity === 'critical'
  );
  if (scarcityPremium >= urgencyThresholds.high || hasCriticalAlert) {
    return 'high';
  }

  // Check for warning alert at position OR medium scarcity premium
  const hasWarningAlert = alerts.some(
    (alert) => alert.position === position && alert.severity === 'warning'
  );
  if (scarcityPremium >= urgencyThresholds.medium || hasWarningAlert) {
    return 'medium';
  }

  return 'low';
}

/**
 * Generates human-readable reasons for recommending a player.
 *
 * Reasons are generated based on:
 * - Positional need (if player's position is needed)
 * - ADP value (if player is undervalued)
 * - Scarcity premium (if position is scarce)
 * - Schedule advantage (if favorable schedule)
 * - Drop-off alert (if tier drop-off is imminent)
 *
 * @param enhancedVOR - The player's enhanced VOR data
 * @param alerts - Active drop-off alerts
 * @param neededPositions - Positions the team needs
 * @returns Array of reason strings
 */
export function generateReasons(
  enhancedVOR: IEnhancedVOR,
  alerts: IDropOffAlert[],
  neededPositions: Position[]
): string[] {
  const reasons: string[] = [];
  const { position, adpDiff, scarcityPremium, scheduleAdjustment } = enhancedVOR;

  // Check if position is needed
  if (neededPositions.includes(position)) {
    reasons.push(`Fills positional need at ${position}`);
  }

  // Check for ADP value (adpDiff > 5)
  if (adpDiff > 5) {
    reasons.push(`ADP value of +${adpDiff} picks`);
  }

  // Check for scarcity premium
  if (scarcityPremium > 0) {
    reasons.push(`Scarce position - premium of +${scarcityPremium}`);
  }

  // Check for favorable schedule
  if (scheduleAdjustment > 3) {
    reasons.push(`Favorable schedule (+${scheduleAdjustment})`);
  }

  // Check for drop-off alert
  const hasAlert = alerts.some((alert) => alert.position === position);
  if (hasAlert) {
    reasons.push('Position tier drop-off imminent');
  }

  return reasons;
}

/**
 * Gets the top player recommendations based on enhanced VOR analysis.
 *
 * This function:
 * 1. Filters out drafted players
 * 2. Creates recommendations with urgency, value indicator, and reasons
 * 3. Sorts by: needed position first, then urgency, then enhancedVOR
 * 4. Returns the top N players based on settings
 *
 * @param enhancedVORs - Array of enhanced VOR data for all players
 * @param players - Array of extended player data
 * @param draftedKeys - Set of player keys that have been drafted
 * @param neededPositions - Positions the team still needs
 * @param settings - Recommendation settings
 * @returns Array of top player recommendations
 */
export function getTopRecommendations(
  enhancedVORs: IEnhancedVOR[],
  players: IPlayerExtended[],
  draftedKeys: Set<string>,
  neededPositions: Position[],
  settings: IRecommendationSettings
): IPlayerRecommendation[] {
  // Create a map for quick player lookup
  const playerMap = new Map(players.map((p) => [p.key, p]));

  // Filter out drafted players and players not in the players array
  const availableVORs = enhancedVORs.filter(
    (vor) => !draftedKeys.has(vor.playerId) && playerMap.has(vor.playerId)
  );

  if (availableVORs.length === 0) {
    return [];
  }

  // Create recommendations with all metadata
  // Note: We pass empty alerts for now since alerts are not required in getTopRecommendations signature
  // In a full implementation, alerts would be passed in
  const recommendations: IPlayerRecommendation[] = availableVORs.map((vor) => {
    const player = playerMap.get(vor.playerId)!;
    const urgency = getUrgency(vor, [], settings);
    const valueIndicator = getValueIndicator(vor.adpDiff, settings);
    const reasons = generateReasons(vor, [], neededPositions);

    return {
      player,
      enhancedVOR: vor,
      reasons,
      urgency,
      valueIndicator,
    };
  });

  // Sort recommendations:
  // 1. Needed positions first
  // 2. Then by urgency priority (lower is higher priority)
  // 3. Then by enhanced VOR descending
  recommendations.sort((a, b) => {
    // Check if positions are needed
    const aIsNeeded = neededPositions.includes(a.enhancedVOR.position);
    const bIsNeeded = neededPositions.includes(b.enhancedVOR.position);

    // Needed positions come first
    if (aIsNeeded && !bIsNeeded) return -1;
    if (!aIsNeeded && bIsNeeded) return 1;

    // Same need level: sort by urgency priority
    const aUrgencyPriority = URGENCY_PRIORITY[a.urgency];
    const bUrgencyPriority = URGENCY_PRIORITY[b.urgency];
    if (aUrgencyPriority !== bUrgencyPriority) {
      return aUrgencyPriority - bUrgencyPriority;
    }

    // Same urgency: sort by enhanced VOR descending
    return b.enhancedVOR.enhancedVOR - a.enhancedVOR.enhancedVOR;
  });

  // Return top N players
  return recommendations.slice(0, settings.topNPlayers);
}
