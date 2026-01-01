/**
 * Tests for the Recommendation Engine functions.
 * These tests verify the recommendation logic for player draft suggestions
 * based on enhanced VOR, scarcity alerts, and positional needs.
 */

import {
  getTopRecommendations,
  getValueIndicator,
  getUrgency,
  generateReasons,
} from '../recommendations';
import {
  IEnhancedVOR,
  IRecommendationSettings,
  DEFAULT_RECOMMENDATION_SETTINGS,
} from '../../models/EnhancedVOR';
import { IPlayerExtended, Position } from '../../models/Player';
import { IDropOffAlert, AlertSeverity } from '../../models/Scarcity';

/**
 * Helper function to create a mock player with specified values.
 */
function createMockPlayer(overrides: Partial<IPlayerExtended> = {}): IPlayerExtended {
  return {
    index: 1,
    key: 'player-1',
    name: 'Test Player',
    pos: 'RB' as Position,
    team: 'KC',
    bye: 10,
    std: 15,
    halfPpr: 12,
    ppr: 10,
    vor: 50,
    forecast: 200,
    // IScoring properties
    passYds: 0,
    passTds: 0,
    passInts: 0,
    receptions: 40,
    receptionYds: 300,
    receptionTds: 2,
    rushYds: 800,
    rushTds: 8,
    fumbles: 1,
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
    ...overrides,
  };
}

/**
 * Helper function to create a mock enhanced VOR object.
 */
function createMockEnhancedVOR(overrides: Partial<IEnhancedVOR> = {}): IEnhancedVOR {
  return {
    playerId: 'player-1',
    playerName: 'Test Player',
    position: 'RB' as Position,
    baseVOR: 50,
    forecast: 200,
    riskAdjustment: 0,
    scheduleAdjustment: 0,
    scarcityPremium: 0,
    enhancedVOR: 50,
    overallRank: 1,
    positionRank: 1,
    adpDiff: 0,
    ...overrides,
  };
}

/**
 * Helper function to create a mock drop-off alert.
 */
function createMockDropOffAlert(
  position: Position,
  severity: AlertSeverity = 'warning',
  overrides: Partial<IDropOffAlert> = {}
): IDropOffAlert {
  return {
    position,
    currentTierAvgVOR: 60,
    nextTierAvgVOR: 30,
    dropOffPoints: 30,
    picksUntilDrop: 5,
    severity,
    ...overrides,
  };
}

/**
 * Helper function to create test recommendation settings.
 */
function createTestSettings(overrides: Partial<IRecommendationSettings> = {}): IRecommendationSettings {
  return {
    ...DEFAULT_RECOMMENDATION_SETTINGS,
    ...overrides,
  };
}

describe('Recommendation Engine', () => {
  describe('getValueIndicator', () => {
    const settings = createTestSettings({ adpValueThreshold: 15 });

    it('should return "steal" for adpDiff >= adpValueThreshold (15)', () => {
      expect(getValueIndicator(15, settings)).toBe('steal');
      expect(getValueIndicator(20, settings)).toBe('steal');
      expect(getValueIndicator(100, settings)).toBe('steal');
    });

    it('should return "good-value" for adpDiff >= 5 and < adpValueThreshold', () => {
      expect(getValueIndicator(5, settings)).toBe('good-value');
      expect(getValueIndicator(10, settings)).toBe('good-value');
      expect(getValueIndicator(14, settings)).toBe('good-value');
    });

    it('should return "fair" for adpDiff >= -5 and < 5', () => {
      expect(getValueIndicator(4, settings)).toBe('fair');
      expect(getValueIndicator(0, settings)).toBe('fair');
      expect(getValueIndicator(-5, settings)).toBe('fair');
    });

    it('should return "reach" for adpDiff >= -15 and < -5', () => {
      expect(getValueIndicator(-6, settings)).toBe('reach');
      expect(getValueIndicator(-10, settings)).toBe('reach');
      expect(getValueIndicator(-15, settings)).toBe('reach');
    });

    it('should return "avoid" for adpDiff < -15', () => {
      expect(getValueIndicator(-16, settings)).toBe('avoid');
      expect(getValueIndicator(-20, settings)).toBe('avoid');
      expect(getValueIndicator(-100, settings)).toBe('avoid');
    });

    it('should work with different adpValueThreshold settings', () => {
      const customSettings = createTestSettings({ adpValueThreshold: 10 });
      expect(getValueIndicator(10, customSettings)).toBe('steal');
      expect(getValueIndicator(9, customSettings)).toBe('good-value');
    });
  });

  describe('getUrgency', () => {
    const defaultSettings = createTestSettings();

    it('should return "must-draft" for scarcityPremium >= mustDraft threshold (30)', () => {
      const enhancedVOR = createMockEnhancedVOR({ scarcityPremium: 30 });
      const result = getUrgency(enhancedVOR, [], defaultSettings);
      expect(result).toBe('must-draft');
    });

    it('should return "must-draft" for scarcityPremium above mustDraft threshold', () => {
      const enhancedVOR = createMockEnhancedVOR({ scarcityPremium: 50 });
      const result = getUrgency(enhancedVOR, [], defaultSettings);
      expect(result).toBe('must-draft');
    });

    it('should return "high" for scarcityPremium >= high threshold (20)', () => {
      const enhancedVOR = createMockEnhancedVOR({ scarcityPremium: 20 });
      const result = getUrgency(enhancedVOR, [], defaultSettings);
      expect(result).toBe('high');
    });

    it('should return "high" when position has critical alert', () => {
      const enhancedVOR = createMockEnhancedVOR({
        position: 'RB',
        scarcityPremium: 5, // Low premium, but has critical alert
      });
      const alerts = [createMockDropOffAlert('RB', 'critical')];
      const result = getUrgency(enhancedVOR, alerts, defaultSettings);
      expect(result).toBe('high');
    });

    it('should return "medium" for scarcityPremium >= medium threshold (10)', () => {
      const enhancedVOR = createMockEnhancedVOR({ scarcityPremium: 10 });
      const result = getUrgency(enhancedVOR, [], defaultSettings);
      expect(result).toBe('medium');
    });

    it('should return "medium" when position has warning alert', () => {
      const enhancedVOR = createMockEnhancedVOR({
        position: 'WR',
        scarcityPremium: 0, // No premium, but has warning alert
      });
      const alerts = [createMockDropOffAlert('WR', 'warning')];
      const result = getUrgency(enhancedVOR, alerts, defaultSettings);
      expect(result).toBe('medium');
    });

    it('should return "low" for normal conditions', () => {
      const enhancedVOR = createMockEnhancedVOR({ scarcityPremium: 5 });
      const result = getUrgency(enhancedVOR, [], defaultSettings);
      expect(result).toBe('low');
    });

    it('should return "low" when alerts are for different positions', () => {
      const enhancedVOR = createMockEnhancedVOR({
        position: 'QB',
        scarcityPremium: 0,
      });
      const alerts = [createMockDropOffAlert('RB', 'critical')];
      const result = getUrgency(enhancedVOR, alerts, defaultSettings);
      expect(result).toBe('low');
    });

    it('should prioritize must-draft over alerts', () => {
      const enhancedVOR = createMockEnhancedVOR({
        position: 'RB',
        scarcityPremium: 35, // Above must-draft
      });
      const alerts = [createMockDropOffAlert('RB', 'warning')]; // Only warning
      const result = getUrgency(enhancedVOR, alerts, defaultSettings);
      expect(result).toBe('must-draft');
    });
  });

  describe('generateReasons', () => {
    it('should include position need reason when position is needed', () => {
      const enhancedVOR = createMockEnhancedVOR({ position: 'RB' });
      const neededPositions: Position[] = ['RB', 'WR'];
      const reasons = generateReasons(enhancedVOR, [], neededPositions);
      expect(reasons).toContain('Fills positional need at RB');
    });

    it('should NOT include position need reason when position is not needed', () => {
      const enhancedVOR = createMockEnhancedVOR({ position: 'QB' });
      const neededPositions: Position[] = ['RB', 'WR'];
      const reasons = generateReasons(enhancedVOR, [], neededPositions);
      expect(reasons.find(r => r.includes('positional need'))).toBeUndefined();
    });

    it('should include value reason for high adpDiff (> 5)', () => {
      const enhancedVOR = createMockEnhancedVOR({ adpDiff: 10 });
      const reasons = generateReasons(enhancedVOR, [], []);
      expect(reasons.find(r => r.includes('ADP value'))).toBeDefined();
      expect(reasons.find(r => r.includes('+10'))).toBeDefined();
    });

    it('should NOT include value reason for low adpDiff (<= 5)', () => {
      const enhancedVOR = createMockEnhancedVOR({ adpDiff: 5 });
      const reasons = generateReasons(enhancedVOR, [], []);
      expect(reasons.find(r => r.includes('ADP value'))).toBeUndefined();
    });

    it('should include scarcity reason when scarcityPremium > 0', () => {
      const enhancedVOR = createMockEnhancedVOR({ scarcityPremium: 15 });
      const reasons = generateReasons(enhancedVOR, [], []);
      expect(reasons.find(r => r.includes('Scarce position'))).toBeDefined();
      expect(reasons.find(r => r.includes('+15'))).toBeDefined();
    });

    it('should NOT include scarcity reason when scarcityPremium is 0', () => {
      const enhancedVOR = createMockEnhancedVOR({ scarcityPremium: 0 });
      const reasons = generateReasons(enhancedVOR, [], []);
      expect(reasons.find(r => r.includes('Scarce position'))).toBeUndefined();
    });

    it('should include schedule reason when scheduleAdjustment > 3', () => {
      const enhancedVOR = createMockEnhancedVOR({ scheduleAdjustment: 5 });
      const reasons = generateReasons(enhancedVOR, [], []);
      expect(reasons.find(r => r.includes('Favorable schedule'))).toBeDefined();
      expect(reasons.find(r => r.includes('+5'))).toBeDefined();
    });

    it('should NOT include schedule reason when scheduleAdjustment <= 3', () => {
      const enhancedVOR = createMockEnhancedVOR({ scheduleAdjustment: 3 });
      const reasons = generateReasons(enhancedVOR, [], []);
      expect(reasons.find(r => r.includes('Favorable schedule'))).toBeUndefined();
    });

    it('should include alert reason when drop-off alert exists for position', () => {
      const enhancedVOR = createMockEnhancedVOR({ position: 'TE' });
      const alerts = [createMockDropOffAlert('TE', 'warning')];
      const reasons = generateReasons(enhancedVOR, alerts, []);
      expect(reasons.find(r => r.includes('tier drop-off imminent'))).toBeDefined();
    });

    it('should NOT include alert reason when no alert for position', () => {
      const enhancedVOR = createMockEnhancedVOR({ position: 'QB' });
      const alerts = [createMockDropOffAlert('RB', 'warning')];
      const reasons = generateReasons(enhancedVOR, alerts, []);
      expect(reasons.find(r => r.includes('tier drop-off'))).toBeUndefined();
    });

    it('should include multiple reasons when applicable', () => {
      const enhancedVOR = createMockEnhancedVOR({
        position: 'RB',
        adpDiff: 15,
        scarcityPremium: 10,
        scheduleAdjustment: 5,
      });
      const alerts = [createMockDropOffAlert('RB', 'critical')];
      const neededPositions: Position[] = ['RB'];
      const reasons = generateReasons(enhancedVOR, alerts, neededPositions);

      expect(reasons.length).toBeGreaterThanOrEqual(4);
      expect(reasons.find(r => r.includes('positional need'))).toBeDefined();
      expect(reasons.find(r => r.includes('ADP value'))).toBeDefined();
      expect(reasons.find(r => r.includes('Scarce position'))).toBeDefined();
      expect(reasons.find(r => r.includes('tier drop-off'))).toBeDefined();
    });

    it('should return empty array when no reasons apply', () => {
      const enhancedVOR = createMockEnhancedVOR({
        adpDiff: 0,
        scarcityPremium: 0,
        scheduleAdjustment: 0,
      });
      const reasons = generateReasons(enhancedVOR, [], []);
      expect(reasons).toEqual([]);
    });
  });

  describe('getTopRecommendations', () => {
    const defaultSettings = createTestSettings({ topNPlayers: 3 });

    function createTestData(count: number): {
      enhancedVORs: IEnhancedVOR[];
      players: IPlayerExtended[];
    } {
      const enhancedVORs: IEnhancedVOR[] = [];
      const players: IPlayerExtended[] = [];

      for (let i = 0; i < count; i++) {
        const key = `player-${i + 1}`;
        enhancedVORs.push(
          createMockEnhancedVOR({
            playerId: key,
            playerName: `Player ${i + 1}`,
            position: i % 2 === 0 ? 'RB' : 'WR',
            enhancedVOR: 100 - i * 10,
            scarcityPremium: Math.max(0, 25 - i * 5),
          })
        );
        players.push(
          createMockPlayer({
            key,
            name: `Player ${i + 1}`,
            pos: i % 2 === 0 ? 'RB' : 'WR',
          })
        );
      }
      return { enhancedVORs, players };
    }

    it('should return correct number of recommendations (topNPlayers)', () => {
      const { enhancedVORs, players } = createTestData(10);
      const result = getTopRecommendations(
        enhancedVORs,
        players,
        new Set(),
        [],
        defaultSettings
      );
      expect(result.length).toBe(3);
    });

    it('should return fewer recommendations if not enough players', () => {
      const { enhancedVORs, players } = createTestData(2);
      const result = getTopRecommendations(
        enhancedVORs,
        players,
        new Set(),
        [],
        defaultSettings
      );
      expect(result.length).toBe(2);
    });

    it('should filter out drafted players', () => {
      const { enhancedVORs, players } = createTestData(5);
      const draftedKeys = new Set(['player-1', 'player-2']);
      const result = getTopRecommendations(
        enhancedVORs,
        players,
        draftedKeys,
        [],
        defaultSettings
      );

      // Should not include drafted players
      expect(result.find(r => r.player.key === 'player-1')).toBeUndefined();
      expect(result.find(r => r.player.key === 'player-2')).toBeUndefined();
      expect(result.length).toBe(3);
    });

    it('should prioritize needed positions in sorting', () => {
      const enhancedVORs = [
        createMockEnhancedVOR({ playerId: 'qb-1', position: 'QB', enhancedVOR: 80 }),
        createMockEnhancedVOR({ playerId: 'rb-1', position: 'RB', enhancedVOR: 100 }),
        createMockEnhancedVOR({ playerId: 'wr-1', position: 'WR', enhancedVOR: 90 }),
      ];
      const players = [
        createMockPlayer({ key: 'qb-1', pos: 'QB' }),
        createMockPlayer({ key: 'rb-1', pos: 'RB' }),
        createMockPlayer({ key: 'wr-1', pos: 'WR' }),
      ];
      const neededPositions: Position[] = ['QB'];

      const result = getTopRecommendations(
        enhancedVORs,
        players,
        new Set(),
        neededPositions,
        defaultSettings
      );

      // QB should be first because it's a needed position, even though RB has higher VOR
      expect(result[0].player.pos).toBe('QB');
    });

    it('should sort by urgency priority within same need level', () => {
      const enhancedVORs = [
        createMockEnhancedVOR({
          playerId: 'rb-1',
          position: 'RB',
          enhancedVOR: 50,
          scarcityPremium: 35, // Must-draft urgency
        }),
        createMockEnhancedVOR({
          playerId: 'rb-2',
          position: 'RB',
          enhancedVOR: 100,
          scarcityPremium: 5, // Low urgency
        }),
      ];
      const players = [
        createMockPlayer({ key: 'rb-1', pos: 'RB' }),
        createMockPlayer({ key: 'rb-2', pos: 'RB' }),
      ];

      const result = getTopRecommendations(
        enhancedVORs,
        players,
        new Set(),
        ['RB'],
        defaultSettings
      );

      // Higher urgency player should come first
      expect(result[0].player.key).toBe('rb-1');
    });

    it('should sort by enhancedVOR descending within same urgency', () => {
      const enhancedVORs = [
        createMockEnhancedVOR({
          playerId: 'rb-1',
          position: 'RB',
          enhancedVOR: 80,
          scarcityPremium: 25, // High urgency
        }),
        createMockEnhancedVOR({
          playerId: 'rb-2',
          position: 'RB',
          enhancedVOR: 90,
          scarcityPremium: 25, // High urgency (same)
        }),
      ];
      const players = [
        createMockPlayer({ key: 'rb-1', pos: 'RB' }),
        createMockPlayer({ key: 'rb-2', pos: 'RB' }),
      ];

      const result = getTopRecommendations(
        enhancedVORs,
        players,
        new Set(),
        [],
        defaultSettings
      );

      // Higher VOR player should come first when urgency is the same
      expect(result[0].player.key).toBe('rb-2');
    });

    it('should include urgency in recommendations', () => {
      const enhancedVORs = [
        createMockEnhancedVOR({
          playerId: 'rb-1',
          scarcityPremium: 35, // Must-draft
        }),
      ];
      const players = [createMockPlayer({ key: 'rb-1' })];

      const result = getTopRecommendations(
        enhancedVORs,
        players,
        new Set(),
        [],
        defaultSettings
      );

      expect(result[0].urgency).toBe('must-draft');
    });

    it('should include valueIndicator in recommendations', () => {
      const enhancedVORs = [
        createMockEnhancedVOR({
          playerId: 'rb-1',
          adpDiff: 20, // Steal
        }),
      ];
      const players = [createMockPlayer({ key: 'rb-1' })];

      const result = getTopRecommendations(
        enhancedVORs,
        players,
        new Set(),
        [],
        defaultSettings
      );

      expect(result[0].valueIndicator).toBe('steal');
    });

    it('should include reasons in recommendations', () => {
      const enhancedVORs = [
        createMockEnhancedVOR({
          playerId: 'rb-1',
          position: 'RB',
          adpDiff: 20,
          scarcityPremium: 15,
        }),
      ];
      const players = [createMockPlayer({ key: 'rb-1', pos: 'RB' })];
      const neededPositions: Position[] = ['RB'];

      const result = getTopRecommendations(
        enhancedVORs,
        players,
        new Set(),
        neededPositions,
        defaultSettings
      );

      expect(result[0].reasons.length).toBeGreaterThan(0);
      expect(result[0].reasons.find(r => r.includes('positional need'))).toBeDefined();
    });

    it('should return empty array for empty enhancedVORs', () => {
      const result = getTopRecommendations(
        [],
        [],
        new Set(),
        [],
        defaultSettings
      );
      expect(result).toEqual([]);
    });

    it('should return empty array when all players are drafted', () => {
      const enhancedVORs = [
        createMockEnhancedVOR({ playerId: 'player-1' }),
        createMockEnhancedVOR({ playerId: 'player-2' }),
      ];
      const players = [
        createMockPlayer({ key: 'player-1' }),
        createMockPlayer({ key: 'player-2' }),
      ];
      const draftedKeys = new Set(['player-1', 'player-2']);

      const result = getTopRecommendations(
        enhancedVORs,
        players,
        draftedKeys,
        [],
        defaultSettings
      );

      expect(result).toEqual([]);
    });

    it('should work with no needed positions', () => {
      const { enhancedVORs, players } = createTestData(5);
      const result = getTopRecommendations(
        enhancedVORs,
        players,
        new Set(),
        [], // No needed positions
        defaultSettings
      );

      // Should still return recommendations sorted by urgency and VOR
      expect(result.length).toBe(3);
    });

    it('should handle players array with missing players gracefully', () => {
      const enhancedVORs = [
        createMockEnhancedVOR({ playerId: 'exists' }),
        createMockEnhancedVOR({ playerId: 'missing' }),
      ];
      const players = [
        createMockPlayer({ key: 'exists' }),
        // 'missing' player is not in players array
      ];

      const result = getTopRecommendations(
        enhancedVORs,
        players,
        new Set(),
        [],
        defaultSettings
      );

      // Should only include the player that exists
      expect(result.length).toBe(1);
      expect(result[0].player.key).toBe('exists');
    });
  });
});
