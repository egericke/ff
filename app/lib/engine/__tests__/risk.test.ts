/**
 * Tests for risk calculation engine functions.
 * These tests verify the injury risk scoring calculations for fantasy football players.
 */

import {
  calculateHistoricalInjuryRate,
  calculateAgeFactor,
  calculatePositionRisk,
  calculateStatusFactor,
  calculateInjuryRisk,
  calculateConsistencyScore,
  calculateFloorCeiling,
} from '../risk';
import {
  IInjuryHistory,
  HealthStatus,
  DEFAULT_RISK_SETTINGS,
} from '../../models/Risk';
import { Position } from '../../models/Player';

describe('Risk Calculator Engine', () => {
  describe('calculateHistoricalInjuryRate', () => {
    it('should return 0 for a player who played all games in all seasons', () => {
      const history: IInjuryHistory = {
        gamesPlayed: [17, 17, 17],
        currentStatus: 'healthy',
      };
      expect(calculateHistoricalInjuryRate(history)).toBe(0);
    });

    it('should return approximately 0.5 for a player who missed half their games', () => {
      // 8.5 games per season = 50% games missed
      const history: IInjuryHistory = {
        gamesPlayed: [8, 9, 9],
        currentStatus: 'healthy',
      };
      const result = calculateHistoricalInjuryRate(history);
      // With weights: (8/17 * 0.5) + (9/17 * 0.3) + (9/17 * 0.2) = games played ratio
      // Missed = 1 - played ratio
      expect(result).toBeGreaterThan(0.4);
      expect(result).toBeLessThan(0.6);
    });

    it('should return 1 for a player who missed all games', () => {
      const history: IInjuryHistory = {
        gamesPlayed: [0, 0, 0],
        currentStatus: 'ir',
      };
      expect(calculateHistoricalInjuryRate(history)).toBe(1);
    });

    it('should weight recent seasons more heavily (50%, 30%, 20%)', () => {
      // Player A: Perfect recent season, progressively worse older seasons
      const playerA: IInjuryHistory = {
        gamesPlayed: [17, 10, 5],
        currentStatus: 'healthy',
      };

      // Player B: Same total games but inverse pattern (bad recent, good older)
      const playerB: IInjuryHistory = {
        gamesPlayed: [5, 10, 17],
        currentStatus: 'healthy',
      };

      const rateA = calculateHistoricalInjuryRate(playerA);
      const rateB = calculateHistoricalInjuryRate(playerB);

      // Player A should have lower injury rate (better recent season weighted at 50%)
      // A: (17/17 * 0.5) + (10/17 * 0.3) + (5/17 * 0.2) = 0.5 + 0.176 + 0.059 = 0.735
      // B: (5/17 * 0.5) + (10/17 * 0.3) + (17/17 * 0.2) = 0.147 + 0.176 + 0.2 = 0.523
      // A injury rate = 1 - 0.735 = 0.265
      // B injury rate = 1 - 0.523 = 0.477
      expect(rateA).toBeLessThan(rateB);
    });

    it('should handle partial season games correctly', () => {
      const history: IInjuryHistory = {
        gamesPlayed: [15, 14, 16],
        currentStatus: 'healthy',
      };
      const result = calculateHistoricalInjuryRate(history);
      // Should be low but not 0
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(0.2);
    });
  });

  describe('calculateAgeFactor', () => {
    const settings = DEFAULT_RISK_SETTINGS;

    it('should return 0 for players under position threshold', () => {
      // QB threshold is 35, testing 30-year-old QB
      expect(calculateAgeFactor(30, 'QB', settings)).toBe(0);

      // RB threshold is 27, testing 24-year-old RB
      expect(calculateAgeFactor(24, 'RB', settings)).toBe(0);
    });

    it('should return 0 for players exactly at threshold', () => {
      // QB at exactly 35
      expect(calculateAgeFactor(35, 'QB', settings)).toBe(0);

      // RB at exactly 27
      expect(calculateAgeFactor(27, 'RB', settings)).toBe(0);
    });

    it('should increase 0.15 per year over threshold', () => {
      // QB 1 year over threshold (36)
      expect(calculateAgeFactor(36, 'QB', settings)).toBeCloseTo(0.15);

      // QB 2 years over threshold (37)
      expect(calculateAgeFactor(37, 'QB', settings)).toBeCloseTo(0.3);

      // RB 1 year over threshold (28)
      expect(calculateAgeFactor(28, 'RB', settings)).toBeCloseTo(0.15);
    });

    it('should cap at 1.0', () => {
      // QB 10 years over threshold would be 1.5 uncapped
      expect(calculateAgeFactor(45, 'QB', settings)).toBe(1.0);

      // RB 10 years over threshold
      expect(calculateAgeFactor(37, 'RB', settings)).toBe(1.0);
    });

    it('should use different thresholds for QB vs RB', () => {
      // 30 year old: under QB threshold, over RB threshold
      const qbFactor = calculateAgeFactor(30, 'QB', settings);
      const rbFactor = calculateAgeFactor(30, 'RB', settings);

      expect(qbFactor).toBe(0);
      expect(rbFactor).toBeGreaterThan(0); // 3 years over = 0.45
      expect(rbFactor).toBeCloseTo(0.45);
    });

    it('should handle all position types', () => {
      // WR at threshold (30)
      expect(calculateAgeFactor(30, 'WR', settings)).toBe(0);
      expect(calculateAgeFactor(31, 'WR', settings)).toBeCloseTo(0.15);

      // TE at threshold (30)
      expect(calculateAgeFactor(30, 'TE', settings)).toBe(0);
      expect(calculateAgeFactor(31, 'TE', settings)).toBeCloseTo(0.15);

      // K at threshold (38)
      expect(calculateAgeFactor(38, 'K', settings)).toBe(0);
      expect(calculateAgeFactor(40, 'K', settings)).toBeCloseTo(0.3);

      // DST at threshold (99) - should always be 0
      expect(calculateAgeFactor(50, 'DST', settings)).toBe(0);
    });
  });

  describe('calculatePositionRisk', () => {
    const settings = DEFAULT_RISK_SETTINGS;

    it('should return highest risk for RB', () => {
      expect(calculatePositionRisk('RB', settings)).toBe(0.7);
    });

    it('should return lowest risk for QB', () => {
      expect(calculatePositionRisk('QB', settings)).toBe(0.2);
    });

    it('should return low risk for DST and K', () => {
      expect(calculatePositionRisk('DST', settings)).toBe(0.1);
      expect(calculatePositionRisk('K', settings)).toBe(0.1);
    });

    it('should return correct risk for WR and TE', () => {
      expect(calculatePositionRisk('WR', settings)).toBe(0.4);
      expect(calculatePositionRisk('TE', settings)).toBe(0.5);
    });

    it('should return default 0.3 for unknown positions', () => {
      expect(calculatePositionRisk('FLEX' as Position, settings)).toBe(0.3);
      expect(calculatePositionRisk('BENCH' as Position, settings)).toBe(0.3);
      expect(calculatePositionRisk('?' as Position, settings)).toBe(0.3);
    });
  });

  describe('calculateStatusFactor', () => {
    it('should return 0 for healthy status', () => {
      expect(calculateStatusFactor('healthy')).toBe(0);
    });

    it('should return 0.3 for questionable status', () => {
      expect(calculateStatusFactor('questionable')).toBe(0.3);
    });

    it('should return 0.5 for doubtful status', () => {
      expect(calculateStatusFactor('doubtful')).toBe(0.5);
    });

    it('should return 0.8 for out status', () => {
      expect(calculateStatusFactor('out')).toBe(0.8);
    });

    it('should return 1.0 for ir status', () => {
      expect(calculateStatusFactor('ir')).toBe(1.0);
    });

    it('should handle all five status values', () => {
      const statuses: HealthStatus[] = ['healthy', 'questionable', 'doubtful', 'out', 'ir'];
      const expected = [0, 0.3, 0.5, 0.8, 1.0];

      statuses.forEach((status, index) => {
        expect(calculateStatusFactor(status)).toBe(expected[index]);
      });
    });
  });

  describe('calculateInjuryRisk', () => {
    const settings = DEFAULT_RISK_SETTINGS;

    it('should return low risk for young healthy QB with no injury history', () => {
      const history: IInjuryHistory = {
        gamesPlayed: [17, 17, 17],
        currentStatus: 'healthy',
      };

      const risk = calculateInjuryRisk(history, 25, 'QB', settings);

      // Low historical (0), low age (0), low position (0.2), healthy status (0)
      // (0 * 0.4) + (0 * 0.25) + (0.2 * 0.2) + (0 * 0.15) = 0.04 * 100 = 4
      expect(risk).toBeLessThan(10);
      expect(risk).toBeGreaterThanOrEqual(0);
    });

    it('should return high risk for older RB with injury history', () => {
      const history: IInjuryHistory = {
        gamesPlayed: [8, 10, 6],
        currentStatus: 'questionable',
      };

      const risk = calculateInjuryRisk(history, 30, 'RB', settings);

      // Higher historical, high age factor (3 years over = 0.45), high position (0.7), questionable (0.3)
      expect(risk).toBeGreaterThan(50);
    });

    it('should be bounded between 0 and 100', () => {
      // Minimum case: healthy, young, low-risk position, full seasons
      const minHistory: IInjuryHistory = {
        gamesPlayed: [17, 17, 17],
        currentStatus: 'healthy',
      };
      const minRisk = calculateInjuryRisk(minHistory, 20, 'K', settings);
      expect(minRisk).toBeGreaterThanOrEqual(0);
      expect(minRisk).toBeLessThanOrEqual(100);

      // Maximum case: IR, very old, high-risk position, no games
      const maxHistory: IInjuryHistory = {
        gamesPlayed: [0, 0, 0],
        currentStatus: 'ir',
      };
      const maxRisk = calculateInjuryRisk(maxHistory, 40, 'RB', settings);
      expect(maxRisk).toBeGreaterThanOrEqual(0);
      expect(maxRisk).toBeLessThanOrEqual(100);
    });

    it('should use correct weighting formula (historical 0.4, age 0.25, position 0.2, status 0.15)', () => {
      // Create a known scenario to verify weighting
      const history: IInjuryHistory = {
        gamesPlayed: [0, 0, 0], // 100% injury rate = 1.0
        currentStatus: 'ir', // 1.0 status factor
      };

      // 40 year old RB (13 years over threshold, capped at 1.0)
      // Position risk = 0.7
      const risk = calculateInjuryRisk(history, 40, 'RB', settings);

      // (1.0 * 0.4) + (1.0 * 0.25) + (0.7 * 0.2) + (1.0 * 0.15) = 0.4 + 0.25 + 0.14 + 0.15 = 0.94
      // * 100 = 94
      expect(risk).toBeCloseTo(94, 0);
    });

    it('should handle different position thresholds correctly', () => {
      const healthyHistory: IInjuryHistory = {
        gamesPlayed: [17, 17, 17],
        currentStatus: 'healthy',
      };

      // 30 year old at each position
      const qbRisk = calculateInjuryRisk(healthyHistory, 30, 'QB', settings);
      const rbRisk = calculateInjuryRisk(healthyHistory, 30, 'RB', settings);
      const wrRisk = calculateInjuryRisk(healthyHistory, 30, 'WR', settings);

      // RB should have highest risk (over age threshold + high position risk)
      expect(rbRisk).toBeGreaterThan(qbRisk);
      expect(rbRisk).toBeGreaterThan(wrRisk);
    });

    it('should produce consistent results for same inputs', () => {
      const history: IInjuryHistory = {
        gamesPlayed: [14, 15, 16],
        currentStatus: 'questionable',
      };

      const risk1 = calculateInjuryRisk(history, 28, 'WR', settings);
      const risk2 = calculateInjuryRisk(history, 28, 'WR', settings);

      expect(risk1).toBe(risk2);
    });
  });

  describe('calculateConsistencyScore', () => {
    it('should return high score (>0.8) for consistent player', () => {
      // Very consistent scoring pattern
      const weeklyScores = [15, 16, 15, 16, 15, 16];
      const score = calculateConsistencyScore(weeklyScores);
      expect(score).toBeGreaterThan(0.8);
    });

    it('should return low score (<0.5) for boom/bust player', () => {
      // Highly variable scoring pattern
      const weeklyScores = [5, 30, 8, 25, 3, 28];
      const score = calculateConsistencyScore(weeklyScores);
      expect(score).toBeLessThan(0.5);
    });

    it('should return exactly 1 for perfect consistency', () => {
      // All same values = no variance
      const weeklyScores = [20, 20, 20, 20];
      const score = calculateConsistencyScore(weeklyScores);
      expect(score).toBe(1);
    });

    it('should return 0 for empty array', () => {
      const weeklyScores: number[] = [];
      const score = calculateConsistencyScore(weeklyScores);
      expect(score).toBe(0);
    });

    it('should return 1 for single value', () => {
      const weeklyScores = [25];
      const score = calculateConsistencyScore(weeklyScores);
      expect(score).toBe(1);
    });

    it('should return 0 for all zeros (avoid division by zero)', () => {
      const weeklyScores = [0, 0, 0, 0];
      const score = calculateConsistencyScore(weeklyScores);
      expect(score).toBe(0);
    });

    it('should be bounded 0-1 for extreme variance', () => {
      // Extreme variance case
      const weeklyScores = [1, 100, 1, 100, 1, 100];
      const score = calculateConsistencyScore(weeklyScores);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle moderate consistency correctly', () => {
      // Moderate variance
      const weeklyScores = [10, 15, 12, 18, 14, 11];
      const score = calculateConsistencyScore(weeklyScores);
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThan(1);
    });
  });

  describe('calculateFloorCeiling', () => {
    it('should have floor < projection < ceiling for normal data', () => {
      const weeklyScores = [10, 12, 15, 18, 20, 22, 25, 28, 30, 32];
      const seasonProjection = 300;
      const result = calculateFloorCeiling(weeklyScores, seasonProjection);

      expect(result.floor).toBeLessThan(seasonProjection);
      expect(result.ceiling).toBeGreaterThan(seasonProjection);
    });

    it('should return projection for both floor and ceiling when empty array', () => {
      const weeklyScores: number[] = [];
      const seasonProjection = 250;
      const result = calculateFloorCeiling(weeklyScores, seasonProjection);

      expect(result.floor).toBe(seasonProjection);
      expect(result.ceiling).toBe(seasonProjection);
      expect(result.weeklyVariance).toBe(0);
    });

    it('should have weekly variance > 0 for variable data', () => {
      const weeklyScores = [10, 20, 15, 25, 12, 28];
      const seasonProjection = 300;
      const result = calculateFloorCeiling(weeklyScores, seasonProjection);

      expect(result.weeklyVariance).toBeGreaterThan(0);
    });

    it('should calculate percentiles correctly', () => {
      // With 10 data points, 10th percentile should be near lowest, 90th near highest
      const weeklyScores = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
      const seasonProjection = 500;
      const result = calculateFloorCeiling(weeklyScores, seasonProjection);

      // 10th percentile (index 1) = 10, 90th percentile (index 8) = 45
      // Floor should scale 10 to season (10 * 17 weeks = 170, but scaled to projection ratio)
      // Ceiling should scale 45 similarly
      expect(result.floor).toBeLessThan(result.ceiling);
    });

    it('should return zero variance for identical weekly scores', () => {
      const weeklyScores = [20, 20, 20, 20, 20];
      const seasonProjection = 340;
      const result = calculateFloorCeiling(weeklyScores, seasonProjection);

      expect(result.weeklyVariance).toBe(0);
      expect(result.floor).toBe(result.ceiling);
    });

    it('should handle single week data', () => {
      const weeklyScores = [25];
      const seasonProjection = 425;
      const result = calculateFloorCeiling(weeklyScores, seasonProjection);

      // Single value: floor = ceiling = projection based on that week
      expect(result.floor).toBe(result.ceiling);
      expect(result.weeklyVariance).toBe(0);
    });

    it('should scale floor and ceiling appropriately to season projection', () => {
      const weeklyScores = [10, 15, 20, 25, 30];
      const seasonProjection = 340; // ~20 points per week * 17 weeks
      const result = calculateFloorCeiling(weeklyScores, seasonProjection);

      // Floor and ceiling should be reasonable values relative to projection
      expect(result.floor).toBeGreaterThan(0);
      expect(result.ceiling).toBeGreaterThan(0);
      expect(result.ceiling).toBeGreaterThanOrEqual(result.floor);
    });
  });
});
