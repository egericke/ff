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
} from '../risk';
import {
  IInjuryHistory,
  IRiskSettings,
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
});
