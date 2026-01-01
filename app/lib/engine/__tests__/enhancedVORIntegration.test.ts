/**
 * Enhanced VOR Integration Tests
 *
 * Integration tests that verify the complete Enhanced VOR pipeline
 * works correctly end-to-end, including:
 * - Full pipeline from players to recommendations
 * - All adjustments (risk, schedule, scarcity) applied correctly
 * - Recommendations sorted by enhanced VOR
 * - Urgency and value indicators correct
 * - Export verification - all functions available from index
 * - End-to-end test with realistic draft scenario
 * - Integration with multiple positions
 * - Edge case: All players at one position drafted
 * - Rankings are assigned correctly
 * - adpDiff calculations match expected
 */

import {
  // Enhanced VOR functions
  calculateEnhancedVOR,
  calculateAllEnhancedVORs,
  getPlayerWithEnhancedVOR,
  // Recommendation functions
  getTopRecommendations,
  getValueIndicator,
  getUrgency,
  generateReasons,
  // Model exports
  DEFAULT_RECOMMENDATION_SETTINGS,
  isValidEnhancedVOR,
  isValidRecommendation,
  // Settings defaults
  DEFAULT_RISK_SETTINGS,
  DEFAULT_SCARCITY_SETTINGS,
  DEFAULT_SCHEDULE_SETTINGS,
} from '../index';
import { IPlayerExtended, Position } from '../../models/Player';
import { IRiskProfile } from '../../models/Risk';
import { IRoster } from '../../models/Team';
import {
  IEnhancedVOR,
  IRecommendationSettings,
  Urgency,
  ValueIndicator,
} from '../../models/EnhancedVOR';

/**
 * Helper function to create a mock player with all required IScoring fields.
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
 * Helper function to create a player with risk data.
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
 * Helper function to create a set of mock players at a position.
 * Creates players with decreasing VOR values.
 */
function createMockPlayers(
  count: number,
  position: Position,
  startVOR: number,
  keyPrefix = 'player'
): IPlayerExtended[] {
  return Array(count)
    .fill(null)
    .map((_, i) => createMockPlayer({
      index: i,
      key: `${keyPrefix}${i}_${position}`,
      name: `${position} Player ${i + 1}`,
      pos: position,
      std: startVOR - i, // ADP decreases with index
      vor: startVOR - i * 5,
      forecast: 200 - i * 10,
    }));
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

describe('Enhanced VOR Integration', () => {
  const roster = createRosterFormat();
  const numberOfTeams = 12;

  describe('Full Pipeline', () => {
    it('should calculate enhanced VORs and generate recommendations end-to-end', () => {
      // Create a realistic player pool with multiple positions
      const qbs = createMockPlayers(12, 'QB', 60, 'qb');
      const rbs = createMockPlayers(30, 'RB', 85, 'rb');
      const wrs = createMockPlayers(35, 'WR', 80, 'wr');
      const tes = createMockPlayers(12, 'TE', 50, 'te');
      const allPlayers = [...qbs, ...rbs, ...wrs, ...tes];

      const draftedKeys = new Set<string>();

      // Step 1: Calculate enhanced VORs for all players
      const enhancedVORs = calculateAllEnhancedVORs(
        allPlayers,
        draftedKeys,
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        roster,
        numberOfTeams
      );

      expect(enhancedVORs.length).toBe(allPlayers.length);
      expect(enhancedVORs[0].overallRank).toBe(1);

      // Step 2: Generate recommendations
      const neededPositions: Position[] = ['RB', 'WR'];
      const recommendations = getTopRecommendations(
        enhancedVORs,
        allPlayers,
        draftedKeys,
        neededPositions,
        DEFAULT_RECOMMENDATION_SETTINGS
      );

      expect(recommendations.length).toBe(DEFAULT_RECOMMENDATION_SETTINGS.topNPlayers);

      // Verify each recommendation has all required fields
      recommendations.forEach((rec) => {
        expect(rec.player).toBeDefined();
        expect(rec.enhancedVOR).toBeDefined();
        expect(rec.urgency).toBeDefined();
        expect(rec.valueIndicator).toBeDefined();
        expect(rec.reasons).toBeDefined();
        expect(isValidRecommendation(rec)).toBe(true);
      });
    });

    it('should update rankings as players are drafted', () => {
      const rbs = createMockPlayers(20, 'RB', 100, 'rb');

      // Initial rankings
      const initialVORs = calculateAllEnhancedVORs(
        rbs,
        new Set(),
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        roster,
        numberOfTeams
      );

      // Draft top 5 players
      const draftedKeys = new Set(rbs.slice(0, 5).map((p) => p.key));

      // Updated rankings
      const updatedVORs = calculateAllEnhancedVORs(
        rbs,
        draftedKeys,
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        roster,
        numberOfTeams
      );

      // Should have fewer players
      expect(updatedVORs.length).toBe(15);

      // New rank 1 should be what was rank 6
      const newRank1 = updatedVORs[0];
      const oldRank6 = initialVORs[5];
      expect(newRank1.playerId).toBe(oldRank6.playerId);
      expect(newRank1.overallRank).toBe(1);
    });
  });

  describe('All Adjustments Applied Correctly', () => {
    it('should apply risk adjustment for players with risk profiles', () => {
      // Create a risky player
      const riskyPlayer = createPlayerWithRisk(
        { key: 'risky-rb', pos: 'RB', vor: 80 },
        70, // High injury risk
        0.6 // Low consistency
      );

      const result = calculateEnhancedVOR(
        riskyPlayer,
        DEFAULT_RISK_SETTINGS,
        0,
        0
      );

      // Risk adjustment should be negative for a risky player
      expect(result.riskAdjustment).toBeLessThan(0);
      expect(result.enhancedVOR).toBeLessThan(result.baseVOR);
    });

    it('should apply schedule adjustment when provided', () => {
      const player = createMockPlayer({ key: 'schedule-test', vor: 60 });
      const scheduleScore = 8; // Favorable schedule

      const result = calculateEnhancedVOR(
        player,
        DEFAULT_RISK_SETTINGS,
        scheduleScore,
        0
      );

      expect(result.scheduleAdjustment).toBe(8);
      expect(result.enhancedVOR).toBe(68); // 60 + 0 + 8 + 0
    });

    it('should apply scarcity premium when position is scarce', () => {
      const player = createMockPlayer({ key: 'scarce-test', vor: 50 });
      const scarcityPremium = 12;

      const result = calculateEnhancedVOR(
        player,
        DEFAULT_RISK_SETTINGS,
        0,
        scarcityPremium
      );

      expect(result.scarcityPremium).toBe(12);
      expect(result.enhancedVOR).toBe(62); // 50 + 0 + 0 + 12
    });

    it('should combine all adjustments correctly', () => {
      const player = createPlayerWithRisk(
        { key: 'combined-test', pos: 'RB', vor: 100 },
        40, // Moderate injury risk
        0.75 // Good consistency
      );

      const scheduleScore = 5;
      const scarcityPremium = 10;

      const result = calculateEnhancedVOR(
        player,
        DEFAULT_RISK_SETTINGS,
        scheduleScore,
        scarcityPremium
      );

      // Enhanced VOR = baseVOR + riskAdjustment + scheduleAdjustment + scarcityPremium
      const expectedEnhanced =
        result.baseVOR +
        result.riskAdjustment +
        result.scheduleAdjustment +
        result.scarcityPremium;
      expect(result.enhancedVOR).toBe(expectedEnhanced);
    });
  });

  describe('Recommendations Sorted Correctly', () => {
    it('should sort recommendations by enhanced VOR when no position needs', () => {
      const players = [
        createMockPlayer({ key: 'low', pos: 'RB', vor: 30 }),
        createMockPlayer({ key: 'high', pos: 'RB', vor: 100 }),
        createMockPlayer({ key: 'mid', pos: 'RB', vor: 60 }),
      ];

      const enhancedVORs = calculateAllEnhancedVORs(
        players,
        new Set(),
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        roster,
        numberOfTeams
      );

      const recommendations = getTopRecommendations(
        enhancedVORs,
        players,
        new Set(),
        [], // No needed positions
        { ...DEFAULT_RECOMMENDATION_SETTINGS, topNPlayers: 3 }
      );

      // All same urgency (low), so should be sorted by enhanced VOR
      expect(recommendations[0].player.key).toBe('high');
      expect(recommendations[1].player.key).toBe('mid');
      expect(recommendations[2].player.key).toBe('low');
    });

    it('should prioritize needed positions over higher VOR', () => {
      const players = [
        createMockPlayer({ key: 'qb1', pos: 'QB', vor: 50 }),
        createMockPlayer({ key: 'rb1', pos: 'RB', vor: 100 }), // Higher VOR
        createMockPlayer({ key: 'wr1', pos: 'WR', vor: 80 }),
      ];

      const enhancedVORs = calculateAllEnhancedVORs(
        players,
        new Set(),
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        roster,
        numberOfTeams
      );

      const neededPositions: Position[] = ['QB']; // Only need QB

      const recommendations = getTopRecommendations(
        enhancedVORs,
        players,
        new Set(),
        neededPositions,
        { ...DEFAULT_RECOMMENDATION_SETTINGS, topNPlayers: 3 }
      );

      // QB should be first despite lower VOR because it's needed
      expect(recommendations[0].player.pos).toBe('QB');
    });
  });

  describe('Urgency and Value Indicators', () => {
    it('should assign correct urgency based on scarcity premium', () => {
      const testCases: Array<{ premium: number; expected: Urgency }> = [
        { premium: 35, expected: 'must-draft' },
        { premium: 25, expected: 'high' },
        { premium: 15, expected: 'medium' },
        { premium: 5, expected: 'low' },
      ];

      testCases.forEach(({ premium, expected }) => {
        const enhancedVOR: IEnhancedVOR = {
          playerId: 'test',
          playerName: 'Test',
          position: 'RB',
          baseVOR: 50,
          forecast: 200,
          riskAdjustment: 0,
          scheduleAdjustment: 0,
          scarcityPremium: premium,
          enhancedVOR: 50 + premium,
          overallRank: 1,
          positionRank: 1,
          adpDiff: 0,
        };

        const urgency = getUrgency(enhancedVOR, [], DEFAULT_RECOMMENDATION_SETTINGS);
        expect(urgency).toBe(expected);
      });
    });

    it('should assign correct value indicator based on adpDiff', () => {
      const testCases: Array<{ adpDiff: number; expected: ValueIndicator }> = [
        { adpDiff: 20, expected: 'steal' },
        { adpDiff: 10, expected: 'good-value' },
        { adpDiff: 0, expected: 'fair' },
        { adpDiff: -10, expected: 'reach' },
        { adpDiff: -20, expected: 'avoid' },
      ];

      testCases.forEach(({ adpDiff, expected }) => {
        const indicator = getValueIndicator(adpDiff, DEFAULT_RECOMMENDATION_SETTINGS);
        expect(indicator).toBe(expected);
      });
    });

    it('should generate appropriate reasons for recommendations', () => {
      const enhancedVOR: IEnhancedVOR = {
        playerId: 'rb1',
        playerName: 'Star RB',
        position: 'RB',
        baseVOR: 80,
        forecast: 280,
        riskAdjustment: 0,
        scheduleAdjustment: 5,
        scarcityPremium: 15,
        enhancedVOR: 100,
        overallRank: 1,
        positionRank: 1,
        adpDiff: 12,
      };

      const neededPositions: Position[] = ['RB'];
      const reasons = generateReasons(enhancedVOR, [], neededPositions);

      // Should include multiple reasons
      expect(reasons.length).toBeGreaterThan(0);
      expect(reasons.some((r) => r.includes('positional need'))).toBe(true);
      expect(reasons.some((r) => r.includes('ADP value'))).toBe(true);
      expect(reasons.some((r) => r.includes('Scarce position'))).toBe(true);
      expect(reasons.some((r) => r.includes('Favorable schedule'))).toBe(true);
    });
  });

  describe('Export Verification', () => {
    it('should export all enhanced VOR functions from index', () => {
      expect(calculateEnhancedVOR).toBeDefined();
      expect(typeof calculateEnhancedVOR).toBe('function');

      expect(calculateAllEnhancedVORs).toBeDefined();
      expect(typeof calculateAllEnhancedVORs).toBe('function');

      expect(getPlayerWithEnhancedVOR).toBeDefined();
      expect(typeof getPlayerWithEnhancedVOR).toBe('function');
    });

    it('should export all recommendation functions from index', () => {
      expect(getTopRecommendations).toBeDefined();
      expect(typeof getTopRecommendations).toBe('function');

      expect(getValueIndicator).toBeDefined();
      expect(typeof getValueIndicator).toBe('function');

      expect(getUrgency).toBeDefined();
      expect(typeof getUrgency).toBe('function');

      expect(generateReasons).toBeDefined();
      expect(typeof generateReasons).toBe('function');
    });

    it('should export all model constants and validators from index', () => {
      expect(DEFAULT_RECOMMENDATION_SETTINGS).toBeDefined();
      expect(typeof DEFAULT_RECOMMENDATION_SETTINGS).toBe('object');
      expect(DEFAULT_RECOMMENDATION_SETTINGS.topNPlayers).toBe(5);
      expect(DEFAULT_RECOMMENDATION_SETTINGS.adpValueThreshold).toBe(15);

      expect(isValidEnhancedVOR).toBeDefined();
      expect(typeof isValidEnhancedVOR).toBe('function');

      expect(isValidRecommendation).toBeDefined();
      expect(typeof isValidRecommendation).toBe('function');
    });

    it('should export settings from dependent modules', () => {
      expect(DEFAULT_RISK_SETTINGS).toBeDefined();
      expect(DEFAULT_SCARCITY_SETTINGS).toBeDefined();
      expect(DEFAULT_SCHEDULE_SETTINGS).toBeDefined();
    });
  });

  describe('Realistic Draft Scenarios', () => {
    it('should handle complete multi-round draft simulation', () => {
      // Create a realistic player pool
      const qbs = createMockPlayers(16, 'QB', 65, 'qb');
      const rbs = createMockPlayers(40, 'RB', 90, 'rb');
      const wrs = createMockPlayers(50, 'WR', 85, 'wr');
      const tes = createMockPlayers(15, 'TE', 55, 'te');
      const allPlayers = [...qbs, ...rbs, ...wrs, ...tes];

      const drafted = new Set<string>();
      const recommendationSettings: IRecommendationSettings = {
        ...DEFAULT_RECOMMENDATION_SETTINGS,
        topNPlayers: 5,
      };

      // Simulate 3 rounds (36 picks for 12 teams)
      const draftOrder = [
        // Round 1: Mostly RBs and WRs
        ...rbs.slice(0, 8).map((p) => p.key),
        ...wrs.slice(0, 4).map((p) => p.key),
        // Round 2: Mix of positions
        ...rbs.slice(8, 12).map((p) => p.key),
        ...wrs.slice(4, 10).map((p) => p.key),
        ...tes.slice(0, 2).map((p) => p.key),
        // Round 3: More variety
        ...rbs.slice(12, 16).map((p) => p.key),
        ...wrs.slice(10, 14).map((p) => p.key),
        ...qbs.slice(0, 2).map((p) => p.key),
        ...tes.slice(2, 4).map((p) => p.key),
      ];

      // Track recommendations at different stages
      const recommendationsAtStages: Array<{
        draftedCount: number;
        recommendations: ReturnType<typeof getTopRecommendations>;
        draftedAtStage: Set<string>;
      }> = [];

      for (let i = 0; i < draftOrder.length; i++) {
        drafted.add(draftOrder[i]);

        if (i % 12 === 11) {
          // After each "round"
          const enhancedVORs = calculateAllEnhancedVORs(
            allPlayers,
            drafted,
            DEFAULT_RISK_SETTINGS,
            DEFAULT_SCARCITY_SETTINGS,
            DEFAULT_SCHEDULE_SETTINGS,
            roster,
            numberOfTeams
          );

          const recommendations = getTopRecommendations(
            enhancedVORs,
            allPlayers,
            drafted,
            ['RB', 'WR'], // Team needs
            recommendationSettings
          );

          // Store a copy of the drafted set at this stage
          recommendationsAtStages.push({
            draftedCount: drafted.size,
            recommendations,
            draftedAtStage: new Set(drafted),
          });
        }
      }

      // Verify each stage has valid recommendations
      recommendationsAtStages.forEach((stage) => {
        expect(stage.recommendations.length).toBeGreaterThan(0);
        expect(stage.recommendations.length).toBeLessThanOrEqual(5);

        // Each recommendation should be valid and not already drafted at that stage
        stage.recommendations.forEach((rec) => {
          expect(isValidRecommendation(rec)).toBe(true);
          expect(stage.draftedAtStage.has(rec.player.key)).toBe(false);
        });
      });
    });

    it('should reflect scarcity as positions are drafted', () => {
      const rbs = createMockPlayers(30, 'RB', 80, 'rb');
      const wrs = createMockPlayers(35, 'WR', 75, 'wr');
      const allPlayers = [...rbs, ...wrs];

      // Initial state
      const initialVORs = calculateAllEnhancedVORs(
        allPlayers,
        new Set(),
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        roster,
        numberOfTeams
      );

      // Draft only RBs
      const draftedRBs = new Set(rbs.slice(0, 15).map((p) => p.key));

      const afterRBDraftVORs = calculateAllEnhancedVORs(
        allPlayers,
        draftedRBs,
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        roster,
        numberOfTeams
      );

      // Find a remaining RB in both lists
      const remainingRBKey = rbs[15].key;
      const initialRB = initialVORs.find((v) => v.playerId === remainingRBKey);
      const afterRB = afterRBDraftVORs.find((v) => v.playerId === remainingRBKey);

      // RB scarcity premium should increase after many RBs drafted
      expect(afterRB!.scarcityPremium).toBeGreaterThanOrEqual(initialRB!.scarcityPremium);
    });
  });

  describe('Integration with Multiple Positions', () => {
    it('should calculate enhanced VORs for all positions correctly', () => {
      const qbs = createMockPlayers(4, 'QB', 60, 'qb');
      const rbs = createMockPlayers(6, 'RB', 80, 'rb');
      const wrs = createMockPlayers(6, 'WR', 75, 'wr');
      const tes = createMockPlayers(4, 'TE', 50, 'te');
      const allPlayers = [...qbs, ...rbs, ...wrs, ...tes];

      const enhancedVORs = calculateAllEnhancedVORs(
        allPlayers,
        new Set(),
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        roster,
        numberOfTeams
      );

      // All players should have enhanced VOR calculated
      expect(enhancedVORs.length).toBe(20);

      // Each position should have position ranks
      const positionRanks = {
        QB: enhancedVORs.filter((v) => v.position === 'QB').map((v) => v.positionRank),
        RB: enhancedVORs.filter((v) => v.position === 'RB').map((v) => v.positionRank),
        WR: enhancedVORs.filter((v) => v.position === 'WR').map((v) => v.positionRank),
        TE: enhancedVORs.filter((v) => v.position === 'TE').map((v) => v.positionRank),
      };

      // Position ranks should be 1-based and sequential
      expect(positionRanks.QB.sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
      expect(positionRanks.RB.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
      expect(positionRanks.WR.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
      expect(positionRanks.TE.sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
    });

    it('should generate recommendations across multiple positions', () => {
      const qbs = createMockPlayers(8, 'QB', 60, 'qb');
      const rbs = createMockPlayers(12, 'RB', 85, 'rb');
      const wrs = createMockPlayers(12, 'WR', 80, 'wr');
      const tes = createMockPlayers(6, 'TE', 55, 'te');
      const allPlayers = [...qbs, ...rbs, ...wrs, ...tes];

      const enhancedVORs = calculateAllEnhancedVORs(
        allPlayers,
        new Set(),
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        roster,
        numberOfTeams
      );

      // Need all positions
      const neededPositions: Position[] = ['QB', 'RB', 'WR', 'TE'];

      const recommendations = getTopRecommendations(
        enhancedVORs,
        allPlayers,
        new Set(),
        neededPositions,
        { ...DEFAULT_RECOMMENDATION_SETTINGS, topNPlayers: 10 }
      );

      expect(recommendations.length).toBe(10);

      // Should have variety of positions in top recommendations
      const positionsInRecs = new Set(recommendations.map((r) => r.player.pos));
      expect(positionsInRecs.size).toBeGreaterThan(1);
    });
  });

  describe('Edge Case: All Players at One Position Drafted', () => {
    it('should handle when all players at a position are drafted', () => {
      const rbs = createMockPlayers(5, 'RB', 80, 'rb');
      const wrs = createMockPlayers(10, 'WR', 75, 'wr');
      const allPlayers = [...rbs, ...wrs];

      // Draft all RBs
      const allRBsDrafted = new Set(rbs.map((p) => p.key));

      const enhancedVORs = calculateAllEnhancedVORs(
        allPlayers,
        allRBsDrafted,
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        roster,
        numberOfTeams
      );

      // Should only have WRs
      expect(enhancedVORs.length).toBe(10);
      expect(enhancedVORs.every((v) => v.position === 'WR')).toBe(true);

      // WR position ranks should be 1-10
      const wrRanks = enhancedVORs.map((v) => v.positionRank).sort((a, b) => a - b);
      expect(wrRanks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('should return empty recommendations when no players available', () => {
      const rbs = createMockPlayers(3, 'RB', 50, 'rb');
      const allDrafted = new Set(rbs.map((p) => p.key));

      const enhancedVORs = calculateAllEnhancedVORs(
        rbs,
        allDrafted,
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        roster,
        numberOfTeams
      );

      expect(enhancedVORs.length).toBe(0);

      const recommendations = getTopRecommendations(
        enhancedVORs,
        rbs,
        allDrafted,
        ['RB'],
        DEFAULT_RECOMMENDATION_SETTINGS
      );

      expect(recommendations.length).toBe(0);
    });
  });

  describe('Rankings Assigned Correctly', () => {
    it('should assign overall ranks based on enhanced VOR', () => {
      const players = [
        createMockPlayer({ key: 'p1', pos: 'RB', vor: 100 }),
        createMockPlayer({ key: 'p2', pos: 'WR', vor: 80 }),
        createMockPlayer({ key: 'p3', pos: 'QB', vor: 60 }),
        createMockPlayer({ key: 'p4', pos: 'TE', vor: 40 }),
      ];

      const enhancedVORs = calculateAllEnhancedVORs(
        players,
        new Set(),
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        roster,
        numberOfTeams
      );

      // Should be sorted by enhanced VOR descending
      expect(enhancedVORs[0].playerId).toBe('p1');
      expect(enhancedVORs[0].overallRank).toBe(1);

      expect(enhancedVORs[1].playerId).toBe('p2');
      expect(enhancedVORs[1].overallRank).toBe(2);

      expect(enhancedVORs[2].playerId).toBe('p3');
      expect(enhancedVORs[2].overallRank).toBe(3);

      expect(enhancedVORs[3].playerId).toBe('p4');
      expect(enhancedVORs[3].overallRank).toBe(4);
    });

    it('should assign position ranks within each position group', () => {
      const players = [
        createMockPlayer({ key: 'rb1', pos: 'RB', vor: 100 }),
        createMockPlayer({ key: 'rb2', pos: 'RB', vor: 70 }),
        createMockPlayer({ key: 'rb3', pos: 'RB', vor: 40 }),
        createMockPlayer({ key: 'wr1', pos: 'WR', vor: 90 }),
        createMockPlayer({ key: 'wr2', pos: 'WR', vor: 50 }),
      ];

      const enhancedVORs = calculateAllEnhancedVORs(
        players,
        new Set(),
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        roster,
        numberOfTeams
      );

      // Check RB position ranks
      const rb1 = enhancedVORs.find((v) => v.playerId === 'rb1');
      const rb2 = enhancedVORs.find((v) => v.playerId === 'rb2');
      const rb3 = enhancedVORs.find((v) => v.playerId === 'rb3');
      expect(rb1?.positionRank).toBe(1);
      expect(rb2?.positionRank).toBe(2);
      expect(rb3?.positionRank).toBe(3);

      // Check WR position ranks
      const wr1 = enhancedVORs.find((v) => v.playerId === 'wr1');
      const wr2 = enhancedVORs.find((v) => v.playerId === 'wr2');
      expect(wr1?.positionRank).toBe(1);
      expect(wr2?.positionRank).toBe(2);
    });
  });

  describe('adpDiff Calculations', () => {
    it('should calculate positive adpDiff for value picks', () => {
      // Player with ADP 20 but ranked 1 (great value)
      const player = createMockPlayer({
        key: 'value-pick',
        vor: 100,
        std: 20, // ADP rank
      });

      const enhancedVORs = calculateAllEnhancedVORs(
        [player],
        new Set(),
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        roster,
        numberOfTeams
      );

      // adpDiff = ADP rank - enhanced VOR rank = 20 - 1 = 19 (positive = value)
      expect(enhancedVORs[0].overallRank).toBe(1);
      expect(enhancedVORs[0].adpDiff).toBe(19);
    });

    it('should calculate negative adpDiff for reach picks', () => {
      // Player with ADP 5 but ranked 10 (reach)
      const players = createMockPlayers(10, 'RB', 100, 'rb');
      // Make last player have ADP 5 (would be a reach)
      players[9] = {
        ...players[9],
        std: 5, // ADP is 5
        vor: 55, // Lowest VOR
      };

      const enhancedVORs = calculateAllEnhancedVORs(
        players,
        new Set(),
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        roster,
        numberOfTeams
      );

      const reachPlayer = enhancedVORs.find((v) => v.playerId === players[9].key);
      // adpDiff = ADP rank - enhanced VOR rank = 5 - 10 = -5 (negative = reach)
      expect(reachPlayer!.adpDiff).toBeLessThan(0);
    });

    it('should calculate adpDiff correctly for multiple players', () => {
      const players = [
        createMockPlayer({ key: 'p1', vor: 100, std: 10 }), // Rank 1, ADP 10 = +9
        createMockPlayer({ key: 'p2', vor: 80, std: 1 }), // Rank 2, ADP 1 = -1
        createMockPlayer({ key: 'p3', vor: 60, std: 3 }), // Rank 3, ADP 3 = 0
      ];

      const enhancedVORs = calculateAllEnhancedVORs(
        players,
        new Set(),
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        roster,
        numberOfTeams
      );

      const p1 = enhancedVORs.find((v) => v.playerId === 'p1');
      const p2 = enhancedVORs.find((v) => v.playerId === 'p2');
      const p3 = enhancedVORs.find((v) => v.playerId === 'p3');

      expect(p1?.adpDiff).toBe(9); // 10 - 1
      expect(p2?.adpDiff).toBe(-1); // 1 - 2
      expect(p3?.adpDiff).toBe(0); // 3 - 3
    });
  });

  describe('Type Validation', () => {
    it('should produce valid IEnhancedVOR objects', () => {
      const player = createMockPlayer();
      const result = calculateEnhancedVOR(player, DEFAULT_RISK_SETTINGS, 5, 3);

      expect(isValidEnhancedVOR(result)).toBe(true);
    });

    it('should produce valid IPlayerRecommendation objects', () => {
      const players = createMockPlayers(5, 'RB', 80, 'rb');

      const enhancedVORs = calculateAllEnhancedVORs(
        players,
        new Set(),
        DEFAULT_RISK_SETTINGS,
        DEFAULT_SCARCITY_SETTINGS,
        DEFAULT_SCHEDULE_SETTINGS,
        roster,
        numberOfTeams
      );

      const recommendations = getTopRecommendations(
        enhancedVORs,
        players,
        new Set(),
        ['RB'],
        DEFAULT_RECOMMENDATION_SETTINGS
      );

      recommendations.forEach((rec) => {
        expect(isValidRecommendation(rec)).toBe(true);
      });
    });

    it('should merge player with enhanced VOR correctly', () => {
      const player = createMockPlayer({ key: 'merge-test', vor: 75 });
      const enhancedVOR: IEnhancedVOR = {
        playerId: 'merge-test',
        playerName: 'Test Player',
        position: 'RB',
        baseVOR: 75,
        forecast: 200,
        riskAdjustment: -5,
        scheduleAdjustment: 3,
        scarcityPremium: 2,
        enhancedVOR: 75,
        overallRank: 5,
        positionRank: 3,
        adpDiff: 10,
      };

      const merged = getPlayerWithEnhancedVOR(player, enhancedVOR);

      // Should preserve original player properties
      expect(merged.key).toBe('merge-test');
      expect(merged.vor).toBe(75);
      expect(merged.pos).toBe('RB');

      // Should have enhancedVOR attached
      expect(merged.enhancedVOR).toEqual(enhancedVOR);
    });
  });
});
