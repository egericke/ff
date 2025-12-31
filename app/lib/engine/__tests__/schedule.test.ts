/**
 * Tests for schedule strength calculator engine functions.
 * These tests verify the schedule-based scoring calculations for fantasy football players.
 */

import {
  calculateMatchupRating,
  calculateWeekWeight,
  calculateScheduleScore,
  calculateSOS,
} from '../schedule';
import {
  IDefenseRankings,
  IWeeklyMatchup,
  IScheduleSettings,
  DEFAULT_SCHEDULE_SETTINGS,
  MatchupRating,
} from '../../models/Schedule';
import { Position } from '../../models/Player';

describe('Schedule Calculator Engine', () => {
  describe('calculateMatchupRating', () => {
    describe('rank to rating conversion', () => {
      it('should return 1 (tough) for ranks 1-6', () => {
        const defense: IDefenseRankings = {
          team: 'SF',
          overall: 1,
          passDefense: 1,
          rushDefense: 1,
          passRush: 1,
          secondary: 1,
        };
        expect(calculateMatchupRating('RB', defense)).toBe(1);

        const midLowDefense: IDefenseRankings = {
          team: 'CHI',
          overall: 6,
          passDefense: 6,
          rushDefense: 6,
          passRush: 6,
          secondary: 6,
        };
        expect(calculateMatchupRating('RB', midLowDefense)).toBe(1);
      });

      it('should return 2 for ranks 7-12', () => {
        const defense: IDefenseRankings = {
          team: 'BUF',
          overall: 7,
          passDefense: 7,
          rushDefense: 7,
          passRush: 7,
          secondary: 7,
        };
        expect(calculateMatchupRating('RB', defense)).toBe(2);

        const defense2: IDefenseRankings = {
          team: 'MIA',
          overall: 12,
          passDefense: 12,
          rushDefense: 12,
          passRush: 12,
          secondary: 12,
        };
        expect(calculateMatchupRating('RB', defense2)).toBe(2);
      });

      it('should return 3 for ranks 13-19', () => {
        const defense: IDefenseRankings = {
          team: 'NYG',
          overall: 13,
          passDefense: 13,
          rushDefense: 13,
          passRush: 13,
          secondary: 13,
        };
        expect(calculateMatchupRating('RB', defense)).toBe(3);

        const defense2: IDefenseRankings = {
          team: 'LAR',
          overall: 19,
          passDefense: 19,
          rushDefense: 19,
          passRush: 19,
          secondary: 19,
        };
        expect(calculateMatchupRating('RB', defense2)).toBe(3);
      });

      it('should return 4 for ranks 20-26', () => {
        const defense: IDefenseRankings = {
          team: 'HOU',
          overall: 20,
          passDefense: 20,
          rushDefense: 20,
          passRush: 20,
          secondary: 20,
        };
        expect(calculateMatchupRating('RB', defense)).toBe(4);

        const defense2: IDefenseRankings = {
          team: 'JAX',
          overall: 26,
          passDefense: 26,
          rushDefense: 26,
          passRush: 26,
          secondary: 26,
        };
        expect(calculateMatchupRating('RB', defense2)).toBe(4);
      });

      it('should return 5 (easy) for ranks 27-32', () => {
        const defense: IDefenseRankings = {
          team: 'CAR',
          overall: 27,
          passDefense: 27,
          rushDefense: 27,
          passRush: 27,
          secondary: 27,
        };
        expect(calculateMatchupRating('RB', defense)).toBe(5);

        const defense2: IDefenseRankings = {
          team: 'DEN',
          overall: 32,
          passDefense: 32,
          rushDefense: 32,
          passRush: 32,
          secondary: 32,
        };
        expect(calculateMatchupRating('RB', defense2)).toBe(5);
      });
    });

    describe('position-specific defense logic', () => {
      it('should use rushDefense for RB', () => {
        const defense: IDefenseRankings = {
          team: 'KC',
          overall: 16,
          passDefense: 20,
          rushDefense: 5, // Top rush defense
          passRush: 25,
          secondary: 28,
        };
        // rushDefense 5 should give rating 1
        expect(calculateMatchupRating('RB', defense)).toBe(1);
      });

      it('should use secondary for WR', () => {
        const defense: IDefenseRankings = {
          team: 'KC',
          overall: 16,
          passDefense: 20,
          rushDefense: 5,
          passRush: 25,
          secondary: 28, // Weak secondary
        };
        // secondary 28 should give rating 5
        expect(calculateMatchupRating('WR', defense)).toBe(5);
      });

      it('should use secondary for TE', () => {
        const defense: IDefenseRankings = {
          team: 'KC',
          overall: 16,
          passDefense: 20,
          rushDefense: 5,
          passRush: 25,
          secondary: 10, // Average secondary
        };
        // secondary 10 should give rating 2
        expect(calculateMatchupRating('TE', defense)).toBe(2);
      });

      it('should use average of passRush and secondary for QB', () => {
        const defense: IDefenseRankings = {
          team: 'KC',
          overall: 16,
          passDefense: 20,
          rushDefense: 5,
          passRush: 4, // Strong pass rush
          secondary: 30, // Weak secondary
        };
        // Average: (4 + 30) / 2 = 17, which should give rating 3
        expect(calculateMatchupRating('QB', defense)).toBe(3);
      });

      it('should use overall for K', () => {
        const defense: IDefenseRankings = {
          team: 'KC',
          overall: 25, // Weak overall defense
          passDefense: 5,
          rushDefense: 5,
          passRush: 5,
          secondary: 5,
        };
        // overall 25 should give rating 4
        expect(calculateMatchupRating('K', defense)).toBe(4);
      });

      it('should invert overall for DST (33 - overall)', () => {
        // Best defense overall (rank 1) = hardest matchup for opposing DST
        const topDefense: IDefenseRankings = {
          team: 'SF',
          overall: 1,
          passDefense: 1,
          rushDefense: 1,
          passRush: 1,
          secondary: 1,
        };
        // 33 - 1 = 32, which should give rating 5
        expect(calculateMatchupRating('DST', topDefense)).toBe(5);

        // Worst defense overall (rank 32) = easiest matchup for opposing DST
        const worstDefense: IDefenseRankings = {
          team: 'CAR',
          overall: 32,
          passDefense: 32,
          rushDefense: 32,
          passRush: 32,
          secondary: 32,
        };
        // 33 - 32 = 1, which should give rating 1
        expect(calculateMatchupRating('DST', worstDefense)).toBe(1);
      });
    });

    describe('good vs bad defense scenarios', () => {
      it('should return low rating for good defense', () => {
        const goodDefense: IDefenseRankings = {
          team: 'SF',
          overall: 2,
          passDefense: 3,
          rushDefense: 1,
          passRush: 2,
          secondary: 4,
        };
        expect(calculateMatchupRating('RB', goodDefense)).toBe(1);
        expect(calculateMatchupRating('WR', goodDefense)).toBe(1);
      });

      it('should return high rating for bad defense', () => {
        const badDefense: IDefenseRankings = {
          team: 'CAR',
          overall: 30,
          passDefense: 29,
          rushDefense: 31,
          passRush: 28,
          secondary: 30,
        };
        expect(calculateMatchupRating('RB', badDefense)).toBe(5);
        expect(calculateMatchupRating('WR', badDefense)).toBe(5);
      });
    });
  });

  describe('calculateWeekWeight', () => {
    const settings = DEFAULT_SCHEDULE_SETTINGS;

    it('should return 0.8 for early weeks (1-4)', () => {
      expect(calculateWeekWeight(1, settings)).toBe(0.8);
      expect(calculateWeekWeight(2, settings)).toBe(0.8);
      expect(calculateWeekWeight(3, settings)).toBe(0.8);
      expect(calculateWeekWeight(4, settings)).toBe(0.8);
    });

    it('should return 1.0 for regular weeks (5-13)', () => {
      expect(calculateWeekWeight(5, settings)).toBe(1.0);
      expect(calculateWeekWeight(9, settings)).toBe(1.0);
      expect(calculateWeekWeight(13, settings)).toBe(1.0);
    });

    it('should return 1.5 for playoff weeks (14-17)', () => {
      expect(calculateWeekWeight(14, settings)).toBe(1.5);
      expect(calculateWeekWeight(15, settings)).toBe(1.5);
      expect(calculateWeekWeight(16, settings)).toBe(1.5);
      expect(calculateWeekWeight(17, settings)).toBe(1.5);
    });

    it('should handle custom settings', () => {
      const customSettings: IScheduleSettings = {
        weekWeights: {
          early: 0.5,
          regular: 1.2,
          playoff: 2.0,
        },
        playoffWeeks: [15, 16, 17],
        earlyWeeks: [1, 2, 3],
        maxScheduleBonus: 15,
        maxSchedulePenalty: -15,
        byeWeekPenalties: {},
      };

      expect(calculateWeekWeight(1, customSettings)).toBe(0.5);
      expect(calculateWeekWeight(4, customSettings)).toBe(1.2); // No longer early
      expect(calculateWeekWeight(14, customSettings)).toBe(1.2); // No longer playoff
      expect(calculateWeekWeight(15, customSettings)).toBe(2.0);
    });

    it('should default to regular weight for weeks not in any category', () => {
      const settings: IScheduleSettings = {
        weekWeights: {
          early: 0.8,
          regular: 1.0,
          playoff: 1.5,
        },
        playoffWeeks: [16, 17],
        earlyWeeks: [1, 2],
        maxScheduleBonus: 15,
        maxSchedulePenalty: -15,
        byeWeekPenalties: {},
      };

      // Week 10 is neither early nor playoff
      expect(calculateWeekWeight(10, settings)).toBe(1.0);
    });
  });

  describe('calculateScheduleScore', () => {
    const settings = DEFAULT_SCHEDULE_SETTINGS;

    describe('easy schedule scenarios', () => {
      it('should return positive score for easy schedule (high ratings)', () => {
        const easyMatchups: IWeeklyMatchup[] = Array.from({ length: 17 }, (_, i) => ({
          week: i + 1,
          opponent: 'CAR',
          isHome: true,
          rating: 5 as MatchupRating,
          isBye: false,
        }));

        const score = calculateScheduleScore(easyMatchups, 10, settings);
        expect(score).toBeGreaterThan(0);
      });

      it('should approach max bonus for consistently easy matchups', () => {
        const easyMatchups: IWeeklyMatchup[] = Array.from({ length: 17 }, (_, i) => ({
          week: i + 1,
          opponent: 'CAR',
          isHome: true,
          rating: 5 as MatchupRating,
          isBye: false,
        }));

        const score = calculateScheduleScore(easyMatchups, 10, settings);
        expect(score).toBeLessThanOrEqual(15);
        expect(score).toBeGreaterThan(10); // Should be high
      });
    });

    describe('hard schedule scenarios', () => {
      it('should return negative score for hard schedule (low ratings)', () => {
        const hardMatchups: IWeeklyMatchup[] = Array.from({ length: 17 }, (_, i) => ({
          week: i + 1,
          opponent: 'SF',
          isHome: false,
          rating: 1 as MatchupRating,
          isBye: false,
        }));

        const score = calculateScheduleScore(hardMatchups, 10, settings);
        expect(score).toBeLessThan(0);
      });

      it('should approach max penalty for consistently hard matchups', () => {
        const hardMatchups: IWeeklyMatchup[] = Array.from({ length: 17 }, (_, i) => ({
          week: i + 1,
          opponent: 'SF',
          isHome: false,
          rating: 1 as MatchupRating,
          isBye: false,
        }));

        const score = calculateScheduleScore(hardMatchups, 10, settings);
        expect(score).toBeGreaterThanOrEqual(-15);
        expect(score).toBeLessThan(-10); // Should be low
      });
    });

    describe('bye week penalties', () => {
      it('should apply negative penalty for week 14 bye', () => {
        const matchups: IWeeklyMatchup[] = Array.from({ length: 17 }, (_, i) => ({
          week: i + 1,
          opponent: i + 1 === 14 ? 'BYE' : 'NYG',
          isHome: true,
          rating: (i + 1 === 14 ? 0 : 3) as MatchupRating | 0,
          isBye: i + 1 === 14,
        }));

        const scoreWithWeek14Bye = calculateScheduleScore(matchups, 14, settings);

        // Change bye to week 6 (positive penalty/bonus)
        const matchupsWeek6Bye: IWeeklyMatchup[] = Array.from({ length: 17 }, (_, i) => ({
          week: i + 1,
          opponent: i + 1 === 6 ? 'BYE' : 'NYG',
          isHome: true,
          rating: (i + 1 === 6 ? 0 : 3) as MatchupRating | 0,
          isBye: i + 1 === 6,
        }));

        const scoreWithWeek6Bye = calculateScheduleScore(matchupsWeek6Bye, 6, settings);

        // Week 14 bye should have worse score than week 6 bye
        expect(scoreWithWeek14Bye).toBeLessThan(scoreWithWeek6Bye);
      });

      it('should apply positive bonus for week 5-6 bye', () => {
        // Week 6 bye has +2 bonus per DEFAULT_SCHEDULE_SETTINGS
        const matchupsWeek6Bye: IWeeklyMatchup[] = Array.from({ length: 17 }, (_, i) => ({
          week: i + 1,
          opponent: i + 1 === 6 ? 'BYE' : 'NYG',
          isHome: true,
          rating: (i + 1 === 6 ? 0 : 3) as MatchupRating | 0,
          isBye: i + 1 === 6,
        }));

        // Week 10 bye has no bonus/penalty
        const matchupsWeek10Bye: IWeeklyMatchup[] = Array.from({ length: 17 }, (_, i) => ({
          week: i + 1,
          opponent: i + 1 === 10 ? 'BYE' : 'NYG',
          isHome: true,
          rating: (i + 1 === 10 ? 0 : 3) as MatchupRating | 0,
          isBye: i + 1 === 10,
        }));

        const scoreWeek6Bye = calculateScheduleScore(matchupsWeek6Bye, 6, settings);
        const scoreWeek10Bye = calculateScheduleScore(matchupsWeek10Bye, 10, settings);

        // Week 6 bye should have better score
        expect(scoreWeek6Bye).toBeGreaterThan(scoreWeek10Bye);
      });
    });

    describe('bounds checking', () => {
      it('should clamp score to -15 to +15 range', () => {
        // Even with extreme matchups, score should be clamped
        const extremeEasy: IWeeklyMatchup[] = Array.from({ length: 17 }, (_, i) => ({
          week: i + 1,
          opponent: 'CAR',
          isHome: true,
          rating: 5 as MatchupRating,
          isBye: false,
        }));

        const extremeHard: IWeeklyMatchup[] = Array.from({ length: 17 }, (_, i) => ({
          week: i + 1,
          opponent: 'SF',
          isHome: false,
          rating: 1 as MatchupRating,
          isBye: false,
        }));

        const easyScore = calculateScheduleScore(extremeEasy, 10, settings);
        const hardScore = calculateScheduleScore(extremeHard, 10, settings);

        expect(easyScore).toBeLessThanOrEqual(15);
        expect(easyScore).toBeGreaterThanOrEqual(-15);
        expect(hardScore).toBeLessThanOrEqual(15);
        expect(hardScore).toBeGreaterThanOrEqual(-15);
      });
    });

    describe('neutral schedule', () => {
      it('should return near 0 for average matchups (rating 3)', () => {
        const neutralMatchups: IWeeklyMatchup[] = Array.from({ length: 17 }, (_, i) => ({
          week: i + 1,
          opponent: 'NYG',
          isHome: true,
          rating: 3 as MatchupRating,
          isBye: false,
        }));

        const score = calculateScheduleScore(neutralMatchups, 10, settings);
        // Should be close to 0 (no bye penalty for week 10)
        expect(Math.abs(score)).toBeLessThan(2);
      });
    });
  });

  describe('calculateSOS', () => {
    describe('easy matchups', () => {
      it('should return high value (close to 1) for easy matchups', () => {
        const easyMatchups: IWeeklyMatchup[] = Array.from({ length: 17 }, (_, i) => ({
          week: i + 1,
          opponent: 'CAR',
          isHome: true,
          rating: 5 as MatchupRating,
          isBye: false,
        }));

        const sos = calculateSOS(easyMatchups);
        expect(sos).toBeGreaterThan(0.8);
        expect(sos).toBeLessThanOrEqual(1);
      });

      it('should return 1 for all rating 5 matchups', () => {
        const perfectEasy: IWeeklyMatchup[] = Array.from({ length: 17 }, (_, i) => ({
          week: i + 1,
          opponent: 'CAR',
          isHome: true,
          rating: 5 as MatchupRating,
          isBye: false,
        }));

        const sos = calculateSOS(perfectEasy);
        expect(sos).toBe(1);
      });
    });

    describe('hard matchups', () => {
      it('should return low value (close to 0) for hard matchups', () => {
        const hardMatchups: IWeeklyMatchup[] = Array.from({ length: 17 }, (_, i) => ({
          week: i + 1,
          opponent: 'SF',
          isHome: false,
          rating: 1 as MatchupRating,
          isBye: false,
        }));

        const sos = calculateSOS(hardMatchups);
        expect(sos).toBeLessThan(0.2);
        expect(sos).toBeGreaterThanOrEqual(0);
      });

      it('should return 0 for all rating 1 matchups', () => {
        const perfectHard: IWeeklyMatchup[] = Array.from({ length: 17 }, (_, i) => ({
          week: i + 1,
          opponent: 'SF',
          isHome: false,
          rating: 1 as MatchupRating,
          isBye: false,
        }));

        const sos = calculateSOS(perfectHard);
        expect(sos).toBe(0);
      });
    });

    describe('bye week handling', () => {
      it('should skip bye weeks when calculating average', () => {
        const matchupsWithBye: IWeeklyMatchup[] = [
          { week: 1, opponent: 'SF', isHome: false, rating: 1, isBye: false },
          { week: 2, opponent: 'BYE', isHome: false, rating: 0, isBye: true },
          { week: 3, opponent: 'CAR', isHome: true, rating: 5, isBye: false },
        ];

        const sos = calculateSOS(matchupsWithBye);
        // Average of ratings 1 and 5 = 3
        // SOS = 1 - (3 - 1) / 4 = 1 - 0.5 = 0.5
        expect(sos).toBe(0.5);
      });

      it('should handle all bye weeks gracefully', () => {
        const allByes: IWeeklyMatchup[] = [
          { week: 1, opponent: 'BYE', isHome: false, rating: 0, isBye: true },
          { week: 2, opponent: 'BYE', isHome: false, rating: 0, isBye: true },
        ];

        const sos = calculateSOS(allByes);
        // Should return 0 or handle gracefully
        expect(sos).toBeGreaterThanOrEqual(0);
        expect(sos).toBeLessThanOrEqual(1);
      });
    });

    describe('average matchups', () => {
      it('should return 0.5 for all rating 3 matchups', () => {
        const averageMatchups: IWeeklyMatchup[] = Array.from({ length: 17 }, (_, i) => ({
          week: i + 1,
          opponent: 'NYG',
          isHome: true,
          rating: 3 as MatchupRating,
          isBye: false,
        }));

        const sos = calculateSOS(averageMatchups);
        expect(sos).toBe(0.5);
      });
    });

    describe('bounds', () => {
      it('should always return value between 0 and 1', () => {
        const mixedMatchups: IWeeklyMatchup[] = [
          { week: 1, opponent: 'SF', isHome: false, rating: 1, isBye: false },
          { week: 2, opponent: 'CHI', isHome: true, rating: 2, isBye: false },
          { week: 3, opponent: 'NYG', isHome: false, rating: 3, isBye: false },
          { week: 4, opponent: 'JAX', isHome: true, rating: 4, isBye: false },
          { week: 5, opponent: 'CAR', isHome: false, rating: 5, isBye: false },
        ];

        const sos = calculateSOS(mixedMatchups);
        expect(sos).toBeGreaterThanOrEqual(0);
        expect(sos).toBeLessThanOrEqual(1);
      });
    });
  });
});
