import {
  Urgency,
  ValueIndicator,
  IEnhancedVOR,
  IPlayerRecommendation,
  IRecommendationSettings,
  DEFAULT_RECOMMENDATION_SETTINGS,
  isValidEnhancedVOR,
  isValidRecommendation,
} from '../EnhancedVOR';
import { IPlayerExtended } from '../Player';

describe('Enhanced VOR Model Interfaces', () => {
  describe('Urgency', () => {
    it('should accept valid urgency values', () => {
      const urgencies: Urgency[] = ['must-draft', 'high', 'medium', 'low'];
      expect(urgencies).toHaveLength(4);
      expect(urgencies).toContain('must-draft');
      expect(urgencies).toContain('high');
      expect(urgencies).toContain('medium');
      expect(urgencies).toContain('low');
    });
  });

  describe('ValueIndicator', () => {
    it('should accept valid value indicator values', () => {
      const indicators: ValueIndicator[] = [
        'steal',
        'good-value',
        'fair',
        'reach',
        'avoid',
      ];
      expect(indicators).toHaveLength(5);
      expect(indicators).toContain('steal');
      expect(indicators).toContain('good-value');
      expect(indicators).toContain('fair');
      expect(indicators).toContain('reach');
      expect(indicators).toContain('avoid');
    });
  });

  describe('IEnhancedVOR', () => {
    it('should have all required properties', () => {
      const enhancedVOR: IEnhancedVOR = {
        playerId: 'player-123',
        playerName: 'Patrick Mahomes',
        position: 'QB',
        baseVOR: 45.5,
        forecast: 320.0,
        riskAdjustment: -5.0,
        scheduleAdjustment: 3.5,
        scarcityPremium: 2.0,
        enhancedVOR: 46.0,
        overallRank: 5,
        positionRank: 1,
        adpDiff: 10,
      };

      expect(enhancedVOR.playerId).toBe('player-123');
      expect(enhancedVOR.playerName).toBe('Patrick Mahomes');
      expect(enhancedVOR.position).toBe('QB');
      expect(enhancedVOR.baseVOR).toBe(45.5);
      expect(enhancedVOR.forecast).toBe(320.0);
      expect(enhancedVOR.riskAdjustment).toBe(-5.0);
      expect(enhancedVOR.scheduleAdjustment).toBe(3.5);
      expect(enhancedVOR.scarcityPremium).toBe(2.0);
      expect(enhancedVOR.enhancedVOR).toBe(46.0);
      expect(enhancedVOR.overallRank).toBe(5);
      expect(enhancedVOR.positionRank).toBe(1);
      expect(enhancedVOR.adpDiff).toBe(10);
    });

    it('should support negative adjustments', () => {
      const enhancedVOR: IEnhancedVOR = {
        playerId: 'player-456',
        playerName: 'Saquon Barkley',
        position: 'RB',
        baseVOR: 60.0,
        forecast: 280.0,
        riskAdjustment: -15.0, // High injury risk
        scheduleAdjustment: -2.5, // Tough schedule
        scarcityPremium: 10.0,
        enhancedVOR: 52.5,
        overallRank: 8,
        positionRank: 3,
        adpDiff: -5, // Reach
      };

      expect(enhancedVOR.riskAdjustment).toBeLessThan(0);
      expect(enhancedVOR.scheduleAdjustment).toBeLessThan(0);
      expect(enhancedVOR.adpDiff).toBeLessThan(0);
    });

    it('should support all position types', () => {
      const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'] as const;

      positions.forEach((pos) => {
        const enhancedVOR: IEnhancedVOR = {
          playerId: `player-${pos}`,
          playerName: `Test ${pos}`,
          position: pos,
          baseVOR: 25.0,
          forecast: 150.0,
          riskAdjustment: 0,
          scheduleAdjustment: 0,
          scarcityPremium: 0,
          enhancedVOR: 25.0,
          overallRank: 50,
          positionRank: 10,
          adpDiff: 0,
        };

        expect(enhancedVOR.position).toBe(pos);
      });
    });
  });

  describe('IPlayerRecommendation', () => {
    const createMockPlayer = (): IPlayerExtended => ({
      index: 1,
      key: 'player-123',
      name: 'Patrick Mahomes',
      pos: 'QB',
      team: 'KC',
      bye: 10,
      std: 15.5,
      halfPpr: 320.0,
      ppr: 320.0,
      passAtt: 580,
      passCmp: 390,
      passYd: 4800,
      passTD: 38,
      int: 10,
      rushAtt: 60,
      rushYd: 350,
      rushTD: 3,
      rec: 0,
      recYd: 0,
      recTD: 0,
      fumbles: 2,
      fg: 0,
      fgMiss: 0,
      xp: 0,
      sacks: 0,
      defInt: 0,
      fumRec: 0,
      defTD: 0,
      safeties: 0,
      ptsAllowed: 0,
      forecast: 320.0,
      vor: 45.5,
    });

    const createMockEnhancedVOR = (): IEnhancedVOR => ({
      playerId: 'player-123',
      playerName: 'Patrick Mahomes',
      position: 'QB',
      baseVOR: 45.5,
      forecast: 320.0,
      riskAdjustment: -5.0,
      scheduleAdjustment: 3.5,
      scarcityPremium: 2.0,
      enhancedVOR: 46.0,
      overallRank: 5,
      positionRank: 1,
      adpDiff: 10,
    });

    it('should have all required properties', () => {
      const recommendation: IPlayerRecommendation = {
        player: createMockPlayer(),
        enhancedVOR: createMockEnhancedVOR(),
        reasons: ['Elite QB production', 'Favorable schedule weeks 1-4'],
        urgency: 'high',
        valueIndicator: 'good-value',
      };

      expect(recommendation.player).toBeDefined();
      expect(recommendation.enhancedVOR).toBeDefined();
      expect(recommendation.reasons).toHaveLength(2);
      expect(recommendation.urgency).toBe('high');
      expect(recommendation.valueIndicator).toBe('good-value');
    });

    it('should support all urgency levels', () => {
      const urgencyLevels: Urgency[] = ['must-draft', 'high', 'medium', 'low'];

      urgencyLevels.forEach((urgency) => {
        const recommendation: IPlayerRecommendation = {
          player: createMockPlayer(),
          enhancedVOR: createMockEnhancedVOR(),
          reasons: ['Test reason'],
          urgency,
          valueIndicator: 'fair',
        };

        expect(recommendation.urgency).toBe(urgency);
      });
    });

    it('should support all value indicators', () => {
      const valueIndicators: ValueIndicator[] = [
        'steal',
        'good-value',
        'fair',
        'reach',
        'avoid',
      ];

      valueIndicators.forEach((indicator) => {
        const recommendation: IPlayerRecommendation = {
          player: createMockPlayer(),
          enhancedVOR: createMockEnhancedVOR(),
          reasons: ['Test reason'],
          urgency: 'medium',
          valueIndicator: indicator,
        };

        expect(recommendation.valueIndicator).toBe(indicator);
      });
    });

    it('should support empty reasons array', () => {
      const recommendation: IPlayerRecommendation = {
        player: createMockPlayer(),
        enhancedVOR: createMockEnhancedVOR(),
        reasons: [],
        urgency: 'low',
        valueIndicator: 'fair',
      };

      expect(recommendation.reasons).toHaveLength(0);
    });

    it('should support multiple reasons', () => {
      const recommendation: IPlayerRecommendation = {
        player: createMockPlayer(),
        enhancedVOR: createMockEnhancedVOR(),
        reasons: [
          'Consistent performer',
          'Low injury risk',
          'Favorable playoff schedule',
          'High target share',
        ],
        urgency: 'must-draft',
        valueIndicator: 'steal',
      };

      expect(recommendation.reasons).toHaveLength(4);
    });
  });

  describe('IRecommendationSettings', () => {
    it('should have all required properties', () => {
      const settings: IRecommendationSettings = {
        topNPlayers: 5,
        adpValueThreshold: 15,
        urgencyThresholds: { mustDraft: 30, high: 20, medium: 10 },
      };

      expect(settings.topNPlayers).toBe(5);
      expect(settings.adpValueThreshold).toBe(15);
      expect(settings.urgencyThresholds.mustDraft).toBe(30);
      expect(settings.urgencyThresholds.high).toBe(20);
      expect(settings.urgencyThresholds.medium).toBe(10);
    });

    it('should support custom values', () => {
      const customSettings: IRecommendationSettings = {
        topNPlayers: 10,
        adpValueThreshold: 20,
        urgencyThresholds: { mustDraft: 40, high: 25, medium: 15 },
      };

      expect(customSettings.topNPlayers).toBe(10);
      expect(customSettings.adpValueThreshold).toBe(20);
      expect(customSettings.urgencyThresholds.mustDraft).toBe(40);
    });
  });

  describe('DEFAULT_RECOMMENDATION_SETTINGS', () => {
    it('should have topNPlayers of 5', () => {
      expect(DEFAULT_RECOMMENDATION_SETTINGS.topNPlayers).toBe(5);
    });

    it('should have adpValueThreshold of 15', () => {
      expect(DEFAULT_RECOMMENDATION_SETTINGS.adpValueThreshold).toBe(15);
    });

    it('should have correct urgency thresholds', () => {
      expect(DEFAULT_RECOMMENDATION_SETTINGS.urgencyThresholds.mustDraft).toBe(
        30
      );
      expect(DEFAULT_RECOMMENDATION_SETTINGS.urgencyThresholds.high).toBe(20);
      expect(DEFAULT_RECOMMENDATION_SETTINGS.urgencyThresholds.medium).toBe(10);
    });

    it('should have urgency thresholds in descending order', () => {
      const { mustDraft, high, medium } =
        DEFAULT_RECOMMENDATION_SETTINGS.urgencyThresholds;
      expect(mustDraft).toBeGreaterThan(high);
      expect(high).toBeGreaterThan(medium);
    });
  });

  describe('isValidEnhancedVOR', () => {
    it('should return true for valid enhanced VOR', () => {
      const validVOR: IEnhancedVOR = {
        playerId: 'player-123',
        playerName: 'Patrick Mahomes',
        position: 'QB',
        baseVOR: 45.5,
        forecast: 320.0,
        riskAdjustment: -5.0,
        scheduleAdjustment: 3.5,
        scarcityPremium: 2.0,
        enhancedVOR: 46.0,
        overallRank: 5,
        positionRank: 1,
        adpDiff: 10,
      };
      expect(isValidEnhancedVOR(validVOR)).toBe(true);
    });

    it('should return true for VOR with zero adjustments', () => {
      const zeroAdjustments: IEnhancedVOR = {
        playerId: 'player-456',
        playerName: 'Test Player',
        position: 'WR',
        baseVOR: 30.0,
        forecast: 200.0,
        riskAdjustment: 0,
        scheduleAdjustment: 0,
        scarcityPremium: 0,
        enhancedVOR: 30.0,
        overallRank: 25,
        positionRank: 10,
        adpDiff: 0,
      };
      expect(isValidEnhancedVOR(zeroAdjustments)).toBe(true);
    });

    it('should return true for VOR with negative values', () => {
      const negativeValues: IEnhancedVOR = {
        playerId: 'player-789',
        playerName: 'Risky Player',
        position: 'RB',
        baseVOR: 10.0,
        forecast: 100.0,
        riskAdjustment: -20.0,
        scheduleAdjustment: -5.0,
        scarcityPremium: 5.0,
        enhancedVOR: -10.0, // Below replacement level
        overallRank: 150,
        positionRank: 60,
        adpDiff: -30,
      };
      expect(isValidEnhancedVOR(negativeValues)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isValidEnhancedVOR(null)).toBe(false);
      expect(isValidEnhancedVOR(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isValidEnhancedVOR('string')).toBe(false);
      expect(isValidEnhancedVOR(123)).toBe(false);
      expect(isValidEnhancedVOR([])).toBe(false);
    });

    it('should return false for missing playerId', () => {
      const missingPlayerId = {
        playerName: 'Test Player',
        position: 'QB',
        baseVOR: 45.5,
        forecast: 320.0,
        riskAdjustment: -5.0,
        scheduleAdjustment: 3.5,
        scarcityPremium: 2.0,
        enhancedVOR: 46.0,
        overallRank: 5,
        positionRank: 1,
        adpDiff: 10,
      };
      expect(isValidEnhancedVOR(missingPlayerId)).toBe(false);
    });

    it('should return false for missing numeric properties', () => {
      const missingBaseVOR = {
        playerId: 'player-123',
        playerName: 'Test Player',
        position: 'QB',
        forecast: 320.0,
        riskAdjustment: -5.0,
        scheduleAdjustment: 3.5,
        scarcityPremium: 2.0,
        enhancedVOR: 46.0,
        overallRank: 5,
        positionRank: 1,
        adpDiff: 10,
      };
      expect(isValidEnhancedVOR(missingBaseVOR)).toBe(false);
    });

    it('should return false for non-string playerId', () => {
      const nonStringPlayerId = {
        playerId: 123,
        playerName: 'Test Player',
        position: 'QB',
        baseVOR: 45.5,
        forecast: 320.0,
        riskAdjustment: -5.0,
        scheduleAdjustment: 3.5,
        scarcityPremium: 2.0,
        enhancedVOR: 46.0,
        overallRank: 5,
        positionRank: 1,
        adpDiff: 10,
      };
      expect(isValidEnhancedVOR(nonStringPlayerId)).toBe(false);
    });

    it('should return false for non-number numeric properties', () => {
      const nonNumberBaseVOR = {
        playerId: 'player-123',
        playerName: 'Test Player',
        position: 'QB',
        baseVOR: '45.5',
        forecast: 320.0,
        riskAdjustment: -5.0,
        scheduleAdjustment: 3.5,
        scarcityPremium: 2.0,
        enhancedVOR: 46.0,
        overallRank: 5,
        positionRank: 1,
        adpDiff: 10,
      };
      expect(isValidEnhancedVOR(nonNumberBaseVOR)).toBe(false);
    });
  });

  describe('isValidRecommendation', () => {
    const createValidRecommendation = (): IPlayerRecommendation => ({
      player: {
        index: 1,
        key: 'player-123',
        name: 'Patrick Mahomes',
        pos: 'QB',
        team: 'KC',
        bye: 10,
        std: 15.5,
        halfPpr: 320.0,
        ppr: 320.0,
        passAtt: 580,
        passCmp: 390,
        passYd: 4800,
        passTD: 38,
        int: 10,
        rushAtt: 60,
        rushYd: 350,
        rushTD: 3,
        rec: 0,
        recYd: 0,
        recTD: 0,
        fumbles: 2,
        fg: 0,
        fgMiss: 0,
        xp: 0,
        sacks: 0,
        defInt: 0,
        fumRec: 0,
        defTD: 0,
        safeties: 0,
        ptsAllowed: 0,
        forecast: 320.0,
        vor: 45.5,
      },
      enhancedVOR: {
        playerId: 'player-123',
        playerName: 'Patrick Mahomes',
        position: 'QB',
        baseVOR: 45.5,
        forecast: 320.0,
        riskAdjustment: -5.0,
        scheduleAdjustment: 3.5,
        scarcityPremium: 2.0,
        enhancedVOR: 46.0,
        overallRank: 5,
        positionRank: 1,
        adpDiff: 10,
      },
      reasons: ['Test reason'],
      urgency: 'high',
      valueIndicator: 'good-value',
    });

    it('should return true for valid recommendation', () => {
      const validRec = createValidRecommendation();
      expect(isValidRecommendation(validRec)).toBe(true);
    });

    it('should return true for recommendation with empty reasons', () => {
      const recWithEmptyReasons = createValidRecommendation();
      recWithEmptyReasons.reasons = [];
      expect(isValidRecommendation(recWithEmptyReasons)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isValidRecommendation(null)).toBe(false);
      expect(isValidRecommendation(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isValidRecommendation('string')).toBe(false);
      expect(isValidRecommendation(123)).toBe(false);
      expect(isValidRecommendation([])).toBe(false);
    });

    it('should return false for missing player', () => {
      const missingPlayer = {
        enhancedVOR: {
          playerId: 'player-123',
          playerName: 'Test',
          position: 'QB',
          baseVOR: 45.5,
          forecast: 320.0,
          riskAdjustment: 0,
          scheduleAdjustment: 0,
          scarcityPremium: 0,
          enhancedVOR: 45.5,
          overallRank: 5,
          positionRank: 1,
          adpDiff: 0,
        },
        reasons: ['Test'],
        urgency: 'high',
        valueIndicator: 'fair',
      };
      expect(isValidRecommendation(missingPlayer)).toBe(false);
    });

    it('should return false for missing enhancedVOR', () => {
      const missingEnhancedVOR = {
        player: {
          index: 1,
          key: 'player-123',
          name: 'Test',
          pos: 'QB',
          team: 'KC',
          bye: 10,
          std: 15.5,
          halfPpr: 320.0,
          ppr: 320.0,
        },
        reasons: ['Test'],
        urgency: 'high',
        valueIndicator: 'fair',
      };
      expect(isValidRecommendation(missingEnhancedVOR)).toBe(false);
    });

    it('should return false for missing reasons', () => {
      const rec = createValidRecommendation();
      const missingReasons = { ...rec } as Record<string, unknown>;
      delete missingReasons.reasons;
      expect(isValidRecommendation(missingReasons)).toBe(false);
    });

    it('should return false for non-array reasons', () => {
      const nonArrayReasons = {
        player: { index: 1, key: 'player-123', name: 'Test' },
        enhancedVOR: { playerId: 'player-123' },
        reasons: 'not an array',
        urgency: 'high',
        valueIndicator: 'fair',
      };
      expect(isValidRecommendation(nonArrayReasons)).toBe(false);
    });

    it('should return false for invalid urgency value', () => {
      const invalidUrgency = {
        player: { index: 1, key: 'player-123', name: 'Test' },
        enhancedVOR: { playerId: 'player-123' },
        reasons: ['Test'],
        urgency: 'invalid-urgency',
        valueIndicator: 'fair',
      };
      expect(isValidRecommendation(invalidUrgency)).toBe(false);
    });

    it('should return false for invalid valueIndicator value', () => {
      const invalidIndicator = {
        player: { index: 1, key: 'player-123', name: 'Test' },
        enhancedVOR: { playerId: 'player-123' },
        reasons: ['Test'],
        urgency: 'high',
        valueIndicator: 'invalid-indicator',
      };
      expect(isValidRecommendation(invalidIndicator)).toBe(false);
    });
  });
});
