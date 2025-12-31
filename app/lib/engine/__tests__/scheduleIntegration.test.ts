/**
 * Schedule Integration Tests
 *
 * Integration tests that verify the schedule strength calculations
 * work correctly end-to-end, including:
 * - Easy vs hard schedule scoring
 * - Bye week penalties
 * - Playoff SOS calculations
 * - All exports are available from index
 */

import {
  calculateScheduleScore,
  calculateSOS,
  calculateMatchupRating,
  calculateWeekWeight,
  DEFAULT_SCHEDULE_SETTINGS,
  isValidSchedule,
} from '../index';
import { IWeeklyMatchup, MatchupRating } from '../../models/Schedule';

describe('Schedule Integration', () => {
  it('should show easy schedule improves effective value', () => {
    const easySchedule: IWeeklyMatchup[] = Array(17)
      .fill(null)
      .map((_, i) => ({
        week: i + 1,
        opponent: 'EASY',
        isHome: true,
        rating: 5 as MatchupRating,
        isBye: i === 6,
      }));

    const hardSchedule: IWeeklyMatchup[] = Array(17)
      .fill(null)
      .map((_, i) => ({
        week: i + 1,
        opponent: 'HARD',
        isHome: false,
        rating: 1 as MatchupRating,
        isBye: i === 6,
      }));

    const easyScore = calculateScheduleScore(
      easySchedule,
      7,
      DEFAULT_SCHEDULE_SETTINGS
    );
    const hardScore = calculateScheduleScore(
      hardSchedule,
      7,
      DEFAULT_SCHEDULE_SETTINGS
    );

    expect(easyScore).toBeGreaterThan(0);
    expect(hardScore).toBeLessThan(0);
    expect(easyScore - hardScore).toBeGreaterThan(20);
  });

  it('should penalize week 14 bye vs early bye', () => {
    const neutralSchedule: IWeeklyMatchup[] = Array(17)
      .fill(null)
      .map((_, i) => ({
        week: i + 1,
        opponent: 'MID',
        isHome: true,
        rating: 3 as MatchupRating,
        isBye: false,
      }));

    const earlyByeScore = calculateScheduleScore(
      neutralSchedule,
      6,
      DEFAULT_SCHEDULE_SETTINGS
    );
    const playoffByeScore = calculateScheduleScore(
      neutralSchedule,
      14,
      DEFAULT_SCHEDULE_SETTINGS
    );

    expect(earlyByeScore).toBeGreaterThan(playoffByeScore);
  });

  it('should calculate playoff SOS correctly', () => {
    const playoffMatchups: IWeeklyMatchup[] = [
      { week: 14, opponent: 'A', isHome: true, rating: 5, isBye: false },
      { week: 15, opponent: 'B', isHome: true, rating: 4, isBye: false },
      { week: 16, opponent: 'C', isHome: false, rating: 2, isBye: false },
      { week: 17, opponent: 'D', isHome: true, rating: 3, isBye: false },
    ];

    const sos = calculateSOS(playoffMatchups);
    expect(sos).toBeGreaterThan(0);
    expect(sos).toBeLessThan(1);
  });

  it('should export all schedule functions from index', () => {
    expect(calculateScheduleScore).toBeDefined();
    expect(calculateSOS).toBeDefined();
    expect(calculateMatchupRating).toBeDefined();
    expect(calculateWeekWeight).toBeDefined();
    expect(DEFAULT_SCHEDULE_SETTINGS).toBeDefined();
    expect(isValidSchedule).toBeDefined();
  });
});
