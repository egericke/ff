# Advanced VOR Modeling - Phase 2: Schedule Strength Engine

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build schedule strength analysis with defense rankings, weekly matchup ratings, playoff weighting, and bye week intelligence to adjust player values based on their upcoming schedule.

**Architecture:** Create schedule-related interfaces and calculation functions in the engine. Schedule scores range from -15 to +15 points adjustment. Playoff weeks (14-17) are weighted 1.5x. Defense rankings drive matchup quality.

**Tech Stack:** TypeScript, Jest, existing engine patterns

---

## Task 1: Create Schedule Model Interfaces

**Files:**
- Create: `app/lib/models/Schedule.ts`
- Test: `app/lib/models/__tests__/Schedule.test.ts`

**Step 1: Create test file**

```typescript
/**
 * Tests for Schedule model interfaces
 */
import {
  IDefenseRankings,
  IWeeklyMatchup,
  IPlayerSchedule,
  IScheduleSettings,
  DEFAULT_SCHEDULE_SETTINGS,
  MatchupRating,
  isValidSchedule,
} from '../Schedule';

describe('Schedule Models', () => {
  describe('MatchupRating', () => {
    it('should range from 1 (tough) to 5 (easy)', () => {
      const ratings: MatchupRating[] = [1, 2, 3, 4, 5];
      expect(ratings).toHaveLength(5);
    });
  });

  describe('IDefenseRankings', () => {
    it('should contain rankings for all defensive categories', () => {
      const def: IDefenseRankings = {
        team: 'DAL',
        overall: 5,
        passDefense: 8,
        rushDefense: 3,
        passRush: 12,
        secondary: 6,
      };
      expect(def.team).toBe('DAL');
      expect(def.overall).toBeLessThanOrEqual(32);
    });
  });

  describe('IWeeklyMatchup', () => {
    it('should contain week, opponent, and rating', () => {
      const matchup: IWeeklyMatchup = {
        week: 14,
        opponent: 'NYG',
        isHome: true,
        rating: 4,
        isBye: false,
      };
      expect(matchup.week).toBe(14);
      expect(matchup.rating).toBeGreaterThanOrEqual(1);
      expect(matchup.rating).toBeLessThanOrEqual(5);
    });

    it('should support bye weeks', () => {
      const bye: IWeeklyMatchup = {
        week: 7,
        opponent: 'BYE',
        isHome: false,
        rating: 0,
        isBye: true,
      };
      expect(bye.isBye).toBe(true);
    });
  });

  describe('IPlayerSchedule', () => {
    it('should contain season and playoff schedule data', () => {
      const schedule: IPlayerSchedule = {
        teamSchedule: [],
        byeWeek: 10,
        sosOverall: 0.52,
        sosPlayoffs: 0.38,
        scheduleScore: 5,
      };
      expect(schedule.byeWeek).toBe(10);
      expect(schedule.sosOverall).toBeGreaterThanOrEqual(0);
      expect(schedule.sosOverall).toBeLessThanOrEqual(1);
    });
  });

  describe('DEFAULT_SCHEDULE_SETTINGS', () => {
    it('should have correct week weights', () => {
      expect(DEFAULT_SCHEDULE_SETTINGS.weekWeights.early).toBe(0.8);
      expect(DEFAULT_SCHEDULE_SETTINGS.weekWeights.regular).toBe(1.0);
      expect(DEFAULT_SCHEDULE_SETTINGS.weekWeights.playoff).toBe(1.5);
    });

    it('should define playoff weeks as 14-17', () => {
      expect(DEFAULT_SCHEDULE_SETTINGS.playoffWeeks).toEqual([14, 15, 16, 17]);
    });

    it('should have schedule score range', () => {
      expect(DEFAULT_SCHEDULE_SETTINGS.maxScheduleBonus).toBe(15);
      expect(DEFAULT_SCHEDULE_SETTINGS.maxSchedulePenalty).toBe(-15);
    });
  });

  describe('isValidSchedule', () => {
    it('should return true for valid schedule', () => {
      const schedule: IPlayerSchedule = {
        teamSchedule: [],
        byeWeek: 7,
        sosOverall: 0.5,
        sosPlayoffs: 0.4,
        scheduleScore: 0,
      };
      expect(isValidSchedule(schedule)).toBe(true);
    });

    it('should return false for invalid bye week', () => {
      const schedule = {
        teamSchedule: [],
        byeWeek: 0,
        sosOverall: 0.5,
        sosPlayoffs: 0.4,
        scheduleScore: 0,
      };
      expect(isValidSchedule(schedule as IPlayerSchedule)).toBe(false);
    });

    it('should return false for out of range SOS', () => {
      const schedule = {
        teamSchedule: [],
        byeWeek: 7,
        sosOverall: 1.5,
        sosPlayoffs: 0.4,
        scheduleScore: 0,
      };
      expect(isValidSchedule(schedule as IPlayerSchedule)).toBe(false);
    });
  });
});
```

**Step 2: Implement Schedule.ts**

```typescript
/**
 * Schedule and matchup models for strength of schedule analysis.
 */

/**
 * Matchup difficulty rating (1 = toughest, 5 = easiest)
 */
export type MatchupRating = 1 | 2 | 3 | 4 | 5;

/**
 * Defense rankings for a team (1 = best, 32 = worst)
 */
export interface IDefenseRankings {
  team: string;
  overall: number;
  passDefense: number;
  rushDefense: number;
  passRush: number;
  secondary: number;
}

/**
 * A single week's matchup for a player
 */
export interface IWeeklyMatchup {
  week: number;
  opponent: string;
  isHome: boolean;
  rating: MatchupRating | 0; // 0 for bye weeks
  isBye: boolean;
}

/**
 * Complete schedule data for a player
 */
export interface IPlayerSchedule {
  teamSchedule: IWeeklyMatchup[];
  byeWeek: number;
  sosOverall: number; // 0-1 scale, lower = easier
  sosPlayoffs: number; // 0-1 scale for weeks 14-17
  scheduleScore: number; // -15 to +15 adjustment
}

/**
 * Week weight configuration
 */
export interface IWeekWeights {
  early: number; // Weeks 1-4
  regular: number; // Weeks 5-13
  playoff: number; // Weeks 14-17
}

/**
 * Schedule calculation settings
 */
export interface IScheduleSettings {
  weekWeights: IWeekWeights;
  playoffWeeks: number[];
  earlyWeeks: number[];
  maxScheduleBonus: number;
  maxSchedulePenalty: number;
  byeWeekPenalties: { [week: number]: number };
}

/**
 * Default schedule settings
 */
export const DEFAULT_SCHEDULE_SETTINGS: IScheduleSettings = {
  weekWeights: {
    early: 0.8,
    regular: 1.0,
    playoff: 1.5,
  },
  playoffWeeks: [14, 15, 16, 17],
  earlyWeeks: [1, 2, 3, 4],
  maxScheduleBonus: 15,
  maxSchedulePenalty: -15,
  byeWeekPenalties: {
    14: -10, // Playoff bye is disaster
    13: -5,  // Late bye hurts
    5: 2,    // Early bye is good
    6: 2,
    7: 1,
  },
};

/**
 * Validate a player schedule object
 */
export const isValidSchedule = (schedule: IPlayerSchedule): boolean => {
  if (!schedule || typeof schedule !== 'object') return false;
  if (schedule.byeWeek < 1 || schedule.byeWeek > 18) return false;
  if (schedule.sosOverall < 0 || schedule.sosOverall > 1) return false;
  if (schedule.sosPlayoffs < 0 || schedule.sosPlayoffs > 1) return false;
  if (schedule.scheduleScore < -15 || schedule.scheduleScore > 15) return false;
  return true;
};
```

**Step 3: Commit**

```bash
git add app/lib/models/Schedule.ts app/lib/models/__tests__/Schedule.test.ts
git commit -m "feat(models): add Schedule interfaces for SOS analysis"
```

---

## Task 2: Create Schedule Calculator

**Files:**
- Create: `app/lib/engine/schedule.ts`
- Test: `app/lib/engine/__tests__/schedule.test.ts`

**Requirements:**

1. **calculateMatchupRating(position, defenseRankings): MatchupRating**
   - QB: uses passRush + secondary
   - RB: uses rushDefense
   - WR/TE: uses secondary
   - Returns 1-5 rating

2. **calculateWeekWeight(week, settings): number**
   - Early weeks (1-4): 0.8
   - Regular (5-13): 1.0
   - Playoff (14-17): 1.5

3. **calculateScheduleScore(schedule, settings): number**
   - Weighted average of matchup ratings
   - Normalize to -15 to +15 scale
   - Apply bye week penalties

4. **calculateSOS(matchups): number**
   - Simple average of ratings, normalized to 0-1

**Step 1: Create test file**

```typescript
import {
  calculateMatchupRating,
  calculateWeekWeight,
  calculateScheduleScore,
  calculateSOS,
} from '../schedule';
import { IDefenseRankings, IWeeklyMatchup, DEFAULT_SCHEDULE_SETTINGS } from '../../models/Schedule';
import { Position } from '../../models/Player';

describe('Schedule Calculator', () => {
  describe('calculateMatchupRating', () => {
    const goodDefense: IDefenseRankings = {
      team: 'SF',
      overall: 3,
      passDefense: 2,
      rushDefense: 4,
      passRush: 1,
      secondary: 5,
    };

    const badDefense: IDefenseRankings = {
      team: 'LV',
      overall: 28,
      passDefense: 30,
      rushDefense: 25,
      passRush: 27,
      secondary: 29,
    };

    it('should return low rating (tough) against good defense', () => {
      const rating = calculateMatchupRating('RB', goodDefense);
      expect(rating).toBeLessThanOrEqual(2);
    });

    it('should return high rating (easy) against bad defense', () => {
      const rating = calculateMatchupRating('RB', badDefense);
      expect(rating).toBeGreaterThanOrEqual(4);
    });

    it('should use rush defense for RB', () => {
      const rating = calculateMatchupRating('RB', goodDefense);
      expect(rating).toBeDefined();
    });

    it('should use secondary for WR', () => {
      const rating = calculateMatchupRating('WR', goodDefense);
      expect(rating).toBeDefined();
    });

    it('should use pass rush + secondary for QB', () => {
      const rating = calculateMatchupRating('QB', goodDefense);
      expect(rating).toBeDefined();
    });
  });

  describe('calculateWeekWeight', () => {
    it('should return 0.8 for early weeks (1-4)', () => {
      expect(calculateWeekWeight(1, DEFAULT_SCHEDULE_SETTINGS)).toBe(0.8);
      expect(calculateWeekWeight(4, DEFAULT_SCHEDULE_SETTINGS)).toBe(0.8);
    });

    it('should return 1.0 for regular weeks (5-13)', () => {
      expect(calculateWeekWeight(5, DEFAULT_SCHEDULE_SETTINGS)).toBe(1.0);
      expect(calculateWeekWeight(13, DEFAULT_SCHEDULE_SETTINGS)).toBe(1.0);
    });

    it('should return 1.5 for playoff weeks (14-17)', () => {
      expect(calculateWeekWeight(14, DEFAULT_SCHEDULE_SETTINGS)).toBe(1.5);
      expect(calculateWeekWeight(17, DEFAULT_SCHEDULE_SETTINGS)).toBe(1.5);
    });
  });

  describe('calculateScheduleScore', () => {
    it('should return positive score for easy schedule', () => {
      const easySchedule: IWeeklyMatchup[] = Array(17).fill(null).map((_, i) => ({
        week: i + 1,
        opponent: 'EASY',
        isHome: true,
        rating: 5 as const,
        isBye: false,
      }));
      const score = calculateScheduleScore(easySchedule, 7, DEFAULT_SCHEDULE_SETTINGS);
      expect(score).toBeGreaterThan(0);
    });

    it('should return negative score for hard schedule', () => {
      const hardSchedule: IWeeklyMatchup[] = Array(17).fill(null).map((_, i) => ({
        week: i + 1,
        opponent: 'HARD',
        isHome: false,
        rating: 1 as const,
        isBye: false,
      }));
      const score = calculateScheduleScore(hardSchedule, 7, DEFAULT_SCHEDULE_SETTINGS);
      expect(score).toBeLessThan(0);
    });

    it('should be bounded -15 to +15', () => {
      const extremeSchedule: IWeeklyMatchup[] = Array(17).fill(null).map((_, i) => ({
        week: i + 1,
        opponent: 'TEST',
        isHome: true,
        rating: 5 as const,
        isBye: false,
      }));
      const score = calculateScheduleScore(extremeSchedule, 7, DEFAULT_SCHEDULE_SETTINGS);
      expect(score).toBeLessThanOrEqual(15);
      expect(score).toBeGreaterThanOrEqual(-15);
    });

    it('should apply bye week penalty for week 14', () => {
      const normalSchedule: IWeeklyMatchup[] = Array(17).fill(null).map((_, i) => ({
        week: i + 1,
        opponent: 'TEST',
        isHome: true,
        rating: 3 as const,
        isBye: i === 13, // Week 14 bye
      }));
      const score = calculateScheduleScore(normalSchedule, 14, DEFAULT_SCHEDULE_SETTINGS);
      expect(score).toBeLessThan(0); // Should be penalized
    });
  });

  describe('calculateSOS', () => {
    it('should return low SOS for easy matchups', () => {
      const easyMatchups: IWeeklyMatchup[] = [
        { week: 1, opponent: 'A', isHome: true, rating: 5, isBye: false },
        { week: 2, opponent: 'B', isHome: true, rating: 5, isBye: false },
        { week: 3, opponent: 'C', isHome: true, rating: 4, isBye: false },
      ];
      const sos = calculateSOS(easyMatchups);
      expect(sos).toBeLessThan(0.4);
    });

    it('should return high SOS for hard matchups', () => {
      const hardMatchups: IWeeklyMatchup[] = [
        { week: 1, opponent: 'A', isHome: false, rating: 1, isBye: false },
        { week: 2, opponent: 'B', isHome: false, rating: 1, isBye: false },
        { week: 3, opponent: 'C', isHome: false, rating: 2, isBye: false },
      ];
      const sos = calculateSOS(hardMatchups);
      expect(sos).toBeGreaterThan(0.6);
    });

    it('should skip bye weeks in calculation', () => {
      const matchupsWithBye: IWeeklyMatchup[] = [
        { week: 1, opponent: 'A', isHome: true, rating: 5, isBye: false },
        { week: 2, opponent: 'BYE', isHome: false, rating: 0, isBye: true },
        { week: 3, opponent: 'C', isHome: true, rating: 5, isBye: false },
      ];
      const sos = calculateSOS(matchupsWithBye);
      expect(sos).toBeLessThan(0.3); // Should only count the two 5-rated games
    });
  });
});
```

**Step 2: Implement schedule.ts**

```typescript
/**
 * Schedule strength calculations for fantasy football.
 */

import { Position } from '../models/Player';
import {
  IDefenseRankings,
  IWeeklyMatchup,
  IScheduleSettings,
  MatchupRating,
  DEFAULT_SCHEDULE_SETTINGS,
} from '../models/Schedule';

/**
 * Calculate matchup rating based on position and defense rankings.
 * Returns 1-5 (1 = toughest, 5 = easiest)
 */
export function calculateMatchupRating(
  position: Position,
  defense: IDefenseRankings
): MatchupRating {
  let relevantRank: number;

  switch (position) {
    case 'QB':
      // QB faces pass rush and secondary
      relevantRank = (defense.passRush + defense.secondary) / 2;
      break;
    case 'RB':
      relevantRank = defense.rushDefense;
      break;
    case 'WR':
    case 'TE':
      relevantRank = defense.secondary;
      break;
    case 'K':
      // Kickers benefit from good offenses against bad defenses
      relevantRank = defense.overall;
      break;
    case 'DST':
      // DST rating is inverse (good DST vs bad offense)
      relevantRank = 33 - defense.overall; // Invert
      break;
    default:
      relevantRank = defense.overall;
  }

  // Convert rank (1-32) to rating (1-5)
  // Rank 1-6 = Rating 1 (tough)
  // Rank 7-12 = Rating 2
  // Rank 13-19 = Rating 3
  // Rank 20-26 = Rating 4
  // Rank 27-32 = Rating 5 (easy)
  if (relevantRank <= 6) return 1;
  if (relevantRank <= 12) return 2;
  if (relevantRank <= 19) return 3;
  if (relevantRank <= 26) return 4;
  return 5;
}

/**
 * Get weight for a specific week.
 */
export function calculateWeekWeight(
  week: number,
  settings: IScheduleSettings = DEFAULT_SCHEDULE_SETTINGS
): number {
  if (settings.playoffWeeks.includes(week)) {
    return settings.weekWeights.playoff;
  }
  if (settings.earlyWeeks.includes(week)) {
    return settings.weekWeights.early;
  }
  return settings.weekWeights.regular;
}

/**
 * Calculate overall schedule score (-15 to +15).
 */
export function calculateScheduleScore(
  matchups: IWeeklyMatchup[],
  byeWeek: number,
  settings: IScheduleSettings = DEFAULT_SCHEDULE_SETTINGS
): number {
  if (matchups.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const matchup of matchups) {
    if (matchup.isBye) continue;

    const weight = calculateWeekWeight(matchup.week, settings);
    // Rating 3 is neutral, so subtract 3 to center around 0
    const adjustedRating = matchup.rating - 3;
    weightedSum += adjustedRating * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;

  // Normalize to approximately -15 to +15 range
  // Max possible: all 5s = +2 average * totalWeight
  // Scale factor to get to 15
  const avgAdjustedRating = weightedSum / totalWeight;
  let score = avgAdjustedRating * 7.5; // Scale ±2 to ±15

  // Apply bye week penalty
  const byePenalty = settings.byeWeekPenalties[byeWeek] || 0;
  score += byePenalty;

  // Clamp to range
  return Math.round(
    Math.max(settings.maxSchedulePenalty, Math.min(settings.maxScheduleBonus, score))
  );
}

/**
 * Calculate Strength of Schedule (0-1, lower = easier).
 */
export function calculateSOS(matchups: IWeeklyMatchup[]): number {
  const nonByeMatchups = matchups.filter((m) => !m.isBye);
  if (nonByeMatchups.length === 0) return 0.5;

  const totalRating = nonByeMatchups.reduce((sum, m) => sum + m.rating, 0);
  const avgRating = totalRating / nonByeMatchups.length;

  // Convert 1-5 rating to 0-1 SOS (invert: 5 = easy = 0.2, 1 = hard = 1.0)
  return 1 - (avgRating - 1) / 4;
}
```

**Step 3: Commit**

```bash
git add app/lib/engine/schedule.ts app/lib/engine/__tests__/schedule.test.ts
git commit -m "feat(engine): add schedule strength calculator"
```

---

## Task 3: Create Schedule Score Integration

**Files:**
- Modify: `app/lib/engine/index.ts` - Add schedule exports
- Create: `app/lib/engine/__tests__/scheduleIntegration.test.ts`

**Requirements:**

1. Export all schedule functions from index.ts
2. Create integration test showing schedule impact on player value

**Step 1: Update index.ts exports**

Add to `app/lib/engine/index.ts`:

```typescript
// Schedule calculation functions
export {
  calculateMatchupRating,
  calculateWeekWeight,
  calculateScheduleScore,
  calculateSOS,
} from './schedule';

// Schedule model exports
export {
  IDefenseRankings,
  IWeeklyMatchup,
  IPlayerSchedule,
  IScheduleSettings,
  DEFAULT_SCHEDULE_SETTINGS,
  MatchupRating,
  isValidSchedule,
} from '../models/Schedule';
```

**Step 2: Create integration test**

```typescript
import {
  calculateScheduleScore,
  calculateSOS,
  buildRiskProfile,
  calculateRiskAdjustedVOR,
  DEFAULT_RISK_SETTINGS,
  DEFAULT_SCHEDULE_SETTINGS,
} from '../index';
import { IWeeklyMatchup } from '../../models/Schedule';
import { IPlayerExtended } from '../../models/Player';

describe('Schedule Integration', () => {
  it('should show easy schedule improves effective value', () => {
    const easySchedule: IWeeklyMatchup[] = Array(17).fill(null).map((_, i) => ({
      week: i + 1,
      opponent: 'EASY',
      isHome: true,
      rating: 5 as const,
      isBye: i === 6,
    }));

    const hardSchedule: IWeeklyMatchup[] = Array(17).fill(null).map((_, i) => ({
      week: i + 1,
      opponent: 'HARD',
      isHome: false,
      rating: 1 as const,
      isBye: i === 6,
    }));

    const easyScore = calculateScheduleScore(easySchedule, 7, DEFAULT_SCHEDULE_SETTINGS);
    const hardScore = calculateScheduleScore(hardSchedule, 7, DEFAULT_SCHEDULE_SETTINGS);

    expect(easyScore).toBeGreaterThan(hardScore);
    expect(easyScore - hardScore).toBeGreaterThan(20); // Significant difference
  });

  it('should penalize week 14 bye heavily', () => {
    const normalSchedule: IWeeklyMatchup[] = Array(17).fill(null).map((_, i) => ({
      week: i + 1,
      opponent: 'MID',
      isHome: true,
      rating: 3 as const,
      isBye: false,
    }));

    const scoreWithEarlyBye = calculateScheduleScore(normalSchedule, 6, DEFAULT_SCHEDULE_SETTINGS);
    const scoreWithPlayoffBye = calculateScheduleScore(normalSchedule, 14, DEFAULT_SCHEDULE_SETTINGS);

    expect(scoreWithEarlyBye).toBeGreaterThan(scoreWithPlayoffBye);
  });

  it('should calculate SOS correctly for playoff weeks', () => {
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
});
```

**Step 3: Commit**

```bash
git add app/lib/engine/index.ts app/lib/engine/__tests__/scheduleIntegration.test.ts app/lib/models/Schedule.ts app/lib/models/__tests__/Schedule.test.ts
git commit -m "feat(engine): integrate schedule scoring into engine

- Add Schedule model interfaces
- Add schedule calculation functions
- Export all schedule types from engine index
- Add integration tests for schedule impact"
```

---

## Execution Summary

| Task | Component | Tests |
|------|-----------|-------|
| 1 | Schedule Model Interfaces | 10 |
| 2 | Schedule Calculator | 15 |
| 3 | Schedule Integration | 5 |

**Total new tests:** ~30 tests
**New files:** 4 files

---

## Next Phase Preview

**Phase 3: Dynamic Scarcity Engine** will include:
- Position supply tracking during draft
- Scarcity premium calculations
- Drop-off alerts for position runs
- Real-time VOR recalculation
