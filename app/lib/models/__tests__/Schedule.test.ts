import {
  MatchupRating,
  IDefenseRankings,
  IWeeklyMatchup,
  IPlayerSchedule,
  IWeekWeights,
  IScheduleSettings,
  DEFAULT_SCHEDULE_SETTINGS,
  isValidSchedule,
} from '../Schedule';

describe('Schedule Model Interfaces', () => {
  describe('MatchupRating', () => {
    it('should accept valid matchup rating values (1-5)', () => {
      const ratings: MatchupRating[] = [1, 2, 3, 4, 5];
      expect(ratings).toHaveLength(5);
      expect(ratings).toContain(1);
      expect(ratings).toContain(2);
      expect(ratings).toContain(3);
      expect(ratings).toContain(4);
      expect(ratings).toContain(5);
    });

    it('should represent 1 as tough and 5 as easy', () => {
      const toughMatchup: MatchupRating = 1;
      const easyMatchup: MatchupRating = 5;
      expect(toughMatchup).toBe(1);
      expect(easyMatchup).toBe(5);
    });
  });

  describe('IDefenseRankings', () => {
    it('should have all required properties', () => {
      const defenseRankings: IDefenseRankings = {
        team: 'KC',
        overall: 5,
        passDefense: 8,
        rushDefense: 3,
        passRush: 12,
        secondary: 6,
      };

      expect(defenseRankings.team).toBe('KC');
      expect(defenseRankings.overall).toBe(5);
      expect(defenseRankings.passDefense).toBe(8);
      expect(defenseRankings.rushDefense).toBe(3);
      expect(defenseRankings.passRush).toBe(12);
      expect(defenseRankings.secondary).toBe(6);
    });

    it('should accept rankings from 1-32 range', () => {
      const topDefense: IDefenseRankings = {
        team: 'SF',
        overall: 1,
        passDefense: 1,
        rushDefense: 1,
        passRush: 1,
        secondary: 1,
      };

      const worstDefense: IDefenseRankings = {
        team: 'DEN',
        overall: 32,
        passDefense: 32,
        rushDefense: 32,
        passRush: 32,
        secondary: 32,
      };

      expect(topDefense.overall).toBe(1);
      expect(worstDefense.overall).toBe(32);
    });
  });

  describe('IWeeklyMatchup', () => {
    it('should have all required properties for a regular matchup', () => {
      const matchup: IWeeklyMatchup = {
        week: 5,
        opponent: 'NE',
        isHome: true,
        rating: 4,
        isBye: false,
      };

      expect(matchup.week).toBe(5);
      expect(matchup.opponent).toBe('NE');
      expect(matchup.isHome).toBe(true);
      expect(matchup.rating).toBe(4);
      expect(matchup.isBye).toBe(false);
    });

    it('should support bye week with rating 0', () => {
      const byeWeek: IWeeklyMatchup = {
        week: 7,
        opponent: 'BYE',
        isHome: false,
        rating: 0,
        isBye: true,
      };

      expect(byeWeek.isBye).toBe(true);
      expect(byeWeek.rating).toBe(0);
      expect(byeWeek.opponent).toBe('BYE');
    });

    it('should accept ratings from 1-5 for regular matchups', () => {
      const toughMatchup: IWeeklyMatchup = {
        week: 1,
        opponent: 'SF',
        isHome: false,
        rating: 1,
        isBye: false,
      };

      const easyMatchup: IWeeklyMatchup = {
        week: 2,
        opponent: 'CAR',
        isHome: true,
        rating: 5,
        isBye: false,
      };

      expect(toughMatchup.rating).toBe(1);
      expect(easyMatchup.rating).toBe(5);
    });
  });

  describe('IPlayerSchedule', () => {
    it('should have all required properties', () => {
      const schedule: IPlayerSchedule = {
        teamSchedule: [
          { week: 1, opponent: 'NE', isHome: true, rating: 3, isBye: false },
          { week: 2, opponent: 'BYE', isHome: false, rating: 0, isBye: true },
        ],
        byeWeek: 2,
        sosOverall: 0.55,
        sosPlayoffs: 0.72,
        scheduleScore: 8.5,
      };

      expect(schedule.teamSchedule).toHaveLength(2);
      expect(schedule.byeWeek).toBe(2);
      expect(schedule.sosOverall).toBe(0.55);
      expect(schedule.sosPlayoffs).toBe(0.72);
      expect(schedule.scheduleScore).toBe(8.5);
    });

    it('should represent SOS values in 0-1 range', () => {
      const schedule: IPlayerSchedule = {
        teamSchedule: [],
        byeWeek: 10,
        sosOverall: 0,
        sosPlayoffs: 1,
        scheduleScore: 0,
      };

      expect(schedule.sosOverall).toBeGreaterThanOrEqual(0);
      expect(schedule.sosOverall).toBeLessThanOrEqual(1);
      expect(schedule.sosPlayoffs).toBeGreaterThanOrEqual(0);
      expect(schedule.sosPlayoffs).toBeLessThanOrEqual(1);
    });

    it('should represent scheduleScore in -15 to +15 range', () => {
      const bestSchedule: IPlayerSchedule = {
        teamSchedule: [],
        byeWeek: 6,
        sosOverall: 0.8,
        sosPlayoffs: 0.9,
        scheduleScore: 15,
      };

      const worstSchedule: IPlayerSchedule = {
        teamSchedule: [],
        byeWeek: 14,
        sosOverall: 0.2,
        sosPlayoffs: 0.1,
        scheduleScore: -15,
      };

      expect(bestSchedule.scheduleScore).toBe(15);
      expect(worstSchedule.scheduleScore).toBe(-15);
    });
  });

  describe('IWeekWeights', () => {
    it('should have early, regular, and playoff weights', () => {
      const weights: IWeekWeights = {
        early: 0.8,
        regular: 1.0,
        playoff: 1.5,
      };

      expect(weights.early).toBe(0.8);
      expect(weights.regular).toBe(1.0);
      expect(weights.playoff).toBe(1.5);
    });
  });

  describe('IScheduleSettings', () => {
    it('should have all required properties', () => {
      const settings: IScheduleSettings = {
        weekWeights: { early: 0.8, regular: 1.0, playoff: 1.5 },
        playoffWeeks: [14, 15, 16, 17],
        earlyWeeks: [1, 2, 3, 4],
        maxScheduleBonus: 15,
        maxSchedulePenalty: -15,
        byeWeekPenalties: { 14: -10, 13: -5, 5: 2, 6: 2, 7: 1 },
      };

      expect(settings.weekWeights).toBeDefined();
      expect(settings.playoffWeeks).toHaveLength(4);
      expect(settings.earlyWeeks).toHaveLength(4);
      expect(settings.maxScheduleBonus).toBe(15);
      expect(settings.maxSchedulePenalty).toBe(-15);
      expect(settings.byeWeekPenalties).toBeDefined();
    });
  });

  describe('DEFAULT_SCHEDULE_SETTINGS', () => {
    it('should have correct weekWeights', () => {
      expect(DEFAULT_SCHEDULE_SETTINGS.weekWeights.early).toBe(0.8);
      expect(DEFAULT_SCHEDULE_SETTINGS.weekWeights.regular).toBe(1.0);
      expect(DEFAULT_SCHEDULE_SETTINGS.weekWeights.playoff).toBe(1.5);
    });

    it('should have correct playoffWeeks', () => {
      expect(DEFAULT_SCHEDULE_SETTINGS.playoffWeeks).toEqual([14, 15, 16, 17]);
    });

    it('should have correct earlyWeeks', () => {
      expect(DEFAULT_SCHEDULE_SETTINGS.earlyWeeks).toEqual([1, 2, 3, 4]);
    });

    it('should have correct maxScheduleBonus and maxSchedulePenalty', () => {
      expect(DEFAULT_SCHEDULE_SETTINGS.maxScheduleBonus).toBe(15);
      expect(DEFAULT_SCHEDULE_SETTINGS.maxSchedulePenalty).toBe(-15);
    });

    it('should have correct byeWeekPenalties', () => {
      expect(DEFAULT_SCHEDULE_SETTINGS.byeWeekPenalties[14]).toBe(-10);
      expect(DEFAULT_SCHEDULE_SETTINGS.byeWeekPenalties[13]).toBe(-5);
      expect(DEFAULT_SCHEDULE_SETTINGS.byeWeekPenalties[5]).toBe(2);
      expect(DEFAULT_SCHEDULE_SETTINGS.byeWeekPenalties[6]).toBe(2);
      expect(DEFAULT_SCHEDULE_SETTINGS.byeWeekPenalties[7]).toBe(1);
    });
  });

  describe('isValidSchedule', () => {
    it('should return true for valid player schedules', () => {
      const validSchedule: IPlayerSchedule = {
        teamSchedule: [
          { week: 1, opponent: 'NE', isHome: true, rating: 3, isBye: false },
        ],
        byeWeek: 10,
        sosOverall: 0.5,
        sosPlayoffs: 0.6,
        scheduleScore: 5,
      };
      expect(isValidSchedule(validSchedule)).toBe(true);
    });

    it('should return true for edge case values (min bounds)', () => {
      const minSchedule: IPlayerSchedule = {
        teamSchedule: [],
        byeWeek: 1,
        sosOverall: 0,
        sosPlayoffs: 0,
        scheduleScore: -15,
      };
      expect(isValidSchedule(minSchedule)).toBe(true);
    });

    it('should return true for edge case values (max bounds)', () => {
      const maxSchedule: IPlayerSchedule = {
        teamSchedule: [],
        byeWeek: 18,
        sosOverall: 1,
        sosPlayoffs: 1,
        scheduleScore: 15,
      };
      expect(isValidSchedule(maxSchedule)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isValidSchedule(null)).toBe(false);
      expect(isValidSchedule(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isValidSchedule('string')).toBe(false);
      expect(isValidSchedule(123)).toBe(false);
      expect(isValidSchedule([])).toBe(false);
    });

    it('should return false for missing properties', () => {
      const missingByeWeek = {
        teamSchedule: [],
        sosOverall: 0.5,
        sosPlayoffs: 0.6,
        scheduleScore: 5,
      };
      expect(isValidSchedule(missingByeWeek)).toBe(false);

      const missingSosOverall = {
        teamSchedule: [],
        byeWeek: 10,
        sosPlayoffs: 0.6,
        scheduleScore: 5,
      };
      expect(isValidSchedule(missingSosOverall)).toBe(false);
    });

    it('should return false for out-of-range byeWeek (below 1)', () => {
      const invalidByeWeek = {
        teamSchedule: [],
        byeWeek: 0,
        sosOverall: 0.5,
        sosPlayoffs: 0.6,
        scheduleScore: 5,
      };
      expect(isValidSchedule(invalidByeWeek)).toBe(false);
    });

    it('should return false for out-of-range byeWeek (above 18)', () => {
      const invalidByeWeek = {
        teamSchedule: [],
        byeWeek: 19,
        sosOverall: 0.5,
        sosPlayoffs: 0.6,
        scheduleScore: 5,
      };
      expect(isValidSchedule(invalidByeWeek)).toBe(false);
    });

    it('should return false for out-of-range sosOverall (below 0)', () => {
      const invalidSos = {
        teamSchedule: [],
        byeWeek: 10,
        sosOverall: -0.1,
        sosPlayoffs: 0.6,
        scheduleScore: 5,
      };
      expect(isValidSchedule(invalidSos)).toBe(false);
    });

    it('should return false for out-of-range sosOverall (above 1)', () => {
      const invalidSos = {
        teamSchedule: [],
        byeWeek: 10,
        sosOverall: 1.1,
        sosPlayoffs: 0.6,
        scheduleScore: 5,
      };
      expect(isValidSchedule(invalidSos)).toBe(false);
    });

    it('should return false for out-of-range sosPlayoffs (below 0)', () => {
      const invalidSos = {
        teamSchedule: [],
        byeWeek: 10,
        sosOverall: 0.5,
        sosPlayoffs: -0.1,
        scheduleScore: 5,
      };
      expect(isValidSchedule(invalidSos)).toBe(false);
    });

    it('should return false for out-of-range sosPlayoffs (above 1)', () => {
      const invalidSos = {
        teamSchedule: [],
        byeWeek: 10,
        sosOverall: 0.5,
        sosPlayoffs: 1.1,
        scheduleScore: 5,
      };
      expect(isValidSchedule(invalidSos)).toBe(false);
    });

    it('should return false for out-of-range scheduleScore (below -15)', () => {
      const invalidScore = {
        teamSchedule: [],
        byeWeek: 10,
        sosOverall: 0.5,
        sosPlayoffs: 0.6,
        scheduleScore: -16,
      };
      expect(isValidSchedule(invalidScore)).toBe(false);
    });

    it('should return false for out-of-range scheduleScore (above 15)', () => {
      const invalidScore = {
        teamSchedule: [],
        byeWeek: 10,
        sosOverall: 0.5,
        sosPlayoffs: 0.6,
        scheduleScore: 16,
      };
      expect(isValidSchedule(invalidScore)).toBe(false);
    });

    it('should return false for non-array teamSchedule', () => {
      const invalidTeamSchedule = {
        teamSchedule: 'not an array',
        byeWeek: 10,
        sosOverall: 0.5,
        sosPlayoffs: 0.6,
        scheduleScore: 5,
      };
      expect(isValidSchedule(invalidTeamSchedule)).toBe(false);
    });
  });
});
