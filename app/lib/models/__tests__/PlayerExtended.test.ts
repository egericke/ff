import {
  IPlayer,
  IPlayerAdvanced,
  IPlayerRisk,
  IPlayerExtended,
  hasAdvancedStats,
  hasRiskProfile,
} from '../Player';

describe('Extended Player Interfaces', () => {
  describe('IPlayerRisk', () => {
    it('should have required age and injuryHistory properties', () => {
      const playerRisk: IPlayerRisk = {
        age: 28,
        injuryHistory: {
          gamesPlayed: [17, 15, 16],
          currentStatus: 'healthy',
        },
      };

      expect(playerRisk.age).toBe(28);
      expect(playerRisk.injuryHistory.gamesPlayed).toEqual([17, 15, 16]);
      expect(playerRisk.injuryHistory.currentStatus).toBe('healthy');
    });

    it('should allow optional riskProfile property', () => {
      const playerRiskWithProfile: IPlayerRisk = {
        age: 30,
        injuryHistory: {
          gamesPlayed: [14, 12, 16],
          currentStatus: 'questionable',
        },
        riskProfile: {
          injuryScore: 65,
          consistencyScore: 0.6,
          floor: 5,
          ceiling: 22,
          weeklyVariance: 8,
        },
      };

      expect(playerRiskWithProfile.riskProfile).toBeDefined();
      expect(playerRiskWithProfile.riskProfile?.injuryScore).toBe(65);
    });

    it('should allow optional weeklyScores property', () => {
      const playerRiskWithScores: IPlayerRisk = {
        age: 25,
        injuryHistory: {
          gamesPlayed: [17, 17, 17],
          currentStatus: 'healthy',
        },
        weeklyScores: [12.5, 18.2, 15.0, 22.3, 8.5, 14.7],
      };

      expect(playerRiskWithScores.weeklyScores).toHaveLength(6);
      expect(playerRiskWithScores.weeklyScores?.[0]).toBe(12.5);
    });
  });

  // Helper function to create a base player for tests with all required IScoring fields
  const createBasePlayer = (): IPlayer => ({
    index: 1,
    key: 'player-1',
    name: 'Test Player',
    pos: 'WR',
    team: 'TST',
    bye: 10,
    std: 15.0,
    halfPpr: 18.0,
    ppr: 21.0,
    // Scoring stats - all default to 0
    passYds: 0,
    passTds: 0,
    passInts: 0,
    receptions: 0,
    receptionYds: 0,
    receptionTds: 0,
    rushYds: 0,
    rushTds: 0,
    fumbles: 0,
    twoPts: 0,
    kickExtraPoints: 0,
    kick019: 0,
    kick2029: 0,
    kick3039: 0,
    kick4049: 0,
    kick50: 0,
    dfInts: 0,
    dfTds: 0,
    dfSacks: 0,
    dfPointsAllowedPerGame: 0,
    dfFumbles: 0,
    dfSafeties: 0,
  });

  describe('IPlayerAdvanced', () => {
    it('should have all optional advanced stats properties', () => {
      const advancedStats: IPlayerAdvanced = {
        targetShare: 0.25,
        airYards: 850,
        redZoneTargets: 15,
        snapPct: 0.85,
        yardsPerRouteRun: 2.1,
        yardsAfterContact: 3.5,
        pressureRate: 0.28,
        passBlockWinRate: 0.72,
      };

      expect(advancedStats.targetShare).toBe(0.25);
      expect(advancedStats.airYards).toBe(850);
      expect(advancedStats.redZoneTargets).toBe(15);
      expect(advancedStats.snapPct).toBe(0.85);
      expect(advancedStats.yardsPerRouteRun).toBe(2.1);
      expect(advancedStats.yardsAfterContact).toBe(3.5);
      expect(advancedStats.pressureRate).toBe(0.28);
      expect(advancedStats.passBlockWinRate).toBe(0.72);
    });

    it('should allow partial advanced stats', () => {
      const partialStats: IPlayerAdvanced = {
        targetShare: 0.22,
      };
      expect(partialStats.targetShare).toBe(0.22);
    });

    it('should allow empty advanced stats object', () => {
      const emptyStats: IPlayerAdvanced = {};
      expect(Object.keys(emptyStats)).toHaveLength(0);
    });
  });

  describe('hasAdvancedStats', () => {
    it('should return true when player has advanced stats', () => {
      const playerWithAdvanced: IPlayerExtended = {
        ...createBasePlayer(),
        advanced: { targetShare: 0.25 },
      };
      expect(hasAdvancedStats(playerWithAdvanced)).toBe(true);
    });

    it('should return false when player has no advanced stats', () => {
      const playerWithoutAdvanced: IPlayerExtended = {
        ...createBasePlayer(),
      };
      expect(hasAdvancedStats(playerWithoutAdvanced)).toBe(false);
    });
  });

  describe('hasRiskProfile', () => {
    it('should return true when player has risk profile', () => {
      const playerWithRiskProfile: IPlayerExtended = {
        ...createBasePlayer(),
        risk: {
          age: 28,
          injuryHistory: { gamesPlayed: [16, 15, 17], currentStatus: 'healthy' },
          riskProfile: { injuryScore: 30, consistencyScore: 0.75, floor: 8, ceiling: 22, weeklyVariance: 5 },
        },
      };
      expect(hasRiskProfile(playerWithRiskProfile)).toBe(true);
    });

    it('should return false when player has no risk profile', () => {
      const playerWithoutRisk: IPlayerExtended = {
        ...createBasePlayer(),
      };
      expect(hasRiskProfile(playerWithoutRisk)).toBe(false);
    });
  });
});

