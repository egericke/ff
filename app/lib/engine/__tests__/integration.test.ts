/**
 * Integration tests for the risk-adjusted VOR engine.
 * Tests the complete end-to-end flow from player data through risk profile to adjusted VOR.
 */

import {
  // Risk calculation functions
  calculateInjuryRisk,
  calculateHistoricalInjuryRate,
  calculateAgeFactor,
  calculatePositionRisk,
  calculateStatusFactor,
  calculateConsistencyScore,
  calculateFloorCeiling,
  // Risk profile builder
  buildRiskProfile,
  // VOR calculations
  calculateRiskAdjustedVOR,
  applyRiskTolerance,
  // Models
  DEFAULT_RISK_SETTINGS,
  isValidRiskProfile,
  // Player types
  hasAdvancedStats,
  hasRiskProfile,
  // Types
  IPlayerExtended,
  IRiskSettings,
  IInjuryHistory,
  IRiskProfile,
  IRiskAdjustedVORResult,
} from '../index';

describe('Engine Integration Tests', () => {
  describe('All Exports Available', () => {
    it('should export all risk calculation functions', () => {
      expect(calculateInjuryRisk).toBeDefined();
      expect(typeof calculateInjuryRisk).toBe('function');

      expect(calculateHistoricalInjuryRate).toBeDefined();
      expect(typeof calculateHistoricalInjuryRate).toBe('function');

      expect(calculateAgeFactor).toBeDefined();
      expect(typeof calculateAgeFactor).toBe('function');

      expect(calculatePositionRisk).toBeDefined();
      expect(typeof calculatePositionRisk).toBe('function');

      expect(calculateStatusFactor).toBeDefined();
      expect(typeof calculateStatusFactor).toBe('function');

      expect(calculateConsistencyScore).toBeDefined();
      expect(typeof calculateConsistencyScore).toBe('function');

      expect(calculateFloorCeiling).toBeDefined();
      expect(typeof calculateFloorCeiling).toBe('function');
    });

    it('should export buildRiskProfile function', () => {
      expect(buildRiskProfile).toBeDefined();
      expect(typeof buildRiskProfile).toBe('function');
    });

    it('should export VOR calculation functions', () => {
      expect(calculateRiskAdjustedVOR).toBeDefined();
      expect(typeof calculateRiskAdjustedVOR).toBe('function');

      expect(applyRiskTolerance).toBeDefined();
      expect(typeof applyRiskTolerance).toBe('function');
    });

    it('should export model constants and type guards', () => {
      expect(DEFAULT_RISK_SETTINGS).toBeDefined();
      expect(DEFAULT_RISK_SETTINGS.riskTolerance).toBe(0.5);

      expect(isValidRiskProfile).toBeDefined();
      expect(typeof isValidRiskProfile).toBe('function');
    });

    it('should export player type guards', () => {
      expect(hasAdvancedStats).toBeDefined();
      expect(typeof hasAdvancedStats).toBe('function');

      expect(hasRiskProfile).toBeDefined();
      expect(typeof hasRiskProfile).toBe('function');
    });
  });

  describe('Complete End-to-End Flow', () => {
    // Create a realistic "safe" player - young QB with consistent scoring, no injuries
    const safePlayer: IPlayerExtended = {
      index: 1,
      key: 'mahomes-patrick',
      name: 'Patrick Mahomes',
      pos: 'QB',
      team: 'KC',
      bye: 10,
      std: 2.5,
      halfPpr: 2.5,
      ppr: 2.5,
      forecast: 350,
      vor: 100,
      risk: {
        age: 28,
        injuryHistory: {
          gamesPlayed: [17, 17, 16],
          currentStatus: 'healthy',
        },
        weeklyScores: [22, 24, 21, 23, 22, 25, 21, 24, 22, 23, 21, 24, 22, 23, 21, 24],
      },
      // Scoring stats (IScoring)
      passYd: 5000,
      passTd: 40,
      rushYd: 300,
      rushTd: 4,
    };

    // Create a realistic "risky" player - older RB with boom/bust scoring, injury history
    const riskyPlayer: IPlayerExtended = {
      index: 2,
      key: 'mccaffrey-christian',
      name: 'Christian McCaffrey',
      pos: 'RB',
      team: 'SF',
      bye: 9,
      std: 5.0,
      halfPpr: 3.0,
      ppr: 2.0,
      forecast: 320,
      vor: 95,
      risk: {
        age: 29,
        injuryHistory: {
          gamesPlayed: [14, 12, 15],
          currentStatus: 'questionable',
        },
        weeklyScores: [8, 32, 12, 28, 5, 35, 10, 30, 6, 25, 15, 28, 8, 32, 10, 25],
      },
      // Scoring stats (IScoring)
      rushYd: 1400,
      rushTd: 14,
      rec: 80,
      recYd: 600,
      recTd: 5,
    };

    it('should complete the full flow: player -> buildRiskProfile -> calculateRiskAdjustedVOR', () => {
      // Step 1: Build risk profile from player data
      const riskProfile = buildRiskProfile(safePlayer, DEFAULT_RISK_SETTINGS);

      // Verify risk profile is valid
      expect(isValidRiskProfile(riskProfile)).toBe(true);
      expect(riskProfile.injuryScore).toBeGreaterThanOrEqual(0);
      expect(riskProfile.injuryScore).toBeLessThanOrEqual(100);
      expect(riskProfile.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(riskProfile.consistencyScore).toBeLessThanOrEqual(1);

      // Step 2: Calculate risk-adjusted VOR
      const baseVOR = safePlayer.vor!;
      const result = calculateRiskAdjustedVOR(baseVOR, riskProfile, DEFAULT_RISK_SETTINGS);

      // Verify result structure
      expect(result.baseVOR).toBe(baseVOR);
      expect(result.adjustedVOR).toBeDefined();
      expect(result.riskAdjustment).toBeDefined();
      expect(result.consistencyAdjustment).toBeDefined();

      // For a safe player with balanced settings, adjustment should be relatively small
      expect(Math.abs(result.baseVOR - result.adjustedVOR)).toBeLessThan(baseVOR * 0.5);
    });

    it('should show safe player has higher adjusted VOR than risky player with same base VOR', () => {
      // Build risk profiles
      const safeProfile = buildRiskProfile(safePlayer, DEFAULT_RISK_SETTINGS);
      const riskyProfile = buildRiskProfile(riskyPlayer, DEFAULT_RISK_SETTINGS);

      // Safe player should have lower injury score (less risky)
      expect(safeProfile.injuryScore).toBeLessThan(riskyProfile.injuryScore);

      // Safe player should have higher consistency score
      expect(safeProfile.consistencyScore).toBeGreaterThan(riskyProfile.consistencyScore);

      // Use same base VOR for comparison
      const sameBaseVOR = 100;

      const safeResult = calculateRiskAdjustedVOR(sameBaseVOR, safeProfile, DEFAULT_RISK_SETTINGS);
      const riskyResult = calculateRiskAdjustedVOR(sameBaseVOR, riskyProfile, DEFAULT_RISK_SETTINGS);

      // Safe player should retain more value
      expect(safeResult.adjustedVOR).toBeGreaterThan(riskyResult.adjustedVOR);
    });
  });

  describe('Conservative vs Aggressive Settings', () => {
    const riskyProfile: IRiskProfile = {
      injuryScore: 70, // High injury risk
      consistencyScore: 0.5, // Moderate consistency (boom/bust)
      floor: 180,
      ceiling: 400,
      weeklyVariance: 0.6,
    };

    const safeProfile: IRiskProfile = {
      injuryScore: 15, // Low injury risk
      consistencyScore: 0.95, // High consistency
      floor: 280,
      ceiling: 320,
      weeklyVariance: 0.1,
    };

    const conservativeSettings: IRiskSettings = {
      ...DEFAULT_RISK_SETTINGS,
      riskTolerance: 0.2, // Very risk-averse
    };

    const aggressiveSettings: IRiskSettings = {
      ...DEFAULT_RISK_SETTINGS,
      riskTolerance: 0.8, // Risk-seeking
    };

    it('should penalize risky player much more with conservative settings', () => {
      const baseVOR = 100;

      const conservativeResult = calculateRiskAdjustedVOR(baseVOR, riskyProfile, conservativeSettings);
      const aggressiveResult = calculateRiskAdjustedVOR(baseVOR, riskyProfile, aggressiveSettings);

      // Conservative should produce significantly lower VOR for risky player
      expect(conservativeResult.adjustedVOR).toBeLessThan(aggressiveResult.adjustedVOR);

      // The difference should be meaningful (at least 10 points for a 100 VOR player)
      const difference = aggressiveResult.adjustedVOR - conservativeResult.adjustedVOR;
      expect(difference).toBeGreaterThan(10);
    });

    it('should affect safe player minimally regardless of settings', () => {
      const baseVOR = 100;

      const conservativeResult = calculateRiskAdjustedVOR(baseVOR, safeProfile, conservativeSettings);
      const aggressiveResult = calculateRiskAdjustedVOR(baseVOR, safeProfile, aggressiveSettings);

      // For safe player, both settings should produce similar results
      // The difference should be much smaller than for risky player
      const safeDifference = Math.abs(
        aggressiveResult.adjustedVOR - conservativeResult.adjustedVOR
      );
      expect(safeDifference).toBeLessThan(15);

      // Both should retain most of the value
      expect(conservativeResult.adjustedVOR).toBeGreaterThan(80);
      expect(aggressiveResult.adjustedVOR).toBeGreaterThan(80);
    });

    it('should show conservative settings change risky player rank relative to safe player', () => {
      const riskyBaseVOR = 105; // Slightly higher base VOR
      const safeBaseVOR = 100;

      // With aggressive settings, risky player should stay ahead
      const riskyAggressive = calculateRiskAdjustedVOR(
        riskyBaseVOR,
        riskyProfile,
        aggressiveSettings
      );
      const safeAggressive = calculateRiskAdjustedVOR(
        safeBaseVOR,
        safeProfile,
        aggressiveSettings
      );

      // With aggressive settings, the gap between risky and safe should be smaller
      // than the base VOR gap (5 points) because risky still gets penalized somewhat
      const aggressiveGap = riskyAggressive.adjustedVOR - safeAggressive.adjustedVOR;

      // With conservative settings, safe player should be ranked higher
      const riskyConservative = calculateRiskAdjustedVOR(
        riskyBaseVOR,
        riskyProfile,
        conservativeSettings
      );
      const safeConservative = calculateRiskAdjustedVOR(
        safeBaseVOR,
        safeProfile,
        conservativeSettings
      );

      const conservativeGap = riskyConservative.adjustedVOR - safeConservative.adjustedVOR;

      // Key insight: with conservative settings, safe player should clearly beat risky player
      expect(safeConservative.adjustedVOR).toBeGreaterThan(riskyConservative.adjustedVOR);

      // The ranking should flip: in aggressive risky might still be ahead or close,
      // but in conservative the safe player should definitely be ahead
      expect(conservativeGap).toBeLessThan(aggressiveGap);
    });
  });

  describe('Realistic Player Comparison Scenario', () => {
    // Scenario: Draft decision between two WR options
    // WR1: Higher projection but injury-prone and inconsistent
    // WR2: Lower projection but dependable and consistent

    const wr1Boom: IPlayerExtended = {
      index: 10,
      key: 'chase-jamarr',
      name: 'Ja\'Marr Chase',
      pos: 'WR',
      team: 'CIN',
      bye: 12,
      std: 8.0,
      halfPpr: 6.0,
      ppr: 4.5,
      forecast: 290,
      vor: 85,
      risk: {
        age: 24,
        injuryHistory: {
          gamesPlayed: [14, 16, 13],
          currentStatus: 'healthy',
        },
        weeklyScores: [5, 28, 8, 32, 12, 25, 6, 30, 10, 22, 8, 28, 15, 20, 10, 25],
      },
      recYd: 1500,
      recTd: 12,
      rec: 100,
    };

    const wr2Safe: IPlayerExtended = {
      index: 11,
      key: 'hill-tyreek',
      name: 'Tyreek Hill',
      pos: 'WR',
      team: 'MIA',
      bye: 6,
      std: 6.0,
      halfPpr: 5.0,
      ppr: 4.0,
      forecast: 275,
      vor: 75,
      risk: {
        age: 30,
        injuryHistory: {
          gamesPlayed: [17, 17, 17],
          currentStatus: 'healthy',
        },
        weeklyScores: [16, 18, 15, 17, 16, 18, 15, 17, 16, 18, 15, 17, 16, 18, 15, 17],
      },
      recYd: 1400,
      recTd: 10,
      rec: 95,
    };

    it('should calculate different adjusted VOR for each player based on risk', () => {
      const wr1Profile = buildRiskProfile(wr1Boom, DEFAULT_RISK_SETTINGS);
      const wr2Profile = buildRiskProfile(wr2Safe, DEFAULT_RISK_SETTINGS);

      // Verify the profiles differ
      expect(wr1Profile.consistencyScore).toBeLessThan(wr2Profile.consistencyScore);

      const wr1Result = calculateRiskAdjustedVOR(wr1Boom.vor!, wr1Profile, DEFAULT_RISK_SETTINGS);
      const wr2Result = calculateRiskAdjustedVOR(wr2Safe.vor!, wr2Profile, DEFAULT_RISK_SETTINGS);

      // Both should have valid results
      expect(wr1Result.baseVOR).toBe(85);
      expect(wr2Result.baseVOR).toBe(75);

      // Risk adjustment should differ
      expect(wr1Result.riskAdjustment).not.toBe(wr2Result.riskAdjustment);
      expect(wr1Result.consistencyAdjustment).not.toBe(wr2Result.consistencyAdjustment);
    });

    it('should allow conservative drafter to prefer safer option despite lower base VOR', () => {
      const conservativeSettings: IRiskSettings = {
        ...DEFAULT_RISK_SETTINGS,
        riskTolerance: 0.2,
      };

      const wr1Profile = buildRiskProfile(wr1Boom, conservativeSettings);
      const wr2Profile = buildRiskProfile(wr2Safe, conservativeSettings);

      const wr1Result = calculateRiskAdjustedVOR(wr1Boom.vor!, wr1Profile, conservativeSettings);
      const wr2Result = calculateRiskAdjustedVOR(wr2Safe.vor!, wr2Profile, conservativeSettings);

      // With conservative settings, the safer WR2 should have competitive or higher adjusted VOR
      // even though base VOR is 10 points lower (85 vs 75)
      // The gap should narrow significantly
      const adjustedGap = wr1Result.adjustedVOR - wr2Result.adjustedVOR;
      const baseGap = wr1Boom.vor! - wr2Safe.vor!; // 10 points

      expect(adjustedGap).toBeLessThan(baseGap);
    });

    it('should show floor/ceiling spread reflects consistency', () => {
      const wr1Profile = buildRiskProfile(wr1Boom, DEFAULT_RISK_SETTINGS);
      const wr2Profile = buildRiskProfile(wr2Safe, DEFAULT_RISK_SETTINGS);

      // Boom/bust player should have wider floor-ceiling spread
      const wr1Spread = wr1Profile.ceiling - wr1Profile.floor;
      const wr2Spread = wr2Profile.ceiling - wr2Profile.floor;

      expect(wr1Spread).toBeGreaterThan(wr2Spread);
    });

    it('should provide meaningful breakdown of adjustments', () => {
      const wr1Profile = buildRiskProfile(wr1Boom, DEFAULT_RISK_SETTINGS);
      const result = calculateRiskAdjustedVOR(wr1Boom.vor!, wr1Profile, DEFAULT_RISK_SETTINGS);

      // Verify we get a meaningful breakdown
      expect(result.baseVOR).toBe(85);
      expect(result.riskAdjustment).toBeLessThanOrEqual(0); // Injury risk is negative or zero
      expect(result.adjustedVOR).toBe(
        Math.round(result.baseVOR + result.riskAdjustment + result.consistencyAdjustment)
      );
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle player with no risk data gracefully', () => {
      const noRiskPlayer: IPlayerExtended = {
        index: 100,
        key: 'unknown-player',
        name: 'Unknown Player',
        pos: 'RB',
        team: 'NYG',
        bye: 11,
        std: 50.0,
        halfPpr: 50.0,
        ppr: 50.0,
        forecast: 200,
        vor: 50,
        // No risk property
      };

      const profile = buildRiskProfile(noRiskPlayer, DEFAULT_RISK_SETTINGS);

      // Should return sensible defaults
      expect(isValidRiskProfile(profile)).toBe(true);
      expect(profile.injuryScore).toBe(50); // Default moderate risk
      expect(profile.consistencyScore).toBe(0.7); // Default moderate consistency
      expect(profile.floor).toBe(200); // Same as forecast
      expect(profile.ceiling).toBe(200); // Same as forecast
    });

    it('should handle perfect player (0 injury risk, perfect consistency)', () => {
      const perfectProfile: IRiskProfile = {
        injuryScore: 0,
        consistencyScore: 1.0,
        floor: 300,
        ceiling: 300,
        weeklyVariance: 0,
      };

      const baseVOR = 100;
      const result = calculateRiskAdjustedVOR(baseVOR, perfectProfile, DEFAULT_RISK_SETTINGS);

      // Perfect player should retain all value
      expect(result.adjustedVOR).toBe(100);
      expect(result.riskAdjustment).toBe(0);
    });

    it('should handle maximum risk player (100 injury risk, 0 consistency)', () => {
      const maxRiskProfile: IRiskProfile = {
        injuryScore: 100,
        consistencyScore: 0.01, // Near zero but not exactly (would cause issues)
        floor: 0,
        ceiling: 400,
        weeklyVariance: 1.0,
      };

      const baseVOR = 100;

      // With conservative settings, should severely penalize
      const conservativeSettings: IRiskSettings = {
        ...DEFAULT_RISK_SETTINGS,
        riskTolerance: 0.2,
      };

      const result = calculateRiskAdjustedVOR(baseVOR, maxRiskProfile, conservativeSettings);

      // Should have significant negative adjustment
      expect(result.adjustedVOR).toBeLessThan(30);
      expect(result.riskAdjustment).toBeLessThan(0);
    });

    it('should handle DST position (no age concerns)', () => {
      const dstPlayer: IPlayerExtended = {
        index: 200,
        key: 'sf-defense',
        name: 'San Francisco 49ers',
        pos: 'DST',
        team: 'SF',
        bye: 9,
        std: 150.0,
        halfPpr: 150.0,
        ppr: 150.0,
        forecast: 130,
        vor: 30,
        risk: {
          age: 99, // DST doesn't have meaningful age
          injuryHistory: {
            gamesPlayed: [17, 17, 17],
            currentStatus: 'healthy',
          },
          weeklyScores: [8, 12, 6, 15, 10, 8, 12, 6, 15, 10, 8, 12, 6, 15, 10, 8],
        },
      };

      const profile = buildRiskProfile(dstPlayer, DEFAULT_RISK_SETTINGS);

      // DST should have low injury score (age threshold is 99, position risk is 0.1)
      expect(profile.injuryScore).toBeLessThan(30);
      expect(isValidRiskProfile(profile)).toBe(true);
    });

    it('should maintain type guard functionality through exports', () => {
      const dstPlayer: IPlayerExtended = {
        index: 200,
        key: 'test-player',
        name: 'Test Player',
        pos: 'WR',
        team: 'TST',
        bye: 10,
        std: 100.0,
        halfPpr: 100.0,
        ppr: 100.0,
        forecast: 250,
        advanced: {
          targetShare: 0.25,
          snapPct: 0.85,
        },
        risk: {
          age: 26,
          injuryHistory: {
            gamesPlayed: [17, 17, 17],
            currentStatus: 'healthy',
          },
          riskProfile: {
            injuryScore: 20,
            consistencyScore: 0.8,
            floor: 200,
            ceiling: 300,
            weeklyVariance: 0.2,
          },
        },
      };

      expect(hasAdvancedStats(dstPlayer)).toBe(true);
      expect(hasRiskProfile(dstPlayer)).toBe(true);

      // Player without these
      const basicPlayer: IPlayerExtended = {
        index: 201,
        key: 'basic-player',
        name: 'Basic Player',
        pos: 'QB',
        team: 'TST',
        bye: 10,
        std: 100.0,
        halfPpr: 100.0,
        ppr: 100.0,
        forecast: 300,
      };

      expect(hasAdvancedStats(basicPlayer)).toBe(false);
      expect(hasRiskProfile(basicPlayer)).toBe(false);
    });
  });
});
