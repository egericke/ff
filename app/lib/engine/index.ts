/**
 * Engine module barrel export.
 * Re-exports all public API from the risk calculation engine.
 */

// Risk calculation functions
export {
  calculateInjuryRisk,
  calculateHistoricalInjuryRate,
  calculateAgeFactor,
  calculatePositionRisk,
  calculateStatusFactor,
  calculateConsistencyScore,
  calculateFloorCeiling,
  FloorCeilingResult,
} from './risk';

// Risk profile builder
export { buildRiskProfile } from './riskProfile';

// VOR calculations
export {
  calculateRiskAdjustedVOR,
  applyRiskTolerance,
  IRiskAdjustedVORResult,
} from './vor';

// Re-export from models
export {
  DEFAULT_RISK_SETTINGS,
  IRiskProfile,
  IRiskSettings,
  IInjuryHistory,
  HealthStatus,
  isValidRiskProfile,
} from '../models/Risk';

// Re-export from Player
export {
  IPlayerAdvanced,
  IPlayerRisk,
  IPlayerExtended,
  hasAdvancedStats,
  hasRiskProfile,
} from '../models/Player';
