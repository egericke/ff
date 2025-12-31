/**
 * Tests for scarcity calculator engine functions.
 * These tests verify position scarcity calculations, tier categorization,
 * and premium adjustments during fantasy football drafts.
 */

import {
  calculatePositionSupply,
  calculateScarcityPremium,
  calculateAllScarcityPremiums,
  applyScarcityPremium,
} from '../scarcity';
import {
  IScarcitySettings,
  IPositionSupply,
  IScarcityPremium,
  DEFAULT_SCARCITY_SETTINGS,
} from '../../models/Scarcity';
import { IPlayerExtended, Position } from '../../models/Player';
import { IRoster } from '../../models/Team';

/**
 * Helper function to create a mock player with specified properties.
 */
function createMockPlayer(
  key: string,
  name: string,
  pos: Position,
  vor: number
): IPlayerExtended {
  return {
    index: parseInt(key.replace(/\D/g, '')) || 0,
    key,
    name,
    pos,
    team: 'TEST',
    bye: 10,
    std: 50,
    halfPpr: 100,
    ppr: 120,
    passingYards: 0,
    passingTds: 0,
    ints: 0,
    rushingYards: 0,
    rushingTds: 0,
    receptions: 0,
    receivingYards: 0,
    receivingTds: 0,
    vor,
    forecast: 100,
  };
}

/**
 * Helper function to create a set of mock players at a position with various VOR values.
 */
function createMockPlayersForPosition(
  pos: Position,
  vorValues: number[]
): IPlayerExtended[] {
  return vorValues.map((vor, i) =>
    createMockPlayer(`${pos.toLowerCase()}_${i + 1}`, `${pos} Player ${i + 1}`, pos, vor)
  );
}

/**
 * Helper to create default test roster format.
 */
function createDefaultRoster(): IRoster {
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

describe('Scarcity Calculator Engine', () => {
  describe('calculatePositionSupply', () => {
    it('should count all players when none are drafted', () => {
      const players: IPlayerExtended[] = [
        ...createMockPlayersForPosition('RB', [60, 55, 50, 30, 25, 20, 10, 5]),
      ];
      const draftedKeys = new Set<string>();
      const settings = DEFAULT_SCARCITY_SETTINGS;

      const supply = calculatePositionSupply(players, draftedKeys, 'RB', settings);

      expect(supply.position).toBe('RB');
      expect(supply.totalPlayers).toBe(8);
      expect(supply.draftedCount).toBe(0);
      expect(supply.remainingCount).toBe(8);
    });

    it('should correctly count drafted vs remaining players', () => {
      const players: IPlayerExtended[] = [
        ...createMockPlayersForPosition('RB', [60, 55, 50, 30, 25, 20]),
      ];
      const draftedKeys = new Set<string>(['rb_1', 'rb_2', 'rb_3']);
      const settings = DEFAULT_SCARCITY_SETTINGS;

      const supply = calculatePositionSupply(players, draftedKeys, 'RB', settings);

      expect(supply.totalPlayers).toBe(6);
      expect(supply.draftedCount).toBe(3);
      expect(supply.remainingCount).toBe(3);
    });

    it('should categorize remaining players by VOR tier thresholds', () => {
      // Tier 1: VOR >= 50 (tier1Threshold)
      // Tier 2: VOR >= 25 (tier2Threshold)
      // Tier 3: VOR < 25
      const players: IPlayerExtended[] = [
        ...createMockPlayersForPosition('WR', [80, 60, 50, 40, 30, 25, 20, 10, 5]),
      ];
      const draftedKeys = new Set<string>();
      const settings = DEFAULT_SCARCITY_SETTINGS;

      const supply = calculatePositionSupply(players, draftedKeys, 'WR', settings);

      // Tier 1: 80, 60, 50 = 3 players
      expect(supply.tier1Remaining).toBe(3);
      // Tier 2: 40, 30, 25 = 3 players (>= 25 but < 50)
      expect(supply.tier2Remaining).toBe(3);
      // Tier 3: 20, 10, 5 = 3 players (< 25)
      expect(supply.tier3Remaining).toBe(3);
    });

    it('should exclude drafted players from tier counts', () => {
      const players: IPlayerExtended[] = [
        ...createMockPlayersForPosition('WR', [80, 60, 50, 40, 30, 25]),
      ];
      // Draft the top 2 tier 1 players
      const draftedKeys = new Set<string>(['wr_1', 'wr_2']);
      const settings = DEFAULT_SCARCITY_SETTINGS;

      const supply = calculatePositionSupply(players, draftedKeys, 'WR', settings);

      // Only wr_3 (VOR=50) remains in tier 1
      expect(supply.tier1Remaining).toBe(1);
      // wr_4, wr_5, wr_6 in tier 2
      expect(supply.tier2Remaining).toBe(3);
      expect(supply.tier3Remaining).toBe(0);
    });

    it('should only count players of the specified position', () => {
      const players: IPlayerExtended[] = [
        ...createMockPlayersForPosition('RB', [60, 55, 50]),
        ...createMockPlayersForPosition('WR', [70, 65, 60, 55]),
        ...createMockPlayersForPosition('QB', [80]),
      ];
      const draftedKeys = new Set<string>();
      const settings = DEFAULT_SCARCITY_SETTINGS;

      const rbSupply = calculatePositionSupply(players, draftedKeys, 'RB', settings);
      const wrSupply = calculatePositionSupply(players, draftedKeys, 'WR', settings);
      const qbSupply = calculatePositionSupply(players, draftedKeys, 'QB', settings);

      expect(rbSupply.totalPlayers).toBe(3);
      expect(wrSupply.totalPlayers).toBe(4);
      expect(qbSupply.totalPlayers).toBe(1);
    });

    it('should handle empty player pool', () => {
      const players: IPlayerExtended[] = [];
      const draftedKeys = new Set<string>();
      const settings = DEFAULT_SCARCITY_SETTINGS;

      const supply = calculatePositionSupply(players, draftedKeys, 'TE', settings);

      expect(supply.totalPlayers).toBe(0);
      expect(supply.draftedCount).toBe(0);
      expect(supply.remainingCount).toBe(0);
      expect(supply.tier1Remaining).toBe(0);
      expect(supply.tier2Remaining).toBe(0);
      expect(supply.tier3Remaining).toBe(0);
    });

    it('should handle custom tier thresholds', () => {
      const players: IPlayerExtended[] = [
        ...createMockPlayersForPosition('QB', [100, 80, 60, 40, 20]),
      ];
      const draftedKeys = new Set<string>();
      const customSettings: IScarcitySettings = {
        ...DEFAULT_SCARCITY_SETTINGS,
        tierThresholds: {
          tier1: 70, // Higher threshold for tier 1
          tier2: 40, // Higher threshold for tier 2
        },
      };

      const supply = calculatePositionSupply(players, draftedKeys, 'QB', customSettings);

      // Tier 1: 100, 80 (>= 70)
      expect(supply.tier1Remaining).toBe(2);
      // Tier 2: 60, 40 (>= 40 but < 70)
      expect(supply.tier2Remaining).toBe(2);
      // Tier 3: 20 (< 40)
      expect(supply.tier3Remaining).toBe(1);
    });
  });

  describe('calculateScarcityPremium', () => {
    it('should return severity "none" when tier1 + tier2 > expectedStarters * 1.5', () => {
      const supply: IPositionSupply = {
        position: 'RB',
        totalPlayers: 30,
        draftedCount: 0,
        remainingCount: 30,
        tier1Remaining: 10,
        tier2Remaining: 10,
      };
      const expectedStarters = 10; // 10 * 1.5 = 15, tier1 + tier2 = 20 > 15
      const settings = DEFAULT_SCARCITY_SETTINGS;

      const premium = calculateScarcityPremium(supply, expectedStarters, settings);

      expect(premium.severity).toBe('none');
      expect(premium.premium).toBe(0);
    });

    it('should return severity "low" when tier1 + tier2 > expectedStarters but <= 1.5x', () => {
      const supply: IPositionSupply = {
        position: 'RB',
        totalPlayers: 30,
        draftedCount: 10,
        remainingCount: 20,
        tier1Remaining: 5,
        tier2Remaining: 8,
      };
      const expectedStarters = 12; // tier1 + tier2 = 13 > 12, but <= 18 (1.5x)
      const settings = DEFAULT_SCARCITY_SETTINGS;

      const premium = calculateScarcityPremium(supply, expectedStarters, settings);

      expect(premium.severity).toBe('low');
      expect(premium.premium).toBeGreaterThan(0);
    });

    it('should return severity "medium" when tier1 + tier2 <= expectedStarters', () => {
      const supply: IPositionSupply = {
        position: 'RB',
        totalPlayers: 30,
        draftedCount: 15,
        remainingCount: 15,
        tier1Remaining: 3,
        tier2Remaining: 4,
      };
      const expectedStarters = 12; // tier1 + tier2 = 7 <= 12
      const settings = DEFAULT_SCARCITY_SETTINGS;

      const premium = calculateScarcityPremium(supply, expectedStarters, settings);

      expect(premium.severity).toBe('medium');
      expect(premium.premium).toBeGreaterThan(0);
    });

    it('should return severity "high" when tier1 = 0 and tier2 <= expectedStarters / 2', () => {
      const supply: IPositionSupply = {
        position: 'TE',
        totalPlayers: 15,
        draftedCount: 10,
        remainingCount: 5,
        tier1Remaining: 0,
        tier2Remaining: 3,
      };
      const expectedStarters = 12; // tier1 = 0, tier2 = 3 <= 6 (12/2)
      const settings = DEFAULT_SCARCITY_SETTINGS;

      const premium = calculateScarcityPremium(supply, expectedStarters, settings);

      expect(premium.severity).toBe('high');
      expect(premium.premium).toBeGreaterThan(0);
    });

    it('should return severity "critical" when tier1 = 0 and tier2 = 0', () => {
      const supply: IPositionSupply = {
        position: 'TE',
        totalPlayers: 12,
        draftedCount: 10,
        remainingCount: 2,
        tier1Remaining: 0,
        tier2Remaining: 0,
      };
      const expectedStarters = 12;
      const settings = DEFAULT_SCARCITY_SETTINGS;

      const premium = calculateScarcityPremium(supply, expectedStarters, settings);

      expect(premium.severity).toBe('critical');
      expect(premium.premium).toBeGreaterThan(0);
    });

    it('should calculate premium using severityMultiplier * positionWeight', () => {
      const supply: IPositionSupply = {
        position: 'RB',
        totalPlayers: 30,
        draftedCount: 25,
        remainingCount: 5,
        tier1Remaining: 0,
        tier2Remaining: 0,
      };
      const expectedStarters = 20;
      const settings = DEFAULT_SCARCITY_SETTINGS;

      const premium = calculateScarcityPremium(supply, expectedStarters, settings);

      // Critical severity = 8 multiplier, RB weight = 1.2
      const expectedPremium = settings.premiumMultipliers.critical * (settings.positionWeights.RB ?? 1);
      expect(premium.premium).toBe(expectedPremium);
    });

    it('should use position weight from settings', () => {
      const supplyRB: IPositionSupply = {
        position: 'RB',
        totalPlayers: 10,
        draftedCount: 8,
        remainingCount: 2,
        tier1Remaining: 0,
        tier2Remaining: 0,
      };
      const supplyK: IPositionSupply = {
        position: 'K',
        totalPlayers: 10,
        draftedCount: 8,
        remainingCount: 2,
        tier1Remaining: 0,
        tier2Remaining: 0,
      };
      const expectedStarters = 12;
      const settings = DEFAULT_SCARCITY_SETTINGS;

      const rbPremium = calculateScarcityPremium(supplyRB, expectedStarters, settings);
      const kPremium = calculateScarcityPremium(supplyK, expectedStarters, settings);

      // RB has higher weight (1.2) than K (0.3)
      expect(rbPremium.premium).toBeGreaterThan(kPremium.premium);
    });

    it('should increase premium as supply depletes', () => {
      const settings = DEFAULT_SCARCITY_SETTINGS;
      const expectedStarters = 12;

      // Good supply
      const goodSupply: IPositionSupply = {
        position: 'RB',
        totalPlayers: 30,
        draftedCount: 0,
        remainingCount: 30,
        tier1Remaining: 10,
        tier2Remaining: 15,
      };

      // Medium supply
      const mediumSupply: IPositionSupply = {
        position: 'RB',
        totalPlayers: 30,
        draftedCount: 20,
        remainingCount: 10,
        tier1Remaining: 3,
        tier2Remaining: 5,
      };

      // Poor supply
      const poorSupply: IPositionSupply = {
        position: 'RB',
        totalPlayers: 30,
        draftedCount: 26,
        remainingCount: 4,
        tier1Remaining: 0,
        tier2Remaining: 2,
      };

      const goodPremium = calculateScarcityPremium(goodSupply, expectedStarters, settings);
      const mediumPremium = calculateScarcityPremium(mediumSupply, expectedStarters, settings);
      const poorPremium = calculateScarcityPremium(poorSupply, expectedStarters, settings);

      expect(poorPremium.premium).toBeGreaterThan(mediumPremium.premium);
      expect(mediumPremium.premium).toBeGreaterThanOrEqual(goodPremium.premium);
    });

    it('should default to weight of 1 for positions not in settings', () => {
      const supply: IPositionSupply = {
        position: 'FLEX' as Position,
        totalPlayers: 10,
        draftedCount: 8,
        remainingCount: 2,
        tier1Remaining: 0,
        tier2Remaining: 0,
      };
      const expectedStarters = 12;
      const settings: IScarcitySettings = {
        ...DEFAULT_SCARCITY_SETTINGS,
        positionWeights: {}, // No weights defined
      };

      const premium = calculateScarcityPremium(supply, expectedStarters, settings);

      // Should use default weight of 1
      expect(premium.premium).toBe(settings.premiumMultipliers.critical * 1);
    });
  });

  describe('calculateAllScarcityPremiums', () => {
    it('should calculate premiums for all draftable positions', () => {
      const players: IPlayerExtended[] = [
        ...createMockPlayersForPosition('QB', [80, 60, 40]),
        ...createMockPlayersForPosition('RB', [70, 50, 30, 20]),
        ...createMockPlayersForPosition('WR', [75, 55, 35, 25]),
        ...createMockPlayersForPosition('TE', [65, 45]),
        ...createMockPlayersForPosition('K', [50, 40]),
        ...createMockPlayersForPosition('DST', [55, 45]),
      ];
      const draftedKeys = new Set<string>();
      const roster = createDefaultRoster();
      const numberOfTeams = 12;
      const settings = DEFAULT_SCARCITY_SETTINGS;

      const premiums = calculateAllScarcityPremiums(
        players,
        draftedKeys,
        roster,
        numberOfTeams,
        settings
      );

      // Should have 6 premiums (QB, RB, WR, TE, K, DST)
      expect(premiums).toHaveLength(6);

      const positions = premiums.map((p) => p.position);
      expect(positions).toContain('QB');
      expect(positions).toContain('RB');
      expect(positions).toContain('WR');
      expect(positions).toContain('TE');
      expect(positions).toContain('K');
      expect(positions).toContain('DST');
    });

    it('should calculate expectedStarters as rosterFormat[pos] * numberOfTeams', () => {
      const players: IPlayerExtended[] = [
        ...createMockPlayersForPosition('RB', [80, 70, 60, 50, 40, 30, 20, 10]),
      ];
      const draftedKeys = new Set<string>();
      const roster: IRoster = {
        QB: 1,
        RB: 2, // 2 RB slots per team
        WR: 2,
        FLEX: 0,
        SUPERFLEX: 0,
        TE: 1,
        DST: 1,
        K: 1,
        BENCH: 0,
      };
      const numberOfTeams = 10;
      const settings = DEFAULT_SCARCITY_SETTINGS;

      // With 2 RB slots * 10 teams = 20 expected starters
      // 8 RBs with tier1+tier2 = 4 (VOR >= 50: 80,70,60,50) + 2 (VOR >= 25: 40,30) = 6
      // 6 < 20, so should be medium or higher severity

      const premiums = calculateAllScarcityPremiums(
        players,
        draftedKeys,
        roster,
        numberOfTeams,
        settings
      );

      const rbPremium = premiums.find((p) => p.position === 'RB');
      expect(rbPremium).toBeDefined();
      expect(rbPremium!.severity).not.toBe('none');
    });

    it('should reflect drafted players in scarcity calculations', () => {
      const players: IPlayerExtended[] = [
        ...createMockPlayersForPosition('QB', [100, 90, 80, 70, 60, 50, 40, 30, 20, 10]),
      ];
      const roster = createDefaultRoster();
      const numberOfTeams = 12;
      const settings = DEFAULT_SCARCITY_SETTINGS;

      // Before drafting
      const premiumsBefore = calculateAllScarcityPremiums(
        players,
        new Set<string>(),
        roster,
        numberOfTeams,
        settings
      );
      const qbBefore = premiumsBefore.find((p) => p.position === 'QB');

      // After drafting top QBs
      const draftedKeys = new Set<string>(['qb_1', 'qb_2', 'qb_3', 'qb_4', 'qb_5', 'qb_6']);
      const premiumsAfter = calculateAllScarcityPremiums(
        players,
        draftedKeys,
        roster,
        numberOfTeams,
        settings
      );
      const qbAfter = premiumsAfter.find((p) => p.position === 'QB');

      expect(qbAfter!.premium).toBeGreaterThanOrEqual(qbBefore!.premium);
    });
  });

  describe('applyScarcityPremium', () => {
    it('should add premium to base VOR for matching position', () => {
      const baseVOR = 50;
      const premiums: IScarcityPremium[] = [
        { position: 'QB', premium: 0, severity: 'none' },
        { position: 'RB', premium: 10, severity: 'high' },
        { position: 'WR', premium: 5, severity: 'low' },
      ];

      const adjustedRB = applyScarcityPremium(baseVOR, 'RB', premiums);
      const adjustedWR = applyScarcityPremium(baseVOR, 'WR', premiums);

      expect(adjustedRB).toBe(60); // 50 + 10
      expect(adjustedWR).toBe(55); // 50 + 5
    });

    it('should return base VOR when position has no premium', () => {
      const baseVOR = 75;
      const premiums: IScarcityPremium[] = [
        { position: 'QB', premium: 5, severity: 'low' },
      ];

      const adjusted = applyScarcityPremium(baseVOR, 'TE', premiums);

      expect(adjusted).toBe(baseVOR);
    });

    it('should return base VOR when premium is zero', () => {
      const baseVOR = 100;
      const premiums: IScarcityPremium[] = [
        { position: 'RB', premium: 0, severity: 'none' },
      ];

      const adjusted = applyScarcityPremium(baseVOR, 'RB', premiums);

      expect(adjusted).toBe(baseVOR);
    });

    it('should handle empty premiums array', () => {
      const baseVOR = 60;
      const premiums: IScarcityPremium[] = [];

      const adjusted = applyScarcityPremium(baseVOR, 'WR', premiums);

      expect(adjusted).toBe(baseVOR);
    });

    it('should handle negative base VOR', () => {
      const baseVOR = -10;
      const premiums: IScarcityPremium[] = [
        { position: 'K', premium: 5, severity: 'medium' },
      ];

      const adjusted = applyScarcityPremium(baseVOR, 'K', premiums);

      expect(adjusted).toBe(-5); // -10 + 5
    });

    it('should correctly apply premium regardless of order in array', () => {
      const baseVOR = 40;
      const premiums: IScarcityPremium[] = [
        { position: 'DST', premium: 2, severity: 'low' },
        { position: 'K', premium: 1, severity: 'none' },
        { position: 'TE', premium: 8, severity: 'high' },
        { position: 'WR', premium: 3, severity: 'low' },
        { position: 'RB', premium: 6, severity: 'medium' },
        { position: 'QB', premium: 4, severity: 'low' },
      ];

      expect(applyScarcityPremium(baseVOR, 'QB', premiums)).toBe(44);
      expect(applyScarcityPremium(baseVOR, 'RB', premiums)).toBe(46);
      expect(applyScarcityPremium(baseVOR, 'WR', premiums)).toBe(43);
      expect(applyScarcityPremium(baseVOR, 'TE', premiums)).toBe(48);
      expect(applyScarcityPremium(baseVOR, 'K', premiums)).toBe(41);
      expect(applyScarcityPremium(baseVOR, 'DST', premiums)).toBe(42);
    });
  });
});
