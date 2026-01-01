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
} from './risk';
export type { FloorCeilingResult } from './risk';

// Risk profile builder
export { buildRiskProfile } from './riskProfile';

// VOR calculations
export {
  calculateRiskAdjustedVOR,
  applyRiskTolerance,
} from './vor';
export type { IRiskAdjustedVORResult } from './vor';

// Re-export from models
export {
  DEFAULT_RISK_SETTINGS,
  isValidRiskProfile,
} from '../models/Risk';
export type {
  IRiskProfile,
  IRiskSettings,
  IInjuryHistory,
  HealthStatus,
} from '../models/Risk';

// Re-export from Player
export {
  hasAdvancedStats,
  hasRiskProfile,
} from '../models/Player';
export type {
  IPlayerAdvanced,
  IPlayerRisk,
  IPlayerExtended,
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
  DEFAULT_SCHEDULE_SETTINGS,
  isValidSchedule,
} from '../models/Schedule';
export type {
  MatchupRating,
  IDefenseRankings,
  IWeeklyMatchup,
  IPlayerSchedule,
  IWeekWeights,
  IScheduleSettings,
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
  DEFAULT_SCARCITY_SETTINGS,
  isValidScarcityState,
} from '../models/Scarcity';
export type {
  IPositionSupply,
  IScarcityPremium,
  IDropOffAlert,
  IScarcitySettings,
  IDraftScarcityState,
  ScarcitySeverity,
  AlertSeverity,
} from '../models/Scarcity';

// Enhanced VOR calculations
export {
  calculateEnhancedVOR,
  calculateAllEnhancedVORs,
  getPlayerWithEnhancedVOR,
} from './enhancedVOR';

// Recommendation engine
export {
  getTopRecommendations,
  getValueIndicator,
  getUrgency,
  generateReasons,
} from './recommendations';

// Re-export from EnhancedVOR model
export type {
  IEnhancedVOR,
  IPlayerRecommendation,
  IRecommendationSettings,
  Urgency,
  ValueIndicator,
} from '../models/EnhancedVOR';
export {
  DEFAULT_RECOMMENDATION_SETTINGS,
  isValidEnhancedVOR,
  isValidRecommendation,
} from '../models/EnhancedVOR';
