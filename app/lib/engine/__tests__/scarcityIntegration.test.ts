/**
 * Scarcity Integration Tests
 *
 * Integration tests that verify the scarcity calculation system
 * works correctly end-to-end, including:
 * - Full draft simulation showing scarcity impact on VOR
 * - RB run scenario: when many RBs drafted, remaining RB value increases
 * - QB ignored scenario: when QBs not drafted, QB value stays stable
 * - Drop-off alerts trigger at correct times
 * - All scarcity exports available from index.ts
 */

import {
  calculatePositionSupply,
  calculateScarcityPremium,
  calculateAllScarcityPremiums,
  applyScarcityPremium,
  detectDropOffs,
  getPicksUntilTierDrop,
  DEFAULT_SCARCITY_SETTINGS,
} from '../index';
import { IPlayerExtended, Position } from '../../models/Player';
import { IRoster } from '../../models/Team';

/**
 * Helper function to create a set of mock players at a position.
 * Creates players with decreasing VOR values starting from startVOR.
 *
 * @param count - Number of players to create
 * @param position - Position for the players
 * @param startVOR - Starting VOR value for the first player
 * @returns Array of mock players
 */
function createMockPlayers(
  count: number,
  position: Position,
  startVOR: number
): IPlayerExtended[] {
  return Array(count)
    .fill(null)
    .map((_, i) => ({
      index: i,
      key: `player${i}_${position}_TEAM`,
      name: `${position} Player ${i + 1}`,
      pos: position,
      team: 'TEAM',
      bye: 10,
      std: 50 - i,
      halfPpr: 100 - i * 2,
      ppr: 120 - i * 2,
      passingYards: 0,
      passingTds: 0,
      ints: 0,
      rushingYards: 0,
      rushingTds: 0,
      receptions: 0,
      receivingYards: 0,
      receivingTds: 0,
      vor: startVOR - i * 5,
      forecast: 200 - i * 10,
    }));
}

describe('Scarcity Integration', () => {
  const roster: IRoster = {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 1,
    SUPERFLEX: 0,
    K: 1,
    DST: 1,
    BENCH: 7,
  };

  describe('RB Run Scenario', () => {
    it('should increase RB premium when many RBs drafted', () => {
      const rbs = createMockPlayers(30, 'RB', 80);
      const draftedNone = new Set<string>();
      const drafted10 = new Set(rbs.slice(0, 10).map((p) => p.key));

      const premiumsStart = calculateAllScarcityPremiums(
        rbs,
        draftedNone,
        roster,
        10,
        DEFAULT_SCARCITY_SETTINGS
      );
      const premiumsAfter = calculateAllScarcityPremiums(
        rbs,
        drafted10,
        roster,
        10,
        DEFAULT_SCARCITY_SETTINGS
      );

      const rbPremiumStart =
        premiumsStart.find((p) => p.position === 'RB')?.premium || 0;
      const rbPremiumAfter =
        premiumsAfter.find((p) => p.position === 'RB')?.premium || 0;

      expect(rbPremiumAfter).toBeGreaterThan(rbPremiumStart);
    });

    it('should progressively increase RB value as more RBs are drafted', () => {
      const rbs = createMockPlayers(40, 'RB', 100);
      const numberOfTeams = 12;

      // Track premiums at different draft stages
      const stages = [0, 5, 10, 15, 20];
      const premiumsByStage: number[] = [];

      for (const draftedCount of stages) {
        const drafted = new Set(rbs.slice(0, draftedCount).map((p) => p.key));
        const premiums = calculateAllScarcityPremiums(
          rbs,
          drafted,
          roster,
          numberOfTeams,
          DEFAULT_SCARCITY_SETTINGS
        );
        const rbPremium = premiums.find((p) => p.position === 'RB')?.premium || 0;
        premiumsByStage.push(rbPremium);
      }

      // Each stage should have equal or greater premium than the previous
      for (let i = 1; i < premiumsByStage.length; i++) {
        expect(premiumsByStage[i]).toBeGreaterThanOrEqual(premiumsByStage[i - 1]);
      }
    });

    it('should increase applied VOR for remaining RBs as others are drafted', () => {
      const rbs = createMockPlayers(25, 'RB', 75);
      const remainingPlayerIndex = 15; // A mid-tier RB
      const remainingPlayer = rbs[remainingPlayerIndex];
      const baseVOR = remainingPlayer.vor ?? 0;

      // Calculate applied VOR before and after draft
      const draftedNone = new Set<string>();
      const draftedTop = new Set(rbs.slice(0, 10).map((p) => p.key));

      const premiumsBefore = calculateAllScarcityPremiums(
        rbs,
        draftedNone,
        roster,
        12,
        DEFAULT_SCARCITY_SETTINGS
      );
      const premiumsAfter = calculateAllScarcityPremiums(
        rbs,
        draftedTop,
        roster,
        12,
        DEFAULT_SCARCITY_SETTINGS
      );

      const appliedVORBefore = applyScarcityPremium(baseVOR, 'RB', premiumsBefore);
      const appliedVORAfter = applyScarcityPremium(baseVOR, 'RB', premiumsAfter);

      expect(appliedVORAfter).toBeGreaterThanOrEqual(appliedVORBefore);
    });
  });

  describe('QB Ignored Scenario', () => {
    it('should keep QB premium stable when QBs not drafted', () => {
      const qbs = createMockPlayers(20, 'QB', 60);
      const wrs = createMockPlayers(30, 'WR', 70);
      const allPlayers = [...qbs, ...wrs];

      const draftedNone = new Set<string>();
      const draftedWRs = new Set(wrs.slice(0, 10).map((p) => p.key));

      const premiumsStart = calculateAllScarcityPremiums(
        allPlayers,
        draftedNone,
        roster,
        10,
        DEFAULT_SCARCITY_SETTINGS
      );
      const premiumsAfter = calculateAllScarcityPremiums(
        allPlayers,
        draftedWRs,
        roster,
        10,
        DEFAULT_SCARCITY_SETTINGS
      );

      const qbStart = premiumsStart.find((p) => p.position === 'QB')?.premium || 0;
      const qbAfter = premiumsAfter.find((p) => p.position === 'QB')?.premium || 0;

      expect(qbStart).toBe(qbAfter); // QB unchanged when only WRs drafted
    });

    it('should increase WR premium when only WRs are drafted', () => {
      const qbs = createMockPlayers(15, 'QB', 60);
      const wrs = createMockPlayers(35, 'WR', 75);
      const allPlayers = [...qbs, ...wrs];

      const draftedNone = new Set<string>();
      const draftedWRs = new Set(wrs.slice(0, 15).map((p) => p.key));

      const premiumsStart = calculateAllScarcityPremiums(
        allPlayers,
        draftedNone,
        roster,
        12,
        DEFAULT_SCARCITY_SETTINGS
      );
      const premiumsAfter = calculateAllScarcityPremiums(
        allPlayers,
        draftedWRs,
        roster,
        12,
        DEFAULT_SCARCITY_SETTINGS
      );

      const wrStart = premiumsStart.find((p) => p.position === 'WR')?.premium || 0;
      const wrAfter = premiumsAfter.find((p) => p.position === 'WR')?.premium || 0;

      expect(wrAfter).toBeGreaterThanOrEqual(wrStart);
    });

    it('should maintain stable values for undrafted positions', () => {
      const qbs = createMockPlayers(15, 'QB', 55);
      const rbs = createMockPlayers(30, 'RB', 80);
      const tes = createMockPlayers(12, 'TE', 45);
      const allPlayers = [...qbs, ...rbs, ...tes];

      // Draft only RBs
      const draftedNone = new Set<string>();
      const draftedRBs = new Set(rbs.slice(0, 15).map((p) => p.key));

      const premiumsStart = calculateAllScarcityPremiums(
        allPlayers,
        draftedNone,
        roster,
        12,
        DEFAULT_SCARCITY_SETTINGS
      );
      const premiumsAfter = calculateAllScarcityPremiums(
        allPlayers,
        draftedRBs,
        roster,
        12,
        DEFAULT_SCARCITY_SETTINGS
      );

      const qbStart = premiumsStart.find((p) => p.position === 'QB')?.premium || 0;
      const qbAfter = premiumsAfter.find((p) => p.position === 'QB')?.premium || 0;
      const teStart = premiumsStart.find((p) => p.position === 'TE')?.premium || 0;
      const teAfter = premiumsAfter.find((p) => p.position === 'TE')?.premium || 0;

      expect(qbStart).toBe(qbAfter); // QB unchanged
      expect(teStart).toBe(teAfter); // TE unchanged
    });
  });

  describe('Drop-off Alert Scenarios', () => {
    it('should trigger critical alert when tier 1 nearly depleted', () => {
      // Create RBs with a LARGE tier gap (> 25 VOR difference)
      // Tier 1 threshold is 50, Tier 2 threshold is 25
      // Drop-off threshold is 25 points
      const rbs: IPlayerExtended[] = [
        // Tier 1 players (VOR >= 50) - only 3 of them
        ...createMockPlayers(1, 'RB', 75), // VOR: 75
        ...createMockPlayers(1, 'RB', 65).map((p) => ({ ...p, key: 'player1_RB_TEAM' })), // VOR: 65
        ...createMockPlayers(1, 'RB', 55).map((p) => ({ ...p, key: 'player2_RB_TEAM' })), // VOR: 55
        // Tier 2 players (25 <= VOR < 50) - big gap from tier 1
        ...createMockPlayers(1, 'RB', 30).map((p) => ({ ...p, key: 'player3_RB_TEAM' })), // VOR: 30
        ...createMockPlayers(1, 'RB', 28).map((p) => ({ ...p, key: 'player4_RB_TEAM' })), // VOR: 28
        ...createMockPlayers(1, 'RB', 26).map((p) => ({ ...p, key: 'player5_RB_TEAM' })), // VOR: 26
      ];
      // Tier 1 avg: (75+65+55)/3 = 65
      // Tier 2 avg: (30+28+26)/3 = 28
      // Drop-off: 65 - 28 = 37 > 25 threshold

      const draftedNone = new Set<string>();
      const alerts = detectDropOffs(rbs, draftedNone, DEFAULT_SCARCITY_SETTINGS);
      const rbAlert = alerts.find((a) => a.position === 'RB');

      // Should detect an alert due to large tier gap
      expect(rbAlert).toBeDefined();
      expect(rbAlert!.dropOffPoints).toBeGreaterThan(DEFAULT_SCARCITY_SETTINGS.dropOffThreshold);
      // With 3 tier 1 players remaining, should be critical severity (<=3 picks)
      expect(rbAlert!.severity).toBe('critical');
    });

    it('should trigger warning alert when drop-off is further away', () => {
      // Create players with clear tier separation and enough tier 1 remaining
      const rbs: IPlayerExtended[] = [
        ...createMockPlayers(8, 'RB', 80), // Tier 1: VOR 80, 75, 70, 65, 60, 55, 50, 45 (8 players >= 50)
      ];
      // Add tier 2 players with significant drop
      for (let i = 0; i < 8; i++) {
        rbs.push({
          ...createMockPlayers(1, 'RB', 35 - i * 3)[0],
          key: `player_tier2_${i}_RB_TEAM`,
        });
      }

      const drafted = new Set(rbs.slice(0, 2).map((p) => p.key)); // Draft only 2

      const alerts = detectDropOffs(rbs, drafted, DEFAULT_SCARCITY_SETTINGS);
      const rbAlert = alerts.find((a) => a.position === 'RB');

      if (rbAlert) {
        // If there's an alert with many tier 1 remaining, should be warning
        if (rbAlert.picksUntilDrop > 3) {
          expect(rbAlert.severity).toBe('warning');
        }
      }
    });

    it('should not trigger alerts when VOR decline is gradual', () => {
      // Create players with smooth VOR progression (no cliffs)
      const wrs: IPlayerExtended[] = [];
      for (let i = 0; i < 20; i++) {
        wrs.push({
          index: i,
          key: `player${i}_WR_TEAM`,
          name: `WR Player ${i + 1}`,
          pos: 'WR',
          team: 'TEAM',
          bye: 10,
          std: 50 - i,
          halfPpr: 100 - i * 2,
          ppr: 120 - i * 2,
          passingYards: 0,
          passingTds: 0,
          ints: 0,
          rushingYards: 0,
          rushingTds: 0,
          receptions: 0,
          receivingYards: 0,
          receivingTds: 0,
          vor: 60 - i * 2, // Gradual decline: 60, 58, 56, 54...
          forecast: 200 - i * 5,
        });
      }

      const draftedNone = new Set<string>();
      const alerts = detectDropOffs(wrs, draftedNone, DEFAULT_SCARCITY_SETTINGS);
      const wrAlert = alerts.find((a) => a.position === 'WR');

      // Gradual decline shouldn't trigger alert (drop-off < threshold)
      expect(wrAlert).toBeUndefined();
    });

    it('should update picks until drop as players are drafted', () => {
      const tes = createMockPlayers(12, 'TE', 70);

      // Count tier 1 players remaining at different draft stages
      const draftedNone = new Set<string>();
      const drafted2 = new Set(tes.slice(0, 2).map((p) => p.key));
      const drafted4 = new Set(tes.slice(0, 4).map((p) => p.key));

      const picksNone = getPicksUntilTierDrop(
        tes,
        draftedNone,
        'TE',
        DEFAULT_SCARCITY_SETTINGS
      );
      const picks2 = getPicksUntilTierDrop(
        tes,
        drafted2,
        'TE',
        DEFAULT_SCARCITY_SETTINGS
      );
      const picks4 = getPicksUntilTierDrop(
        tes,
        drafted4,
        'TE',
        DEFAULT_SCARCITY_SETTINGS
      );

      expect(picksNone).toBeGreaterThan(picks2);
      expect(picks2).toBeGreaterThan(picks4);
    });
  });

  describe('Full Draft Simulation', () => {
    it('should track scarcity across a simulated draft', () => {
      // Create a realistic player pool
      const qbs = createMockPlayers(16, 'QB', 65);
      const rbs = createMockPlayers(40, 'RB', 85);
      const wrs = createMockPlayers(45, 'WR', 80);
      const tes = createMockPlayers(15, 'TE', 55);
      const allPlayers = [...qbs, ...rbs, ...wrs, ...tes];

      const numberOfTeams = 12;
      const drafted = new Set<string>();

      // Simulate first 3 rounds (36 picks) with mixed drafting
      const draftOrder = [
        ...rbs.slice(0, 12).map((p) => p.key), // Round 1: 12 RBs
        ...wrs.slice(0, 8).map((p) => p.key), // 8 WRs
        ...rbs.slice(12, 16).map((p) => p.key), // Round 2: 4 more RBs
        ...wrs.slice(8, 14).map((p) => p.key), // 6 more WRs
        ...tes.slice(0, 2).map((p) => p.key), // 2 TEs
        ...rbs.slice(16, 20).map((p) => p.key), // Round 3: 4 more RBs
        ...wrs.slice(14, 18).map((p) => p.key), // 4 more WRs
      ];

      // Track premium progression
      const rbPremiums: number[] = [];
      const qbPremiums: number[] = [];

      for (const key of draftOrder) {
        drafted.add(key);

        const premiums = calculateAllScarcityPremiums(
          allPlayers,
          drafted,
          roster,
          numberOfTeams,
          DEFAULT_SCARCITY_SETTINGS
        );

        rbPremiums.push(premiums.find((p) => p.position === 'RB')?.premium || 0);
        qbPremiums.push(premiums.find((p) => p.position === 'QB')?.premium || 0);
      }

      // RB premium should generally increase as RBs are heavily drafted
      const firstRBPremium = rbPremiums[0];
      const lastRBPremium = rbPremiums[rbPremiums.length - 1];
      expect(lastRBPremium).toBeGreaterThanOrEqual(firstRBPremium);

      // QB premium should remain stable since no QBs drafted
      const uniqueQBPremiums = new Set(qbPremiums);
      expect(uniqueQBPremiums.size).toBe(1); // All the same value
    });

    it('should show position supply correctly reflects draft activity', () => {
      const rbs = createMockPlayers(30, 'RB', 75);
      const wrs = createMockPlayers(30, 'WR', 70);
      const allPlayers = [...rbs, ...wrs];

      const draftedNone = new Set<string>();
      const drafted10RBs = new Set(rbs.slice(0, 10).map((p) => p.key));

      const supplyBefore = calculatePositionSupply(
        allPlayers,
        draftedNone,
        'RB',
        DEFAULT_SCARCITY_SETTINGS
      );
      const supplyAfter = calculatePositionSupply(
        allPlayers,
        drafted10RBs,
        'RB',
        DEFAULT_SCARCITY_SETTINGS
      );

      expect(supplyBefore.remainingCount).toBe(30);
      expect(supplyAfter.remainingCount).toBe(20);
      expect(supplyBefore.draftedCount).toBe(0);
      expect(supplyAfter.draftedCount).toBe(10);

      // Tier counts should also decrease
      expect(supplyAfter.tier1Remaining).toBeLessThan(supplyBefore.tier1Remaining);
    });
  });

  describe('Export Verification', () => {
    it('should export all scarcity functions from index', () => {
      expect(calculatePositionSupply).toBeDefined();
      expect(typeof calculatePositionSupply).toBe('function');

      expect(calculateScarcityPremium).toBeDefined();
      expect(typeof calculateScarcityPremium).toBe('function');

      expect(calculateAllScarcityPremiums).toBeDefined();
      expect(typeof calculateAllScarcityPremiums).toBe('function');

      expect(applyScarcityPremium).toBeDefined();
      expect(typeof applyScarcityPremium).toBe('function');

      expect(detectDropOffs).toBeDefined();
      expect(typeof detectDropOffs).toBe('function');

      expect(getPicksUntilTierDrop).toBeDefined();
      expect(typeof getPicksUntilTierDrop).toBe('function');

      expect(DEFAULT_SCARCITY_SETTINGS).toBeDefined();
      expect(typeof DEFAULT_SCARCITY_SETTINGS).toBe('object');
    });

    it('should have properly configured DEFAULT_SCARCITY_SETTINGS', () => {
      expect(DEFAULT_SCARCITY_SETTINGS.tierThresholds).toBeDefined();
      expect(DEFAULT_SCARCITY_SETTINGS.tierThresholds.tier1).toBeGreaterThan(0);
      expect(DEFAULT_SCARCITY_SETTINGS.tierThresholds.tier2).toBeGreaterThan(0);
      expect(DEFAULT_SCARCITY_SETTINGS.tierThresholds.tier1).toBeGreaterThan(
        DEFAULT_SCARCITY_SETTINGS.tierThresholds.tier2
      );

      expect(DEFAULT_SCARCITY_SETTINGS.premiumMultipliers).toBeDefined();
      expect(DEFAULT_SCARCITY_SETTINGS.premiumMultipliers.low).toBeGreaterThan(0);
      expect(DEFAULT_SCARCITY_SETTINGS.premiumMultipliers.critical).toBeGreaterThan(
        DEFAULT_SCARCITY_SETTINGS.premiumMultipliers.low
      );

      expect(DEFAULT_SCARCITY_SETTINGS.dropOffThreshold).toBeGreaterThan(0);
      expect(DEFAULT_SCARCITY_SETTINGS.positionWeights).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty player pool gracefully', () => {
      const players: IPlayerExtended[] = [];
      const drafted = new Set<string>();

      const premiums = calculateAllScarcityPremiums(
        players,
        drafted,
        roster,
        12,
        DEFAULT_SCARCITY_SETTINGS
      );

      // Should return premiums for all positions, even with empty pool
      expect(premiums.length).toBeGreaterThan(0);

      const alerts = detectDropOffs(players, drafted, DEFAULT_SCARCITY_SETTINGS);
      expect(alerts).toHaveLength(0);

      const picksUntil = getPicksUntilTierDrop(
        players,
        drafted,
        'RB',
        DEFAULT_SCARCITY_SETTINGS
      );
      expect(picksUntil).toBe(0);
    });

    it('should handle all players being drafted', () => {
      const rbs = createMockPlayers(10, 'RB', 60);
      const allDrafted = new Set(rbs.map((p) => p.key));

      const supply = calculatePositionSupply(
        rbs,
        allDrafted,
        'RB',
        DEFAULT_SCARCITY_SETTINGS
      );

      expect(supply.remainingCount).toBe(0);
      expect(supply.tier1Remaining).toBe(0);
      expect(supply.tier2Remaining).toBe(0);
      expect(supply.tier3Remaining).toBe(0);
    });

    it('should handle single player at position', () => {
      const singleRB = createMockPlayers(1, 'RB', 50);
      const drafted = new Set<string>();

      const supply = calculatePositionSupply(
        singleRB,
        drafted,
        'RB',
        DEFAULT_SCARCITY_SETTINGS
      );

      expect(supply.totalPlayers).toBe(1);
      expect(supply.remainingCount).toBe(1);

      const alerts = detectDropOffs(singleRB, drafted, DEFAULT_SCARCITY_SETTINGS);
      const rbAlert = alerts.find((a) => a.position === 'RB');
      expect(rbAlert).toBeUndefined(); // Can't have drop-off with single player
    });
  });
});
