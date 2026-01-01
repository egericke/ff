/**
 * Tests for Enhanced VOR Calculator engine functions.
 * These tests verify the unified VOR calculations that combine
 * base VOR with risk adjustments, schedule adjustments, and scarcity premiums.
 */

import {
  calculateEnhancedVOR,
  calculateAllEnhancedVORs,
  getPlayerWithEnhancedVOR,
} from '../enhancedVOR';
import { IPlayerExtended, Position } from '../../models/Player';
import { IRiskSettings, DEFAULT_RISK_SETTINGS, IRiskProfile } from '../../models/Risk';
import { IScarcitySettings, DEFAULT_SCARCITY_SETTINGS } from '../../models/Scarcity';
import { IScheduleSettings, DEFAULT_SCHEDULE_SETTINGS } from '../../models/Schedule';
import { IEnhancedVOR } from '../../models/EnhancedVOR';
import { IRoster } from '../../models/Team';

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
    passYards: 0,
    passTds: 0,
    passInts: 0,
    rushYards: 800,
    rushTds: 8,
    recYards: 300,
    recTds: 2,
    receptions: 40,
    fumblesLost: 1,
    twoPts: 0,
    ...overrides,
  };
}

/**
 * Helper function to create a risk profile.
 */
function createRiskProfile(
  injuryScore: number,
  consistencyScore: number
): IRiskProfile {
  return {
    injuryScore,
    consistencyScore,
    floor: 5,
    ceiling: 25,
    weeklyVariance: 5,
  };
}

/**
 * Helper function to create a player with risk profile.
 */
function createPlayerWithRisk(
  overrides: Partial<IPlayerExtended> = {},
  injuryScore = 30,
  consistencyScore = 0.8
): IPlayerExtended {
  return {
    ...createMockPlayer(overrides),
    risk: {
      age: 25,
      injuryHistory: {
        gamesPlayed: [16, 15, 17] as [number, number, number],
        currentStatus: 'healthy' as const,
      },
      riskProfile: createRiskProfile(injuryScore, consistencyScore),
    },
  };
}

/**
 * Helper function to create default roster format.
 */
function createRosterFormat(): IRoster {
  return {
    QB: 1,
    RB: 2,
    WR: 2,
    FLEX: 1,
    SUPERFLEX: 0,
    TE: 1,
    DST: 1,
    K: 1,
    BENCH: 6,
  };
}

describe('Enhanced VOR Calculator Engine', () => {
  describe('calculateEnhancedVOR', () => {
    it('should calculate enhanced VOR with all adjustments applied', () => {
      const player = createPlayerWithRisk({
        key: 'rb-1',
        name: 'Elite RB',
        vor: 80,
        forecast: 300,
      });
      const scheduleScore = 5;
      const scarcityPremium = 3;

      const result = calculateEnhancedVOR(
        player,
        DEFAULT_RISK_SETTINGS,
        scheduleScore,
        scarcityPremium
      );

      expect(result.playerId).toBe('rb-1');
      expect(result.playerName).toBe('Elite RB');
      expect(result.position).toBe('RB');
      expect(result.baseVOR).toBe(80);
      expect(result.forecast).toBe(300);
      expect(result.scheduleAdjustment).toBe(5);
      expect(result.scarcityPremium).toBe(3);
      // Enhanced VOR should be baseVOR + riskAdjustment + scheduleAdjustment + scarcityPremium
      expect(result.enhancedVOR).toBeDefined();
      expect(typeof result.enhancedVOR).toBe('number');
    });

    it('should use default values when player has no VOR or forecast', () => {
      const player = createMockPlayer({
        key: 'no-vor-player',
        name: 'Unknown Player',
        vor: undefined,
        forecast: undefined,
      });

      const result = calculateEnhancedVOR(
        player,
        DEFAULT_RISK_SETTINGS,
        0,
        0
      );

      expect(result.baseVOR).toBe(0);
      expect(result.forecast).toBe(0);
    });

    it('should calculate risk adjustment when player has risk profile', () => {
      // Create a player with high injury risk
      const riskyPlayer = createPlayerWithRisk(
        { key: 'risky-player', vor: 100 },
        60, // high injury score
        0.7 // moderate consistency
      );

      const result = calculateEnhancedVOR(
        riskyPlayer,
        DEFAULT_RISK_SETTINGS,
        0,
        0
      );

      // Risk adjustment should be negative for a risky player
      expect(result.riskAdjustment).toBeLessThan(0);
    });

    it('should have zero risk adjustment when player has no risk profile', () => {
      const playerNoRisk = createMockPlayer({
        key: 'no-risk-player',
        vor: 100,
      });

      const result = calculateEnhancedVOR(
        playerNoRisk,
        DEFAULT_RISK_SETTINGS,
        0,
        0
      );

      expect(result.riskAdjustment).toBe(0);
    });

    it('should handle negative schedule adjustment', () => {
      const player = createMockPlayer({ key: 'bad-schedule', vor: 50 });
      const negativeScheduleScore = -10;

      const result = calculateEnhancedVOR(
        player,
        DEFAULT_RISK_SETTINGS,
        negativeScheduleScore,
        0
      );

      expect(result.scheduleAdjustment).toBe(-10);
      expect(result.enhancedVOR).toBeLessThan(result.baseVOR);
    });

    it('should correctly sum all adjustments for enhanced VOR', () => {
      const player = createMockPlayer({ key: 'sum-test', vor: 100 });
      const scheduleScore = 7;
      const scarcityPremium = 5;

      const result = calculateEnhancedVOR(
        player,
        DEFAULT_RISK_SETTINGS,
        scheduleScore,
        scarcityPremium
      );

      // Without risk profile, riskAdjustment should be 0
      // enhancedVOR = baseVOR + 0 + scheduleAdjustment + scarcityPremium
      const expectedEnhanced = 100 + 0 + 7 + 5;
      expect(result.enhancedVOR).toBe(expectedEnhanced);
    });

    it('should set initial ranks to 0', () => {
      const player = createMockPlayer();

      const result = calculateEnhancedVOR(
        player,
        DEFAULT_RISK_SETTINGS,
        0,
        0
      );

      // Ranks are computed later by calculateAllEnhancedVORs
      expect(result.overallRank).toBe(0);
      expect(result.positionRank).toBe(0);
    });

    it('should correctly incorporate schedule adjustment', () => {
      const player = createMockPlayer({ key: 'schedule-test', vor: 100 });
      const scheduleScore = 10; // Favorable schedule

      const result = calculateEnhancedVOR(
        player,
        DEFAULT_RISK_SETTINGS,
        scheduleScore,
        0
      );

      expect(result.scheduleAdjustment).toBe(10);
      expect(result.enhancedVOR).toBe(110); // 100 + 0 + 10 + 0
    });
  });

  describe('calculateAllEnhancedVORs', () => {
    const rosterFormat = createRosterFormat();
    const numberOfTeams = 12;

    it('should sort players by enhanced VOR descending', () => {
      const players: IPlayerExtended[] = [
        createMockPlayer({ key: 'low', name: 'Low VOR', vor: 20 }),
        createMockPlayer({ key: 'high', name: 'High VOR', vor: 100 }),
        createMockPlayer({ key: 'mid', name: 'Mid VOR', vor: 60 }),
      ];

      const results = calculateAllEnhancedVORs(
        players,
        new Set(),
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        rosterFormat,
        numberOfTeams
      );

      expect(results[0].playerId).toBe('high');
      expect(results[1].playerId).toBe('mid');
      expect(results[2].playerId).toBe('low');
    });

    it('should filter out drafted players', () => {
      const players: IPlayerExtended[] = [
        createMockPlayer({ key: 'available-1', name: 'Available 1', vor: 50 }),
        createMockPlayer({ key: 'drafted-1', name: 'Drafted 1', vor: 80 }),
        createMockPlayer({ key: 'available-2', name: 'Available 2', vor: 60 }),
      ];
      const draftedKeys = new Set(['drafted-1']);

      const results = calculateAllEnhancedVORs(
        players,
        draftedKeys,
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        rosterFormat,
        numberOfTeams
      );

      expect(results.length).toBe(2);
      expect(results.find((r) => r.playerId === 'drafted-1')).toBeUndefined();
    });

    it('should assign correct overall ranks (1-based)', () => {
      const players: IPlayerExtended[] = [
        createMockPlayer({ key: 'p1', vor: 30 }),
        createMockPlayer({ key: 'p2', vor: 90 }),
        createMockPlayer({ key: 'p3', vor: 60 }),
      ];

      const results = calculateAllEnhancedVORs(
        players,
        new Set(),
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        rosterFormat,
        numberOfTeams
      );

      // Sorted by VOR descending: p2(90), p3(60), p1(30)
      expect(results[0].overallRank).toBe(1);
      expect(results[1].overallRank).toBe(2);
      expect(results[2].overallRank).toBe(3);
    });

    it('should assign correct position ranks', () => {
      const players: IPlayerExtended[] = [
        createMockPlayer({ key: 'rb1', pos: 'RB', vor: 100 }),
        createMockPlayer({ key: 'wr1', pos: 'WR', vor: 90 }),
        createMockPlayer({ key: 'rb2', pos: 'RB', vor: 80 }),
        createMockPlayer({ key: 'wr2', pos: 'WR', vor: 70 }),
        createMockPlayer({ key: 'rb3', pos: 'RB', vor: 50 }),
      ];

      const results = calculateAllEnhancedVORs(
        players,
        new Set(),
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        rosterFormat,
        numberOfTeams
      );

      // Find results by player ID
      const rb1 = results.find((r) => r.playerId === 'rb1');
      const rb2 = results.find((r) => r.playerId === 'rb2');
      const rb3 = results.find((r) => r.playerId === 'rb3');
      const wr1 = results.find((r) => r.playerId === 'wr1');
      const wr2 = results.find((r) => r.playerId === 'wr2');

      expect(rb1?.positionRank).toBe(1);
      expect(rb2?.positionRank).toBe(2);
      expect(rb3?.positionRank).toBe(3);
      expect(wr1?.positionRank).toBe(1);
      expect(wr2?.positionRank).toBe(2);
    });

    it('should calculate adpDiff correctly (positive = value)', () => {
      const players: IPlayerExtended[] = [
        // std is the ADP field
        createMockPlayer({ key: 'value', vor: 100, std: 20 }), // Should rank 1, ADP 20 = +19 value
        createMockPlayer({ key: 'reach', vor: 50, std: 1 }), // Should rank 2, ADP 1 = -1 (reach)
      ];

      const results = calculateAllEnhancedVORs(
        players,
        new Set(),
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        rosterFormat,
        numberOfTeams
      );

      const valuePlayer = results.find((r) => r.playerId === 'value');
      const reachPlayer = results.find((r) => r.playerId === 'reach');

      // adpDiff = overallRank - adpRank
      // valuePlayer: rank 1, ADP 20 => adpDiff = 1 - 20 = -19? No wait...
      // The spec says positive = value, so it should be adpRank - overallRank
      // If player is ranked 1 but ADP is 20, that's great value (positive)
      // adpDiff = adpRank - overallRank = 20 - 1 = 19 (value)
      expect(valuePlayer?.adpDiff).toBeGreaterThan(0);
      expect(reachPlayer?.adpDiff).toBeLessThan(0);
    });

    it('should return empty array for empty player list', () => {
      const results = calculateAllEnhancedVORs(
        [],
        new Set(),
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        rosterFormat,
        numberOfTeams
      );

      expect(results).toEqual([]);
    });

    it('should handle single player correctly', () => {
      const players: IPlayerExtended[] = [
        createMockPlayer({ key: 'solo', vor: 75, std: 10 }),
      ];

      const results = calculateAllEnhancedVORs(
        players,
        new Set(),
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        rosterFormat,
        numberOfTeams
      );

      expect(results.length).toBe(1);
      expect(results[0].overallRank).toBe(1);
      expect(results[0].positionRank).toBe(1);
    });

    it('should return empty array when all players are drafted', () => {
      const players: IPlayerExtended[] = [
        createMockPlayer({ key: 'drafted-a', vor: 50 }),
        createMockPlayer({ key: 'drafted-b', vor: 60 }),
      ];
      const draftedKeys = new Set(['drafted-a', 'drafted-b']);

      const results = calculateAllEnhancedVORs(
        players,
        draftedKeys,
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        rosterFormat,
        numberOfTeams
      );

      expect(results).toEqual([]);
    });
  });

  describe('getPlayerWithEnhancedVOR', () => {
    it('should merge player and enhanced VOR correctly', () => {
      const player = createMockPlayer({
        key: 'merge-test',
        name: 'Merge Player',
        vor: 75,
      });

      const enhancedVOR: IEnhancedVOR = {
        playerId: 'merge-test',
        playerName: 'Merge Player',
        position: 'RB',
        baseVOR: 75,
        forecast: 200,
        riskAdjustment: -5,
        scheduleAdjustment: 3,
        scarcityPremium: 2,
        enhancedVOR: 75,
        overallRank: 10,
        positionRank: 5,
        adpDiff: 5,
      };

      const result = getPlayerWithEnhancedVOR(player, enhancedVOR);

      // Should have all player properties
      expect(result.key).toBe('merge-test');
      expect(result.name).toBe('Merge Player');
      expect(result.vor).toBe(75);
      expect(result.pos).toBe('RB');

      // Should have enhancedVOR attached
      expect(result.enhancedVOR).toEqual(enhancedVOR);
    });

    it('should preserve all original player properties', () => {
      const player = createPlayerWithRisk({
        key: 'preserve-test',
        name: 'Full Player',
        team: 'SF',
        bye: 9,
        vor: 100,
        forecast: 250,
      });

      const enhancedVOR: IEnhancedVOR = {
        playerId: 'preserve-test',
        playerName: 'Full Player',
        position: 'RB',
        baseVOR: 100,
        forecast: 250,
        riskAdjustment: -10,
        scheduleAdjustment: 5,
        scarcityPremium: 3,
        enhancedVOR: 98,
        overallRank: 3,
        positionRank: 2,
        adpDiff: 7,
      };

      const result = getPlayerWithEnhancedVOR(player, enhancedVOR);

      // Check original properties preserved
      expect(result.team).toBe('SF');
      expect(result.bye).toBe(9);
      expect(result.risk).toBeDefined();
      expect(result.risk?.age).toBe(25);
    });
  });
});
