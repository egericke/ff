/**
 * Risk-adjusted VOR (Value Over Replacement) calculation engine.
 * Applies risk tolerance settings to modify base VOR values based on
 * player injury risk and consistency profiles.
 */

import { IRiskProfile, IRiskSettings } from '../models/Risk';

/**
 * Result of a risk-adjusted VOR calculation, showing the breakdown of adjustments.
 */
export interface IRiskAdjustedVORResult {
  /** The original VOR value before any adjustments */
  baseVOR: number;
  /** The final VOR value after applying risk adjustments */
  adjustedVOR: number;
  /** Points deducted for injury risk (negative or zero) */
  riskAdjustment: number;
  /** Points adjusted for consistency (can be positive or negative) */
  consistencyAdjustment: number;
}

/**
 * Applies risk tolerance settings to a base VOR value.
 *
 * Formula: baseVOR * (1 - (injuryRisk/100 * riskSensitivity)) * (consistency ^ riskSensitivity)
 *
 * Where riskSensitivity = 1 - riskTolerance:
 * - Conservative (0.2 tolerance) = 0.8 sensitivity = heavy penalties for risk
 * - Aggressive (0.8 tolerance) = 0.2 sensitivity = minimal penalties for risk
 *
 * @param baseVOR - The original VOR value before adjustments
 * @param riskProfile - The player's risk profile containing injury and consistency scores
 * @param settings - Risk settings including the user's risk tolerance
 * @returns The adjusted VOR value as a rounded integer
 */
export function applyRiskTolerance(
  baseVOR: number,
  riskProfile: IRiskProfile,
  settings: IRiskSettings
): number {
  // Calculate risk sensitivity (inverse of tolerance)
  // Conservative (0.2 tolerance) = 0.8 sensitivity
  // Aggressive (0.8 tolerance) = 0.2 sensitivity
  const riskSensitivity = 1 - settings.riskTolerance;

  // Calculate injury risk penalty factor
  // injuryRisk is 0-100, so divide by 100 to get 0-1 range
  const injuryRiskFactor = 1 - (riskProfile.injuryScore / 100) * riskSensitivity;

  // Calculate consistency factor
  // consistency is already 0-1, raise to power of sensitivity
  const consistencyFactor = Math.pow(riskProfile.consistencyScore, riskSensitivity);

  // Apply both factors to base VOR
  const adjustedVOR = baseVOR * injuryRiskFactor * consistencyFactor;

  // Return rounded integer
  return Math.round(adjustedVOR);
}

/**
 * Calculates risk-adjusted VOR with a full breakdown of adjustments.
 *
 * This function provides detailed visibility into how the final VOR is calculated,
 * breaking down the impact of injury risk and consistency separately.
 *
 * @param baseVOR - The original VOR value before adjustments
 * @param riskProfile - The player's risk profile containing injury and consistency scores
 * @param settings - Risk settings including the user's risk tolerance
 * @returns An object containing baseVOR, adjustedVOR, and the individual adjustments
 */
export function calculateRiskAdjustedVOR(
  baseVOR: number,
  riskProfile: IRiskProfile,
  settings: IRiskSettings
): IRiskAdjustedVORResult {
  // Calculate risk sensitivity (inverse of tolerance)
  const riskSensitivity = 1 - settings.riskTolerance;

  // Step 1: Calculate injury risk adjustment
  // First apply injury risk to get intermediate value
  const injuryRiskFactor = 1 - (riskProfile.injuryScore / 100) * riskSensitivity;
  const afterInjuryRisk = baseVOR * injuryRiskFactor;
  const riskAdjustment = afterInjuryRisk - baseVOR; // Will be negative or zero

  // Step 2: Calculate consistency adjustment
  // Apply consistency factor to the injury-adjusted value
  const consistencyFactor = Math.pow(riskProfile.consistencyScore, riskSensitivity);
  const afterConsistency = afterInjuryRisk * consistencyFactor;
  const consistencyAdjustment = afterConsistency - afterInjuryRisk;

  // Final adjusted VOR
  const adjustedVOR = Math.round(afterConsistency);

  return {
    baseVOR,
    adjustedVOR,
    riskAdjustment,
    consistencyAdjustment,
  };
}
