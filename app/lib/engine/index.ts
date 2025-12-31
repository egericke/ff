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

// Schedule strength calculations
export {
  calculateMatchupRating,
  calculateWeekWeight,
  calculateScheduleScore,
  calculateSOS,
} from './schedule';

// Re-export from Schedule model
export {
  MatchupRating,
  IDefenseRankings,
  IWeeklyMatchup,
  IPlayerSchedule,
  IWeekWeights,
  IScheduleSettings,
  DEFAULT_SCHEDULE_SETTINGS,
  isValidSchedule,
} from '../models/Schedule';

// Scarcity calculations
export {
  calculatePositionSupply,
  calculateScarcityPremium,
  calculateAllScarcityPremiums,
  applyScarcityPremium,
  detectDropOffs,
  getPicksUntilTierDrop,
} from './scarcity';

// Re-export from Scarcity model
export {
  IPositionSupply,
  IScarcityPremium,
  IDropOffAlert,
  IScarcitySettings,
  IDraftScarcityState,
  ScarcitySeverity,
  AlertSeverity,
  DEFAULT_SCARCITY_SETTINGS,
  isValidScarcityState,
} from '../models/Scarcity';
