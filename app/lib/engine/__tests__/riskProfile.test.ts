/**
 * Tests for risk profile builder.
 * Tests building complete risk profiles from player data.
 */

import { buildRiskProfile } from '../riskProfile';
import { IPlayerExtended } from '../../models/Player';
import { IRiskSettings, DEFAULT_RISK_SETTINGS } from '../../models/Risk';

describe('Risk Profile Builder', () => {
  const defaultSettings: IRiskSettings = DEFAULT_RISK_SETTINGS;

  /**
   * Helper to create a minimal player for testing.
   */
  function createTestPlayer(overrides: Partial<IPlayerExtended> = {}): IPlayerExtended {
    return {
      index: 1,
      key: 'test-player-1',
      name: 'Test Player',
      pos: 'RB',
      team: 'TEST',
      bye: 7,
      std: 50,
      halfPpr: 200,
      ppr: 220,
      passYds: 0,
      passTds: 0,
      ints: 0,
      rushYds: 1000,
      rushTds: 8,
      receptions: 30,
      recYds: 250,
      recTds: 2,
      forecast: 200,
      ...overrides,
    };
  }

  describe('Player with full risk data', () => {
    it('should return complete calculated profile for player with all risk data', () => {
      const player = createTestPlayer({
        pos: 'RB',
        forecast: 200,
        risk: {
          age: 28,
          injuryHistory: {
            gamesPlayed: [15, 16, 14],
            currentStatus: 'healthy',
          },
          weeklyScores: [12, 14, 11, 15, 13, 12, 14, 13, 11, 15, 12, 14, 13, 12, 14, 15, 13],
        },
      });

      const profile = buildRiskProfile(player, defaultSettings);

      // Should have calculated values, not defaults
      expect(profile.injuryScore).toBeGreaterThan(0);
      expect(profile.injuryScore).toBeLessThanOrEqual(100);
      expect(profile.consistencyScore).toBeGreaterThan(0);
      expect(profile.consistencyScore).toBeLessThanOrEqual(1);
      expect(profile.floor).toBeLessThanOrEqual(profile.ceiling);
      expect(profile.weeklyVariance).toBeGreaterThanOrEqual(0);
    });

    it('should calculate injuryScore using calculateInjuryRisk', () => {
      // Injury-prone RB (missed many games)
      const injuredPlayer = createTestPlayer({
        pos: 'RB',
        forecast: 180,
        risk: {
          age: 29,
          injuryHistory: {
            gamesPlayed: [8, 10, 6],
            currentStatus: 'questionable',
          },
          weeklyScores: [15, 12, 18],
        },
      });

      // Healthy young QB
      const healthyPlayer = createTestPlayer({
        pos: 'QB',
        forecast: 300,
        risk: {
          age: 25,
          injuryHistory: {
            gamesPlayed: [17, 17, 17],
            currentStatus: 'healthy',
          },
          weeklyScores: [18, 20, 19],
        },
      });

      const injuredProfile = buildRiskProfile(injuredPlayer, defaultSettings);
      const healthyProfile = buildRiskProfile(healthyPlayer, defaultSettings);

      // Injured RB should have much higher injury score
      expect(injuredProfile.injuryScore).toBeGreaterThan(healthyProfile.injuryScore);
    });

    it('should calculate consistencyScore when weeklyScores exist', () => {
      // Consistent player - low variance
      const consistentPlayer = createTestPlayer({
        forecast: 200,
        risk: {
          age: 25,
          injuryHistory: {
            gamesPlayed: [17, 17, 17],
            currentStatus: 'healthy',
          },
          weeklyScores: [12, 12, 12, 12, 12, 12, 12, 12, 12],
        },
      });

      // Boom/bust player - high variance
      const boomBustPlayer = createTestPlayer({
        forecast: 200,
        risk: {
          age: 25,
          injuryHistory: {
            gamesPlayed: [17, 17, 17],
            currentStatus: 'healthy',
          },
          weeklyScores: [5, 30, 8, 25, 3, 28, 6, 27],
        },
      });

      const consistentProfile = buildRiskProfile(consistentPlayer, defaultSettings);
      const boomBustProfile = buildRiskProfile(boomBustPlayer, defaultSettings);

      // Consistent player should have higher consistency score
      expect(consistentProfile.consistencyScore).toBeGreaterThan(boomBustProfile.consistencyScore);
    });

    it('should calculate floor/ceiling when weeklyScores exist', () => {
      const player = createTestPlayer({
        forecast: 250,
        risk: {
          age: 26,
          injuryHistory: {
            gamesPlayed: [17, 17, 17],
            currentStatus: 'healthy',
          },
          weeklyScores: [10, 12, 15, 18, 20, 22, 25, 28, 30, 32],
        },
      });

      const profile = buildRiskProfile(player, defaultSettings);

      // Floor should be less than forecast, ceiling should be greater
      expect(profile.floor).toBeLessThan(player.forecast!);
      expect(profile.ceiling).toBeGreaterThan(player.forecast!);
    });
  });

  describe('Player without risk data', () => {
    it('should return default profile with moderate values', () => {
      const player = createTestPlayer({
        forecast: 200,
        risk: undefined,
      });

      const profile = buildRiskProfile(player, defaultSettings);

      expect(profile.injuryScore).toBe(50);
      expect(profile.consistencyScore).toBe(0.7);
      expect(profile.weeklyVariance).toBe(0.3);
    });

    it('should use forecast as both floor and ceiling when no risk data', () => {
      const player = createTestPlayer({
        forecast: 250,
        risk: undefined,
      });

      const profile = buildRiskProfile(player, defaultSettings);

      expect(profile.floor).toBe(250);
      expect(profile.ceiling).toBe(250);
    });

    it('should use 0 as floor/ceiling when no forecast and no risk data', () => {
      const player = createTestPlayer({
        forecast: undefined,
        risk: undefined,
      });

      const profile = buildRiskProfile(player, defaultSettings);

      expect(profile.floor).toBe(0);
      expect(profile.ceiling).toBe(0);
    });
  });

  describe('Player with partial risk data', () => {
    it('should calculate injury score but use defaults for consistency when no weeklyScores', () => {
      const player = createTestPlayer({
        pos: 'WR',
        forecast: 180,
        risk: {
          age: 28,
          injuryHistory: {
            gamesPlayed: [16, 15, 17],
            currentStatus: 'healthy',
          },
          // No weeklyScores
        },
      });

      const profile = buildRiskProfile(player, defaultSettings);

      // Should have calculated injury score (not default 50)
      // WR with age 28 (under threshold 30) and healthy history should have low risk
      expect(profile.injuryScore).toBeDefined();
      expect(profile.injuryScore).toBeGreaterThanOrEqual(0);
      expect(profile.injuryScore).toBeLessThanOrEqual(100);

      // Should have default consistency values since no weeklyScores
      expect(profile.consistencyScore).toBe(0.7);
      expect(profile.weeklyVariance).toBe(0.3);
      expect(profile.floor).toBe(180);
      expect(profile.ceiling).toBe(180);
    });

    it('should handle empty weeklyScores array', () => {
      const player = createTestPlayer({
        forecast: 200,
        risk: {
          age: 25,
          injuryHistory: {
            gamesPlayed: [17, 17, 17],
            currentStatus: 'healthy',
          },
          weeklyScores: [],
        },
      });

      const profile = buildRiskProfile(player, defaultSettings);

      // Empty array should be treated like no weeklyScores
      expect(profile.consistencyScore).toBe(0.7);
      expect(profile.weeklyVariance).toBe(0.3);
      expect(profile.floor).toBe(200);
      expect(profile.ceiling).toBe(200);
    });
  });

  describe('Edge cases', () => {
    it('should handle injury-prone older RB correctly', () => {
      const oldInjuredRB = createTestPlayer({
        pos: 'RB',
        forecast: 150,
        risk: {
          age: 32, // 5 years over RB threshold of 27
          injuryHistory: {
            gamesPlayed: [6, 8, 10],
            currentStatus: 'questionable',
          },
          weeklyScores: [5, 20, 8, 25, 3, 18],
        },
      });

      const youngHealthyRB = createTestPlayer({
        pos: 'RB',
        forecast: 200,
        risk: {
          age: 23,
          injuryHistory: {
            gamesPlayed: [17, 17, 17],
            currentStatus: 'healthy',
          },
          weeklyScores: [12, 14, 11, 15, 13, 12],
        },
      });

      const oldProfile = buildRiskProfile(oldInjuredRB, defaultSettings);
      const youngProfile = buildRiskProfile(youngHealthyRB, defaultSettings);

      // Old injured RB should have much higher injury score
      expect(oldProfile.injuryScore).toBeGreaterThan(youngProfile.injuryScore);
      // Difference should be significant (at least 20 points)
      expect(oldProfile.injuryScore - youngProfile.injuryScore).toBeGreaterThan(20);
    });

    it('should calculate weekly variance from floor/ceiling result', () => {
      const player = createTestPlayer({
        forecast: 200,
        risk: {
          age: 25,
          injuryHistory: {
            gamesPlayed: [17, 17, 17],
            currentStatus: 'healthy',
          },
          weeklyScores: [10, 15, 20, 25, 30, 35],
        },
      });

      const profile = buildRiskProfile(player, defaultSettings);

      // Weekly variance should come from floor/ceiling calculation
      expect(profile.weeklyVariance).toBeGreaterThan(0);
      expect(profile.weeklyVariance).toBeLessThan(1);
    });

    it('should handle zero forecast with risk data', () => {
      const player = createTestPlayer({
        forecast: 0,
        risk: {
          age: 25,
          injuryHistory: {
            gamesPlayed: [17, 17, 17],
            currentStatus: 'healthy',
          },
          weeklyScores: [0, 0, 0],
        },
      });

      const profile = buildRiskProfile(player, defaultSettings);

      expect(profile.floor).toBe(0);
      expect(profile.ceiling).toBe(0);
    });

    it('should produce valid IRiskProfile with all required fields', () => {
      const player = createTestPlayer({
        forecast: 200,
        risk: {
          age: 26,
          injuryHistory: {
            gamesPlayed: [15, 16, 14],
            currentStatus: 'healthy',
          },
          weeklyScores: [12, 14, 11, 15, 13],
        },
      });

      const profile = buildRiskProfile(player, defaultSettings);

      // Verify all required fields exist
      expect(profile).toHaveProperty('injuryScore');
      expect(profile).toHaveProperty('consistencyScore');
      expect(profile).toHaveProperty('floor');
      expect(profile).toHaveProperty('ceiling');
      expect(profile).toHaveProperty('weeklyVariance');

      // Verify types
      expect(typeof profile.injuryScore).toBe('number');
      expect(typeof profile.consistencyScore).toBe('number');
      expect(typeof profile.floor).toBe('number');
      expect(typeof profile.ceiling).toBe('number');
      expect(typeof profile.weeklyVariance).toBe('number');
    });
  });
});
