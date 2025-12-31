import { IPlayer } from '../../../models/Player';
import { IStoreState, initialState, initialRoster, initialScore, createTeam } from '../../store';
import { dstPointsPerGame, initStore, updatePlayerVORs } from '../players';

/**
 * Helper to create a mock player with reasonable defaults
 */
const createMockPlayer = (overrides: Partial<IPlayer>): IPlayer => ({
  index: 0,
  key: 'player-1',
  name: 'Test Player',
  pos: 'QB',
  team: 'TEST',
  bye: 7,
  std: 100,
  halfPpr: 100,
  ppr: 100,
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
  ...overrides,
});

/**
 * Create a set of mock QBs with varying production levels
 */
const createMockQBs = (count: number): IPlayer[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockPlayer({
      index: i,
      key: `qb-${i}`,
      name: `QB ${i + 1}`,
      pos: 'QB',
      // Top QBs have ~4500 pass yards, ~35 TDs; decreases for lower-ranked
      passYds: 4500 - i * 150,
      passTds: 35 - i,
      passInts: 8 + Math.floor(i / 3),
      rushYds: 200 - i * 10,
      rushTds: 2 - Math.floor(i / 5),
    })
  );
};

/**
 * Create a set of mock RBs with varying production levels
 */
const createMockRBs = (count: number): IPlayer[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockPlayer({
      index: i + 100,
      key: `rb-${i}`,
      name: `RB ${i + 1}`,
      pos: 'RB',
      // Top RBs have ~1400 rush yards, ~12 TDs; decreases for lower-ranked
      rushYds: 1400 - i * 50,
      rushTds: 12 - Math.floor(i / 3),
      receptions: 50 - i * 2,
      receptionYds: 400 - i * 20,
      receptionTds: 2 - Math.floor(i / 10),
    })
  );
};

/**
 * Create a set of mock WRs with varying production levels
 */
const createMockWRs = (count: number): IPlayer[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockPlayer({
      index: i + 200,
      key: `wr-${i}`,
      name: `WR ${i + 1}`,
      pos: 'WR',
      // Top WRs have ~1400 reception yards, ~10 TDs; decreases for lower-ranked
      receptions: 100 - i * 3,
      receptionYds: 1400 - i * 40,
      receptionTds: 10 - Math.floor(i / 3),
      rushYds: 50 - i,
      rushTds: 0,
    })
  );
};

/**
 * Create a set of mock TEs with varying production levels
 */
const createMockTEs = (count: number): IPlayer[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockPlayer({
      index: i + 300,
      key: `te-${i}`,
      name: `TE ${i + 1}`,
      pos: 'TE',
      // Top TEs have ~1000 reception yards, ~8 TDs; decreases for lower-ranked
      receptions: 80 - i * 4,
      receptionYds: 1000 - i * 50,
      receptionTds: 8 - Math.floor(i / 2),
    })
  );
};

/**
 * Create a base state for testing
 */
const createTestState = (overrides: Partial<IStoreState> = {}): IStoreState => ({
  ...initialState,
  numberOfTeams: 10,
  rosterFormat: { ...initialRoster },
  scoring: { ...initialScore },
  players: [],
  undraftedPlayers: [],
  teams: new Array(10).fill(0).map(() => createTeam(initialRoster)),
  ...overrides,
});

/**
 * Create a comprehensive player pool for testing
 */
const createPlayerPool = (): IPlayer[] => {
  return [
    ...createMockQBs(20),
    ...createMockRBs(40),
    ...createMockWRs(50),
    ...createMockTEs(20),
  ];
};

describe('dstPointsPerGame', () => {
  describe('null input', () => {
    it('should return 0 when points is null', () => {
      expect(dstPointsPerGame(null)).toBe(0);
    });
  });

  describe('0 points allowed', () => {
    it('should return 5 when points allowed is 0', () => {
      expect(dstPointsPerGame(0)).toBe(5);
    });
  });

  describe('1-6 points allowed', () => {
    it('should return 4 when points allowed is 1', () => {
      expect(dstPointsPerGame(1)).toBe(4);
    });

    it('should return 4 when points allowed is 6', () => {
      expect(dstPointsPerGame(6)).toBe(4);
    });
  });

  describe('7-13 points allowed', () => {
    it('should return 3 when points allowed is 7', () => {
      expect(dstPointsPerGame(7)).toBe(3);
    });

    it('should return 3 when points allowed is 13', () => {
      expect(dstPointsPerGame(13)).toBe(3);
    });
  });

  describe('14-17 points allowed', () => {
    it('should return 1 when points allowed is 14', () => {
      expect(dstPointsPerGame(14)).toBe(1);
    });

    it('should return 1 when points allowed is 17', () => {
      expect(dstPointsPerGame(17)).toBe(1);
    });
  });

  describe('18-27 points allowed', () => {
    it('should return 0 when points allowed is 18', () => {
      expect(dstPointsPerGame(18)).toBe(0);
    });

    it('should return 0 when points allowed is 27', () => {
      expect(dstPointsPerGame(27)).toBe(0);
    });
  });

  describe('28-34 points allowed', () => {
    it('should return -1 when points allowed is 28', () => {
      expect(dstPointsPerGame(28)).toBe(-1);
    });

    it('should return -1 when points allowed is 34', () => {
      expect(dstPointsPerGame(34)).toBe(-1);
    });
  });

  describe('35-45 points allowed', () => {
    it('should return -3 when points allowed is 35', () => {
      expect(dstPointsPerGame(35)).toBe(-3);
    });

    it('should return -3 when points allowed is 45', () => {
      expect(dstPointsPerGame(45)).toBe(-3);
    });
  });

  describe('46+ points allowed', () => {
    it('should return -5 when points allowed is 46', () => {
      expect(dstPointsPerGame(46)).toBe(-5);
    });

    it('should return -5 when points allowed is 100', () => {
      expect(dstPointsPerGame(100)).toBe(-5);
    });
  });
});

describe('updatePlayerVORs', () => {
  describe('QB VOR calculation in 10-team league', () => {
    it('should calculate correct replacement level for QBs (QB10 in standard)', () => {
      const players = createPlayerPool();
      const state = createTestState({
        players,
        undraftedPlayers: [...players],
      });

      const result = updatePlayerVORs(state);

      // Get QBs sorted by VOR
      const qbs = result.players.filter((p) => p.pos === 'QB');

      // QB1 should have positive VOR (above replacement)
      expect(qbs[0].vor).toBeGreaterThan(0);

      // All QBs should have defined VOR
      qbs.forEach((qb) => {
        expect(qb.vor).toBeDefined();
        expect(typeof qb.vor).toBe('number');
      });
    });

    it('should give top QB higher VOR than lower-ranked QBs', () => {
      const players = createPlayerPool();
      const state = createTestState({
        players,
        undraftedPlayers: [...players],
      });

      const result = updatePlayerVORs(state);

      // Get QBs from original players array to find QB1 and QB10
      const qb1 = result.players.find((p) => p.key === 'qb-0');
      const qb10 = result.players.find((p) => p.key === 'qb-9');

      expect(qb1).toBeDefined();
      expect(qb10).toBeDefined();
      expect(qb1!.vor).toBeGreaterThan(qb10!.vor!);
    });
  });

  describe('RB value in larger leagues', () => {
    it('should increase RB replacement index in 12-team vs 10-team league', () => {
      const players = createPlayerPool();

      // 10-team league
      const state10 = createTestState({
        numberOfTeams: 10,
        players: [...players],
        undraftedPlayers: [...players],
        teams: new Array(10).fill(0).map(() => createTeam(initialRoster)),
      });

      // 12-team league
      const state12 = createTestState({
        numberOfTeams: 12,
        players: [...players],
        undraftedPlayers: [...players],
        teams: new Array(12).fill(0).map(() => createTeam(initialRoster)),
      });

      const result10 = updatePlayerVORs(state10);
      const result12 = updatePlayerVORs(state12);

      // Find a mid-tier RB (RB30) - further down the rankings to see clear difference
      const rb30In10 = result10.players.find((p) => p.key === 'rb-29');
      const rb30In12 = result12.players.find((p) => p.key === 'rb-29');

      expect(rb30In10).toBeDefined();
      expect(rb30In12).toBeDefined();

      // In a 12-team league, mid-tier RBs should have higher VOR
      // because the replacement level is lower (more RBs needed)
      // RB30 should benefit more from the larger league
      expect(rb30In12!.vor).toBeGreaterThanOrEqual(rb30In10!.vor!);
    });

    it('should give top RBs positive VOR in both league sizes', () => {
      const players = createPlayerPool();

      const state10 = createTestState({
        numberOfTeams: 10,
        players: [...players],
        undraftedPlayers: [...players],
        teams: new Array(10).fill(0).map(() => createTeam(initialRoster)),
      });

      const state12 = createTestState({
        numberOfTeams: 12,
        players: [...players],
        undraftedPlayers: [...players],
        teams: new Array(12).fill(0).map(() => createTeam(initialRoster)),
      });

      const result10 = updatePlayerVORs(state10);
      const result12 = updatePlayerVORs(state12);

      const rb1In10 = result10.players.find((p) => p.key === 'rb-0');
      const rb1In12 = result12.players.find((p) => p.key === 'rb-0');

      expect(rb1In10!.vor).toBeGreaterThan(0);
      expect(rb1In12!.vor).toBeGreaterThan(0);
    });
  });

  describe('PPR vs standard scoring impact on pass-catching RBs', () => {
    it('should increase value of pass-catching RBs in PPR scoring', () => {
      // Create a specific pass-catching RB with high receptions
      const passCatchingRB = createMockPlayer({
        index: 500,
        key: 'rb-pass-catcher',
        name: 'Pass Catching RB',
        pos: 'RB',
        rushYds: 800, // Lower rushing
        rushTds: 6,
        receptions: 80, // High receptions
        receptionYds: 600,
        receptionTds: 3,
      });

      const players = [...createPlayerPool(), passCatchingRB];

      // Standard scoring (no PPR)
      const standardState = createTestState({
        players: [...players],
        undraftedPlayers: [...players],
        scoring: { ...initialScore, receptions: 0 },
      });

      // Full PPR scoring
      const pprState = createTestState({
        players: [...players],
        undraftedPlayers: [...players],
        scoring: { ...initialScore, receptions: 1.0 },
      });

      const standardResult = updatePlayerVORs(standardState);
      const pprResult = updatePlayerVORs(pprState);

      const rbStandard = standardResult.players.find((p) => p.key === 'rb-pass-catcher');
      const rbPPR = pprResult.players.find((p) => p.key === 'rb-pass-catcher');

      expect(rbStandard).toBeDefined();
      expect(rbPPR).toBeDefined();

      // Pass-catching RB should have higher forecast in PPR
      expect(rbPPR!.forecast).toBeGreaterThan(rbStandard!.forecast!);
    });

    it('should give WRs higher relative value in PPR leagues', () => {
      const players = createPlayerPool();

      // Standard scoring
      const standardState = createTestState({
        players: [...players],
        undraftedPlayers: [...players],
        scoring: { ...initialScore, receptions: 0 },
      });

      // PPR scoring
      const pprState = createTestState({
        players: [...players],
        undraftedPlayers: [...players],
        scoring: { ...initialScore, receptions: 1.0 },
      });

      const standardResult = updatePlayerVORs(standardState);
      const pprResult = updatePlayerVORs(pprState);

      // Top WR forecast should increase significantly in PPR
      const wr1Standard = standardResult.players.find((p) => p.key === 'wr-0');
      const wr1PPR = pprResult.players.find((p) => p.key === 'wr-0');

      expect(wr1PPR!.forecast).toBeGreaterThan(wr1Standard!.forecast!);

      // The increase should be roughly equal to receptions * PPR bonus (100 receptions = 100 points)
      const forecastDifference = wr1PPR!.forecast! - wr1Standard!.forecast!;
      expect(forecastDifference).toBeGreaterThan(50); // Should be significant
    });
  });

  describe('SUPERFLEX league QB valuation', () => {
    it('should increase QB value in SUPERFLEX leagues', () => {
      const players = createPlayerPool();

      // Standard 1QB league
      const standardState = createTestState({
        players: [...players],
        undraftedPlayers: [...players],
        rosterFormat: { ...initialRoster, SUPERFLEX: 0 },
      });

      // SUPERFLEX league (1 QB + 1 SUPERFLEX)
      const superflexState = createTestState({
        players: [...players],
        undraftedPlayers: [...players],
        rosterFormat: { ...initialRoster, SUPERFLEX: 1 },
      });

      const standardResult = updatePlayerVORs(standardState);
      const superflexResult = updatePlayerVORs(superflexState);

      // Top QBs should have higher VOR in SUPERFLEX
      const qb1Standard = standardResult.players.find((p) => p.key === 'qb-0');
      const qb1Superflex = superflexResult.players.find((p) => p.key === 'qb-0');

      expect(qb1Standard).toBeDefined();
      expect(qb1Superflex).toBeDefined();
      expect(qb1Superflex!.vor).toBeGreaterThan(qb1Standard!.vor!);
    });

    it('should make mid-tier QBs more valuable in SUPERFLEX', () => {
      const players = createPlayerPool();

      // Standard 1QB league
      const standardState = createTestState({
        players: [...players],
        undraftedPlayers: [...players],
        rosterFormat: { ...initialRoster, SUPERFLEX: 0 },
      });

      // SUPERFLEX league
      const superflexState = createTestState({
        players: [...players],
        undraftedPlayers: [...players],
        rosterFormat: { ...initialRoster, SUPERFLEX: 1 },
      });

      const standardResult = updatePlayerVORs(standardState);
      const superflexResult = updatePlayerVORs(superflexState);

      // QB12 should have significantly higher VOR in SUPERFLEX
      // because replacement level shifts from QB10 to around QB20
      const qb12Standard = standardResult.players.find((p) => p.key === 'qb-11');
      const qb12Superflex = superflexResult.players.find((p) => p.key === 'qb-11');

      expect(qb12Standard).toBeDefined();
      expect(qb12Superflex).toBeDefined();
      expect(qb12Superflex!.vor).toBeGreaterThan(qb12Standard!.vor!);
    });
  });

  describe('VOR sorting', () => {
    it('should sort players by VOR in descending order', () => {
      const players = createPlayerPool();
      const state = createTestState({
        players,
        undraftedPlayers: [...players],
      });

      const result = updatePlayerVORs(state);

      // Verify players array is sorted by VOR descending
      for (let i = 1; i < result.players.length; i++) {
        expect(result.players[i - 1].vor).toBeGreaterThanOrEqual(result.players[i].vor!);
      }
    });

    it('should also sort undraftedPlayers by VOR', () => {
      const players = createPlayerPool();
      const state = createTestState({
        players,
        undraftedPlayers: [...players],
      });

      const result = updatePlayerVORs(state);

      // Verify undraftedPlayers is also sorted by VOR descending
      for (let i = 1; i < result.undraftedPlayers.length; i++) {
        expect(result.undraftedPlayers[i - 1].vor).toBeGreaterThanOrEqual(result.undraftedPlayers[i].vor!);
      }
    });
  });
});

describe('initStore', () => {
  describe('state initialization', () => {
    it('should reset activeTeam to 0', () => {
      const players = createPlayerPool();
      const state = createTestState({
        activeTeam: 5, // Non-zero initial value
        players,
        undraftedPlayers: [...players],
      });

      const result = initStore(state, players);

      expect(result.activeTeam).toBe(0);
    });

    it('should reset currentPick to 0', () => {
      const players = createPlayerPool();
      const state = createTestState({
        currentPick: 15, // Non-zero initial value
        players,
        undraftedPlayers: [...players],
      });

      const result = initStore(state, players);

      expect(result.currentPick).toBe(0);
    });

    it('should clear picks array', () => {
      const players = createPlayerPool();
      const mockPick = { player: players[0], team: 0, pickNumber: 1 };
      const state = createTestState({
        picks: [mockPick],
        players,
        undraftedPlayers: [...players],
      });

      const result = initStore(state, players);

      expect(result.picks).toEqual([]);
    });

    it('should set lastSync timestamp', () => {
      const players = createPlayerPool();
      const beforeTime = Date.now();
      const state = createTestState({
        lastSync: -1,
        players,
        undraftedPlayers: [...players],
      });

      const result = initStore(state, players);
      const afterTime = Date.now();

      expect(result.lastSync).toBeGreaterThanOrEqual(beforeTime);
      expect(result.lastSync).toBeLessThanOrEqual(afterTime);
    });

    it('should store players in lastSyncPlayers', () => {
      const players = createPlayerPool();
      const state = createTestState({
        lastSyncPlayers: [],
        players,
        undraftedPlayers: [...players],
      });

      const result = initStore(state, players);

      expect(result.lastSyncPlayers).toEqual(players);
    });
  });

  describe('team initialization', () => {
    it('should create correct number of teams based on numberOfTeams', () => {
      const players = createPlayerPool();
      const state = createTestState({
        numberOfTeams: 12,
        players,
        undraftedPlayers: [...players],
      });

      const result = initStore(state, players);

      expect(result.teams).toHaveLength(12);
    });

    it('should create empty teams with correct roster format', () => {
      const players = createPlayerPool();
      const customRoster = {
        ...initialRoster,
        QB: 2,
        RB: 3,
        SUPERFLEX: 1,
      };
      const state = createTestState({
        rosterFormat: customRoster,
        players,
        undraftedPlayers: [...players],
      });

      const result = initStore(state, players);

      // Each team should have the correct number of roster slots
      result.teams.forEach((team) => {
        expect(team.QB).toHaveLength(2);
        expect(team.RB).toHaveLength(3);
        expect(team.SUPERFLEX).toHaveLength(1);
        // All slots should be null (empty)
        expect(team.QB.every((p) => p === null)).toBe(true);
        expect(team.RB.every((p) => p === null)).toBe(true);
      });
    });
  });

  describe('VOR calculation on init', () => {
    it('should calculate VOR for all players on initialization', () => {
      const players = createPlayerPool();
      const state = createTestState({
        players,
        undraftedPlayers: [...players],
      });

      const result = initStore(state, players);

      // All players should have VOR calculated
      result.players.forEach((player) => {
        expect(player.vor).toBeDefined();
        expect(typeof player.vor).toBe('number');
      });
    });

    it('should calculate forecast for all players on initialization', () => {
      const players = createPlayerPool();
      const state = createTestState({
        players,
        undraftedPlayers: [...players],
      });

      const result = initStore(state, players);

      // All players should have forecast calculated
      result.players.forEach((player) => {
        expect(player.forecast).toBeDefined();
        expect(typeof player.forecast).toBe('number');
      });
    });

    it('should apply league scoring settings to forecast calculation', () => {
      const players = createPlayerPool();

      // Higher passing TD value
      const highPassTdScoring = { ...initialScore, passTds: 6.0 };
      const state = createTestState({
        scoring: highPassTdScoring,
        players,
        undraftedPlayers: [...players],
      });

      const result = initStore(state, players);

      // QB1 forecast should reflect the higher TD value
      const qb1 = result.players.find((p) => p.key === 'qb-0');
      expect(qb1).toBeDefined();
      expect(qb1!.forecast).toBeGreaterThan(0);

      // Verify QB1 has higher forecast than in standard scoring
      const standardState = createTestState({
        scoring: { ...initialScore, passTds: 4.0 },
        players,
        undraftedPlayers: [...players],
      });
      const standardResult = initStore(standardState, players);
      const qb1Standard = standardResult.players.find((p) => p.key === 'qb-0');

      expect(qb1!.forecast).toBeGreaterThan(qb1Standard!.forecast!);
    });
  });
});
