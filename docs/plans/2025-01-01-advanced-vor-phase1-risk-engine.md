# Advanced VOR Modeling - Phase 1: Risk & Consistency Engine

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the foundation of the advanced VOR system with TypeScript risk scoring, consistency calculations, and enhanced player models that integrate with the existing draft engine.

**Architecture:** Create a modular `lib/engine/` directory with pure functions for risk and consistency scoring. Extend existing Player model with advanced stats. Risk calculations follow the formula: `Injury Risk = (Historical Rate × 0.4) + (Age Factor × 0.25) + (Position Risk × 0.2) + (Current Status × 0.15)`. All functions are pure and testable.

**Tech Stack:** TypeScript, Jest, existing Redux store patterns

---

## Task 1: Create Risk Model Interfaces

**Files:**
- Create: `app/lib/models/Risk.ts`
- Test: `app/lib/models/__tests__/Risk.test.ts`

**Step 1: Write the failing test**

Create file `app/lib/models/__tests__/Risk.test.ts`:

```typescript
/**
 * Tests for Risk model interfaces and type guards
 */
import {
  IInjuryHistory,
  IRiskProfile,
  IRiskSettings,
  HealthStatus,
  isValidRiskProfile,
  DEFAULT_RISK_SETTINGS,
} from '../Risk';

describe('Risk Models', () => {
  describe('IInjuryHistory', () => {
    it('should represent 3 years of games played', () => {
      const history: IInjuryHistory = {
        gamesPlayed: [16, 17, 14], // last 3 seasons
        currentStatus: 'healthy',
      };
      expect(history.gamesPlayed).toHaveLength(3);
      expect(history.currentStatus).toBe('healthy');
    });
  });

  describe('IRiskProfile', () => {
    it('should contain all risk components', () => {
      const profile: IRiskProfile = {
        injuryScore: 35,
        consistencyScore: 0.72,
        floor: 150,
        ceiling: 280,
        weeklyVariance: 0.28,
      };
      expect(profile.injuryScore).toBeGreaterThanOrEqual(0);
      expect(profile.injuryScore).toBeLessThanOrEqual(100);
      expect(profile.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(profile.consistencyScore).toBeLessThanOrEqual(1);
    });
  });

  describe('isValidRiskProfile', () => {
    it('should return true for valid profile', () => {
      const profile: IRiskProfile = {
        injuryScore: 50,
        consistencyScore: 0.7,
        floor: 100,
        ceiling: 200,
        weeklyVariance: 0.3,
      };
      expect(isValidRiskProfile(profile)).toBe(true);
    });

    it('should return false for invalid injury score', () => {
      const profile = {
        injuryScore: 150, // invalid: > 100
        consistencyScore: 0.7,
        floor: 100,
        ceiling: 200,
        weeklyVariance: 0.3,
      };
      expect(isValidRiskProfile(profile as IRiskProfile)).toBe(false);
    });

    it('should return false for negative consistency score', () => {
      const profile = {
        injuryScore: 50,
        consistencyScore: -0.1, // invalid: < 0
        floor: 100,
        ceiling: 200,
        weeklyVariance: 0.3,
      };
      expect(isValidRiskProfile(profile as IRiskProfile)).toBe(false);
    });
  });

  describe('DEFAULT_RISK_SETTINGS', () => {
    it('should have balanced risk tolerance', () => {
      expect(DEFAULT_RISK_SETTINGS.riskTolerance).toBe(0.5);
    });

    it('should have reasonable position age thresholds', () => {
      expect(DEFAULT_RISK_SETTINGS.positionAgeThresholds.RB).toBe(27);
      expect(DEFAULT_RISK_SETTINGS.positionAgeThresholds.WR).toBe(30);
      expect(DEFAULT_RISK_SETTINGS.positionAgeThresholds.QB).toBe(35);
      expect(DEFAULT_RISK_SETTINGS.positionAgeThresholds.TE).toBe(30);
    });

    it('should have position base risk values', () => {
      expect(DEFAULT_RISK_SETTINGS.positionBaseRisk.RB).toBe(0.7);
      expect(DEFAULT_RISK_SETTINGS.positionBaseRisk.WR).toBe(0.4);
      expect(DEFAULT_RISK_SETTINGS.positionBaseRisk.QB).toBe(0.2);
      expect(DEFAULT_RISK_SETTINGS.positionBaseRisk.TE).toBe(0.5);
    });
  });

  describe('HealthStatus', () => {
    it('should have all expected status values', () => {
      const statuses: HealthStatus[] = ['healthy', 'questionable', 'doubtful', 'out', 'ir'];
      expect(statuses).toContain('healthy');
      expect(statuses).toContain('ir');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --testPathPattern=Risk.test.ts`
Expected: FAIL with "Cannot find module '../Risk'"

**Step 3: Write minimal implementation**

Create file `app/lib/models/Risk.ts`:

```typescript
/**
 * Risk and consistency models for advanced VOR calculations.
 *
 * These interfaces support the risk-adjusted VOR formula:
 * Adjusted VOR = Base VOR × (1 - (Injury Risk × Risk Sensitivity))
 *                         × (Consistency ^ (1 - Risk Tolerance))
 */

import { Position } from './Player';

/**
 * Player health status for injury risk calculation
 */
export type HealthStatus = 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir';

/**
 * Historical injury data for a player
 */
export interface IInjuryHistory {
  /** Games played in last 3 seasons [most recent, year-1, year-2] */
  gamesPlayed: [number, number, number];
  /** Current health status */
  currentStatus: HealthStatus;
  /** Optional: specific injury notes */
  notes?: string;
}

/**
 * Calculated risk profile for a player
 */
export interface IRiskProfile {
  /** Injury risk score (0-100, higher = more risky) */
  injuryScore: number;
  /** Consistency score (0-1, higher = more consistent) */
  consistencyScore: number;
  /** Projected floor (pessimistic projection) */
  floor: number;
  /** Projected ceiling (optimistic projection) */
  ceiling: number;
  /** Weekly scoring variance (std dev / mean) */
  weeklyVariance: number;
}

/**
 * Age thresholds where injury risk increases by position
 */
export interface IPositionAgeThresholds {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  K: number;
  DST: number;
}

/**
 * Base injury risk by position (0-1 scale)
 */
export interface IPositionBaseRisk {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  K: number;
  DST: number;
}

/**
 * User-configurable risk settings
 */
export interface IRiskSettings {
  /** Risk tolerance (0=conservative, 0.5=balanced, 1=aggressive) */
  riskTolerance: number;
  /** Age thresholds for increased injury risk */
  positionAgeThresholds: IPositionAgeThresholds;
  /** Base injury risk by position */
  positionBaseRisk: IPositionBaseRisk;
  /** Weight for historical injury rate in calculation */
  historicalWeight: number;
  /** Weight for age factor in calculation */
  ageWeight: number;
  /** Weight for position risk in calculation */
  positionWeight: number;
  /** Weight for current status in calculation */
  statusWeight: number;
}

/**
 * Default risk settings (balanced approach)
 */
export const DEFAULT_RISK_SETTINGS: IRiskSettings = {
  riskTolerance: 0.5,
  positionAgeThresholds: {
    QB: 35,
    RB: 27,
    WR: 30,
    TE: 30,
    K: 38,
    DST: 99, // DST doesn't age
  },
  positionBaseRisk: {
    QB: 0.2,
    RB: 0.7,
    WR: 0.4,
    TE: 0.5,
    K: 0.1,
    DST: 0.1,
  },
  historicalWeight: 0.4,
  ageWeight: 0.25,
  positionWeight: 0.2,
  statusWeight: 0.15,
};

/**
 * Type guard to validate a risk profile
 */
export const isValidRiskProfile = (profile: IRiskProfile): boolean => {
  return (
    profile.injuryScore >= 0 &&
    profile.injuryScore <= 100 &&
    profile.consistencyScore >= 0 &&
    profile.consistencyScore <= 1 &&
    profile.floor >= 0 &&
    profile.ceiling >= profile.floor &&
    profile.weeklyVariance >= 0
  );
};
```

**Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --testPathPattern=Risk.test.ts`
Expected: PASS - all 7 tests should pass

**Step 5: Commit**

```bash
git add app/lib/models/Risk.ts app/lib/models/__tests__/Risk.test.ts
git commit -m "feat(models): add Risk interfaces for advanced VOR

- Add IInjuryHistory for tracking player injury data
- Add IRiskProfile for calculated risk metrics
- Add IRiskSettings for user-configurable risk tolerance
- Add DEFAULT_RISK_SETTINGS with balanced defaults
- Add isValidRiskProfile type guard"
```

---

## Task 2: Create Risk Calculator Engine

**Files:**
- Create: `app/lib/engine/risk.ts`
- Test: `app/lib/engine/__tests__/risk.test.ts`

**Step 1: Write the failing test**

Create directory and file `app/lib/engine/__tests__/risk.test.ts`:

```typescript
/**
 * Tests for risk calculation engine
 */
import {
  calculateInjuryRisk,
  calculateHistoricalInjuryRate,
  calculateAgeFactor,
  calculatePositionRisk,
  calculateStatusFactor,
} from '../risk';
import { IInjuryHistory, DEFAULT_RISK_SETTINGS, HealthStatus } from '../../models/Risk';
import { Position } from '../../models/Player';

describe('Risk Calculator', () => {
  describe('calculateHistoricalInjuryRate', () => {
    it('should return 0 for player with all 17 games each season', () => {
      const history: IInjuryHistory = {
        gamesPlayed: [17, 17, 17],
        currentStatus: 'healthy',
      };
      expect(calculateHistoricalInjuryRate(history)).toBe(0);
    });

    it('should return ~0.5 for player missing half their games', () => {
      const history: IInjuryHistory = {
        gamesPlayed: [8, 9, 8], // 25 of 51 games
        currentStatus: 'healthy',
      };
      const rate = calculateHistoricalInjuryRate(history);
      expect(rate).toBeCloseTo(0.51, 1); // (51-25)/51 = 0.51
    });

    it('should return 1 for player who missed all games', () => {
      const history: IInjuryHistory = {
        gamesPlayed: [0, 0, 0],
        currentStatus: 'ir',
      };
      expect(calculateHistoricalInjuryRate(history)).toBe(1);
    });

    it('should weight recent seasons more heavily', () => {
      const recentInjury: IInjuryHistory = {
        gamesPlayed: [5, 17, 17], // injured recently
        currentStatus: 'healthy',
      };
      const oldInjury: IInjuryHistory = {
        gamesPlayed: [17, 17, 5], // injured 2 years ago
        currentStatus: 'healthy',
      };
      expect(calculateHistoricalInjuryRate(recentInjury)).toBeGreaterThan(
        calculateHistoricalInjuryRate(oldInjury)
      );
    });
  });

  describe('calculateAgeFactor', () => {
    it('should return 0 for young RB (under 27)', () => {
      expect(calculateAgeFactor(24, 'RB', DEFAULT_RISK_SETTINGS)).toBe(0);
    });

    it('should return positive value for RB at threshold', () => {
      expect(calculateAgeFactor(27, 'RB', DEFAULT_RISK_SETTINGS)).toBeGreaterThan(0);
    });

    it('should increase for older RB', () => {
      const at27 = calculateAgeFactor(27, 'RB', DEFAULT_RISK_SETTINGS);
      const at30 = calculateAgeFactor(30, 'RB', DEFAULT_RISK_SETTINGS);
      expect(at30).toBeGreaterThan(at27);
    });

    it('should cap at 1.0', () => {
      expect(calculateAgeFactor(40, 'RB', DEFAULT_RISK_SETTINGS)).toBeLessThanOrEqual(1);
    });

    it('should use different thresholds for QB vs RB', () => {
      // 30-year-old: over RB threshold (27) but under QB threshold (35)
      const rbFactor = calculateAgeFactor(30, 'RB', DEFAULT_RISK_SETTINGS);
      const qbFactor = calculateAgeFactor(30, 'QB', DEFAULT_RISK_SETTINGS);
      expect(rbFactor).toBeGreaterThan(qbFactor);
      expect(qbFactor).toBe(0);
    });
  });

  describe('calculatePositionRisk', () => {
    it('should return highest risk for RB', () => {
      const rbRisk = calculatePositionRisk('RB', DEFAULT_RISK_SETTINGS);
      const wrRisk = calculatePositionRisk('WR', DEFAULT_RISK_SETTINGS);
      const qbRisk = calculatePositionRisk('QB', DEFAULT_RISK_SETTINGS);
      expect(rbRisk).toBeGreaterThan(wrRisk);
      expect(wrRisk).toBeGreaterThan(qbRisk);
    });

    it('should return 0.7 for RB with default settings', () => {
      expect(calculatePositionRisk('RB', DEFAULT_RISK_SETTINGS)).toBe(0.7);
    });

    it('should return 0.2 for QB with default settings', () => {
      expect(calculatePositionRisk('QB', DEFAULT_RISK_SETTINGS)).toBe(0.2);
    });

    it('should return low risk for DST and K', () => {
      expect(calculatePositionRisk('DST', DEFAULT_RISK_SETTINGS)).toBe(0.1);
      expect(calculatePositionRisk('K', DEFAULT_RISK_SETTINGS)).toBe(0.1);
    });
  });

  describe('calculateStatusFactor', () => {
    it('should return 0 for healthy player', () => {
      expect(calculateStatusFactor('healthy')).toBe(0);
    });

    it('should return 0.3 for questionable player', () => {
      expect(calculateStatusFactor('questionable')).toBe(0.3);
    });

    it('should return 0.5 for doubtful player', () => {
      expect(calculateStatusFactor('doubtful')).toBe(0.5);
    });

    it('should return 0.8 for out player', () => {
      expect(calculateStatusFactor('out')).toBe(0.8);
    });

    it('should return 1.0 for IR player', () => {
      expect(calculateStatusFactor('ir')).toBe(1.0);
    });
  });

  describe('calculateInjuryRisk', () => {
    it('should return low risk for healthy young QB with no injury history', () => {
      const history: IInjuryHistory = {
        gamesPlayed: [17, 17, 17],
        currentStatus: 'healthy',
      };
      const risk = calculateInjuryRisk(history, 25, 'QB', DEFAULT_RISK_SETTINGS);
      expect(risk).toBeLessThan(20); // Low risk
    });

    it('should return high risk for injury-prone older RB', () => {
      const history: IInjuryHistory = {
        gamesPlayed: [10, 12, 8],
        currentStatus: 'questionable',
      };
      const risk = calculateInjuryRisk(history, 29, 'RB', DEFAULT_RISK_SETTINGS);
      expect(risk).toBeGreaterThan(50); // High risk
    });

    it('should return moderate risk for average player', () => {
      const history: IInjuryHistory = {
        gamesPlayed: [15, 16, 14],
        currentStatus: 'healthy',
      };
      const risk = calculateInjuryRisk(history, 26, 'WR', DEFAULT_RISK_SETTINGS);
      expect(risk).toBeGreaterThan(10);
      expect(risk).toBeLessThan(40);
    });

    it('should be bounded 0-100', () => {
      const worstCase: IInjuryHistory = {
        gamesPlayed: [0, 0, 0],
        currentStatus: 'ir',
      };
      const risk = calculateInjuryRisk(worstCase, 35, 'RB', DEFAULT_RISK_SETTINGS);
      expect(risk).toBeLessThanOrEqual(100);
      expect(risk).toBeGreaterThanOrEqual(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --testPathPattern=engine/.*risk.test.ts`
Expected: FAIL with "Cannot find module '../risk'"

**Step 3: Write minimal implementation**

Create directory `app/lib/engine/` and file `app/lib/engine/risk.ts`:

```typescript
/**
 * Risk calculation engine for injury risk scoring.
 *
 * Injury Risk Formula:
 * Risk = (Historical Rate × 0.4) + (Age Factor × 0.25) +
 *        (Position Risk × 0.2) + (Current Status × 0.15)
 *
 * All component functions are pure and independently testable.
 */

import { Position } from '../models/Player';
import {
  IInjuryHistory,
  IRiskSettings,
  HealthStatus,
  DEFAULT_RISK_SETTINGS,
} from '../models/Risk';

/**
 * Calculate historical injury rate from games played data.
 * More recent seasons are weighted more heavily.
 *
 * @param history - Player's injury history
 * @returns Rate from 0 (never injured) to 1 (always injured)
 */
export const calculateHistoricalInjuryRate = (history: IInjuryHistory): number => {
  const [recent, yearAgo, twoYearsAgo] = history.gamesPlayed;
  const maxGamesPerSeason = 17;

  // Weight recent seasons more (50%, 30%, 20%)
  const weightedGamesPlayed =
    recent * 0.5 + yearAgo * 0.3 + twoYearsAgo * 0.2;
  const weightedMaxGames = maxGamesPerSeason * (0.5 + 0.3 + 0.2);

  const gamesMissedRate = 1 - weightedGamesPlayed / weightedMaxGames;
  return Math.max(0, Math.min(1, gamesMissedRate));
};

/**
 * Calculate age-based injury risk factor.
 * Risk increases after position-specific age thresholds.
 *
 * @param age - Player's age
 * @param position - Player's position
 * @param settings - Risk settings with age thresholds
 * @returns Factor from 0 (young) to 1 (very old)
 */
export const calculateAgeFactor = (
  age: number,
  position: Position,
  settings: IRiskSettings = DEFAULT_RISK_SETTINGS
): number => {
  const threshold = settings.positionAgeThresholds[position as keyof typeof settings.positionAgeThresholds];

  if (threshold === undefined || age < threshold) {
    return 0;
  }

  // Each year over threshold adds 0.15 to factor, capped at 1.0
  const yearsOver = age - threshold;
  return Math.min(1, yearsOver * 0.15);
};

/**
 * Get base position risk factor.
 * RBs have highest risk, QBs/K/DST lowest.
 *
 * @param position - Player's position
 * @param settings - Risk settings with position base risks
 * @returns Risk factor from 0 to 1
 */
export const calculatePositionRisk = (
  position: Position,
  settings: IRiskSettings = DEFAULT_RISK_SETTINGS
): number => {
  return settings.positionBaseRisk[position as keyof typeof settings.positionBaseRisk] ?? 0.3;
};

/**
 * Calculate current health status factor.
 *
 * @param status - Current health status
 * @returns Factor from 0 (healthy) to 1 (IR)
 */
export const calculateStatusFactor = (status: HealthStatus): number => {
  const statusFactors: Record<HealthStatus, number> = {
    healthy: 0,
    questionable: 0.3,
    doubtful: 0.5,
    out: 0.8,
    ir: 1.0,
  };
  return statusFactors[status];
};

/**
 * Calculate overall injury risk score (0-100).
 *
 * Formula: Risk = (Historical × 0.4) + (Age × 0.25) + (Position × 0.2) + (Status × 0.15)
 *
 * @param history - Player's injury history
 * @param age - Player's age
 * @param position - Player's position
 * @param settings - Risk calculation settings
 * @returns Injury risk score from 0 (low risk) to 100 (high risk)
 */
export const calculateInjuryRisk = (
  history: IInjuryHistory,
  age: number,
  position: Position,
  settings: IRiskSettings = DEFAULT_RISK_SETTINGS
): number => {
  const historicalRate = calculateHistoricalInjuryRate(history);
  const ageFactor = calculateAgeFactor(age, position, settings);
  const positionRisk = calculatePositionRisk(position, settings);
  const statusFactor = calculateStatusFactor(history.currentStatus);

  const rawScore =
    historicalRate * settings.historicalWeight +
    ageFactor * settings.ageWeight +
    positionRisk * settings.positionWeight +
    statusFactor * settings.statusWeight;

  // Convert to 0-100 scale
  return Math.round(Math.max(0, Math.min(100, rawScore * 100)));
};
```

**Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --testPathPattern=engine/.*risk.test.ts`
Expected: PASS - all 18 tests should pass

**Step 5: Commit**

```bash
git add app/lib/engine/risk.ts app/lib/engine/__tests__/risk.test.ts
git commit -m "feat(engine): add injury risk calculator

- Add calculateHistoricalInjuryRate with recency weighting
- Add calculateAgeFactor with position-specific thresholds
- Add calculatePositionRisk for base position risk values
- Add calculateStatusFactor for current health status
- Add calculateInjuryRisk combining all factors (0-100 scale)"
```

---

## Task 3: Create Consistency Calculator

**Files:**
- Modify: `app/lib/engine/risk.ts`
- Modify: `app/lib/engine/__tests__/risk.test.ts`

**Step 1: Write the failing test**

Add to `app/lib/engine/__tests__/risk.test.ts`:

```typescript
import {
  calculateInjuryRisk,
  calculateHistoricalInjuryRate,
  calculateAgeFactor,
  calculatePositionRisk,
  calculateStatusFactor,
  calculateConsistencyScore,
  calculateFloorCeiling,
} from '../risk';

// ... existing tests ...

describe('Consistency Calculator', () => {
  describe('calculateConsistencyScore', () => {
    it('should return high score for consistent weekly performances', () => {
      // Player scores 15, 16, 14, 15, 16, 15, 14, 15, 16, 15 (low variance)
      const weeklyScores = [15, 16, 14, 15, 16, 15, 14, 15, 16, 15];
      const score = calculateConsistencyScore(weeklyScores);
      expect(score).toBeGreaterThan(0.8);
    });

    it('should return low score for boom/bust player', () => {
      // Player scores 5, 30, 8, 25, 3, 28, 6, 32, 4, 27 (high variance)
      const weeklyScores = [5, 30, 8, 25, 3, 28, 6, 32, 4, 27];
      const score = calculateConsistencyScore(weeklyScores);
      expect(score).toBeLessThan(0.5);
    });

    it('should return 1 for perfectly consistent player', () => {
      const weeklyScores = [20, 20, 20, 20, 20];
      const score = calculateConsistencyScore(weeklyScores);
      expect(score).toBe(1);
    });

    it('should handle empty array', () => {
      const score = calculateConsistencyScore([]);
      expect(score).toBe(0);
    });

    it('should handle single game', () => {
      const score = calculateConsistencyScore([15]);
      expect(score).toBe(1); // No variance with single data point
    });

    it('should be bounded 0-1', () => {
      const extremeVariance = [0, 100, 0, 100, 0, 100];
      const score = calculateConsistencyScore(extremeVariance);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateFloorCeiling', () => {
    it('should calculate floor as 10th percentile', () => {
      const weeklyScores = [10, 12, 15, 18, 20, 22, 25, 28, 30, 35];
      const { floor } = calculateFloorCeiling(weeklyScores, 250);
      // 10th percentile of this data, scaled to season
      expect(floor).toBeLessThan(250);
      expect(floor).toBeGreaterThan(100);
    });

    it('should calculate ceiling as 90th percentile', () => {
      const weeklyScores = [10, 12, 15, 18, 20, 22, 25, 28, 30, 35];
      const { ceiling } = calculateFloorCeiling(weeklyScores, 250);
      expect(ceiling).toBeGreaterThan(250);
      expect(ceiling).toBeLessThan(500);
    });

    it('should have floor <= projection <= ceiling', () => {
      const weeklyScores = [15, 16, 14, 15, 16, 15, 14, 15, 16, 15];
      const projection = 255;
      const { floor, ceiling } = calculateFloorCeiling(weeklyScores, projection);
      expect(floor).toBeLessThanOrEqual(projection);
      expect(ceiling).toBeGreaterThanOrEqual(projection);
    });

    it('should return projection for both when no history', () => {
      const { floor, ceiling } = calculateFloorCeiling([], 200);
      expect(floor).toBe(200);
      expect(ceiling).toBe(200);
    });

    it('should calculate weekly variance', () => {
      const weeklyScores = [15, 16, 14, 15, 16, 15, 14, 15, 16, 15];
      const { weeklyVariance } = calculateFloorCeiling(weeklyScores, 250);
      expect(weeklyVariance).toBeGreaterThan(0);
      expect(weeklyVariance).toBeLessThan(1);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --testPathPattern=engine/.*risk.test.ts`
Expected: FAIL with "calculateConsistencyScore is not a function"

**Step 3: Write minimal implementation**

Add to `app/lib/engine/risk.ts`:

```typescript
/**
 * Calculate consistency score from weekly performances.
 * Formula: 1 - (stdDev / mean)
 *
 * @param weeklyScores - Array of weekly fantasy point totals
 * @returns Consistency score from 0 (boom/bust) to 1 (perfectly consistent)
 */
export const calculateConsistencyScore = (weeklyScores: number[]): number => {
  if (weeklyScores.length === 0) {
    return 0;
  }

  if (weeklyScores.length === 1) {
    return 1; // No variance with single data point
  }

  const mean = weeklyScores.reduce((a, b) => a + b, 0) / weeklyScores.length;

  if (mean === 0) {
    return 0;
  }

  const squaredDiffs = weeklyScores.map((score) => Math.pow(score - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / weeklyScores.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation, inverted so higher = more consistent
  const cv = stdDev / mean;
  const consistency = 1 - cv;

  return Math.max(0, Math.min(1, consistency));
};

/**
 * Calculate percentile value from an array of numbers.
 *
 * @param arr - Sorted array of numbers
 * @param percentile - Percentile to calculate (0-100)
 * @returns Value at the given percentile
 */
const calculatePercentile = (arr: number[], percentile: number): number => {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  // Linear interpolation
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};

/**
 * Calculate floor and ceiling projections based on weekly variance.
 *
 * @param weeklyScores - Array of weekly fantasy point totals
 * @param seasonProjection - Projected season total
 * @returns Floor (10th percentile), ceiling (90th percentile), and weekly variance
 */
export const calculateFloorCeiling = (
  weeklyScores: number[],
  seasonProjection: number
): { floor: number; ceiling: number; weeklyVariance: number } => {
  if (weeklyScores.length === 0) {
    return {
      floor: seasonProjection,
      ceiling: seasonProjection,
      weeklyVariance: 0,
    };
  }

  const mean = weeklyScores.reduce((a, b) => a + b, 0) / weeklyScores.length;

  // Calculate weekly variance (stdDev / mean)
  const squaredDiffs = weeklyScores.map((score) => Math.pow(score - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / weeklyScores.length;
  const stdDev = Math.sqrt(variance);
  const weeklyVariance = mean > 0 ? stdDev / mean : 0;

  // Calculate floor (10th percentile) and ceiling (90th percentile)
  const p10 = calculatePercentile(weeklyScores, 10);
  const p90 = calculatePercentile(weeklyScores, 90);

  // Scale to season projection
  // If p10 is 80% of mean, floor is 80% of projection
  const floorRatio = mean > 0 ? p10 / mean : 1;
  const ceilingRatio = mean > 0 ? p90 / mean : 1;

  return {
    floor: Math.round(seasonProjection * floorRatio),
    ceiling: Math.round(seasonProjection * ceilingRatio),
    weeklyVariance: Math.round(weeklyVariance * 100) / 100,
  };
};
```

**Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --testPathPattern=engine/.*risk.test.ts`
Expected: PASS - all tests should pass

**Step 5: Commit**

```bash
git add app/lib/engine/risk.ts app/lib/engine/__tests__/risk.test.ts
git commit -m "feat(engine): add consistency and floor/ceiling calculators

- Add calculateConsistencyScore using coefficient of variation
- Add calculateFloorCeiling for 10th/90th percentile projections
- Add calculatePercentile helper for percentile calculations
- All functions handle edge cases (empty arrays, single values)"
```

---

## Task 4: Create Risk-Adjusted VOR Calculator

**Files:**
- Create: `app/lib/engine/vor.ts`
- Test: `app/lib/engine/__tests__/vor.test.ts`

**Step 1: Write the failing test**

Create file `app/lib/engine/__tests__/vor.test.ts`:

```typescript
/**
 * Tests for enhanced VOR calculation engine
 */
import {
  calculateRiskAdjustedVOR,
  applyRiskTolerance,
} from '../vor';
import { IRiskProfile, IRiskSettings, DEFAULT_RISK_SETTINGS } from '../../models/Risk';

describe('VOR Calculator', () => {
  describe('applyRiskTolerance', () => {
    const baseVOR = 100;
    const riskProfile: IRiskProfile = {
      injuryScore: 50, // Medium risk
      consistencyScore: 0.7,
      floor: 150,
      ceiling: 280,
      weeklyVariance: 0.3,
    };

    it('should reduce VOR more with conservative tolerance', () => {
      const conservativeSettings: IRiskSettings = {
        ...DEFAULT_RISK_SETTINGS,
        riskTolerance: 0.2, // Conservative
      };
      const aggressiveSettings: IRiskSettings = {
        ...DEFAULT_RISK_SETTINGS,
        riskTolerance: 0.8, // Aggressive
      };

      const conservativeVOR = applyRiskTolerance(baseVOR, riskProfile, conservativeSettings);
      const aggressiveVOR = applyRiskTolerance(baseVOR, riskProfile, aggressiveSettings);

      expect(conservativeVOR).toBeLessThan(aggressiveVOR);
    });

    it('should not change VOR for zero-risk player', () => {
      const noRiskProfile: IRiskProfile = {
        injuryScore: 0,
        consistencyScore: 1.0,
        floor: 200,
        ceiling: 250,
        weeklyVariance: 0.05,
      };

      const adjustedVOR = applyRiskTolerance(baseVOR, noRiskProfile, DEFAULT_RISK_SETTINGS);
      expect(adjustedVOR).toBe(baseVOR);
    });

    it('should significantly reduce VOR for high-risk player with conservative settings', () => {
      const highRiskProfile: IRiskProfile = {
        injuryScore: 80,
        consistencyScore: 0.4,
        floor: 80,
        ceiling: 350,
        weeklyVariance: 0.6,
      };
      const conservativeSettings: IRiskSettings = {
        ...DEFAULT_RISK_SETTINGS,
        riskTolerance: 0.2,
      };

      const adjustedVOR = applyRiskTolerance(baseVOR, highRiskProfile, conservativeSettings);
      expect(adjustedVOR).toBeLessThan(baseVOR * 0.7); // At least 30% reduction
    });

    it('should barely reduce VOR for high-risk player with aggressive settings', () => {
      const highRiskProfile: IRiskProfile = {
        injuryScore: 80,
        consistencyScore: 0.4,
        floor: 80,
        ceiling: 350,
        weeklyVariance: 0.6,
      };
      const aggressiveSettings: IRiskSettings = {
        ...DEFAULT_RISK_SETTINGS,
        riskTolerance: 0.9,
      };

      const adjustedVOR = applyRiskTolerance(baseVOR, highRiskProfile, aggressiveSettings);
      expect(adjustedVOR).toBeGreaterThan(baseVOR * 0.85); // Less than 15% reduction
    });
  });

  describe('calculateRiskAdjustedVOR', () => {
    it('should calculate complete risk-adjusted VOR', () => {
      const baseVOR = 85;
      const riskProfile: IRiskProfile = {
        injuryScore: 35,
        consistencyScore: 0.72,
        floor: 180,
        ceiling: 320,
        weeklyVariance: 0.28,
      };

      const result = calculateRiskAdjustedVOR(baseVOR, riskProfile, DEFAULT_RISK_SETTINGS);

      expect(result.baseVOR).toBe(85);
      expect(result.adjustedVOR).toBeLessThanOrEqual(85);
      expect(result.adjustedVOR).toBeGreaterThan(0);
      expect(result.riskAdjustment).toBeLessThanOrEqual(0);
    });

    it('should return breakdown of adjustments', () => {
      const baseVOR = 100;
      const riskProfile: IRiskProfile = {
        injuryScore: 50,
        consistencyScore: 0.6,
        floor: 150,
        ceiling: 300,
        weeklyVariance: 0.35,
      };

      const result = calculateRiskAdjustedVOR(baseVOR, riskProfile, DEFAULT_RISK_SETTINGS);

      expect(result).toHaveProperty('baseVOR');
      expect(result).toHaveProperty('adjustedVOR');
      expect(result).toHaveProperty('riskAdjustment');
      expect(result).toHaveProperty('consistencyAdjustment');
    });

    it('should handle negative base VOR', () => {
      const baseVOR = -10;
      const riskProfile: IRiskProfile = {
        injuryScore: 30,
        consistencyScore: 0.8,
        floor: 50,
        ceiling: 100,
        weeklyVariance: 0.2,
      };

      const result = calculateRiskAdjustedVOR(baseVOR, riskProfile, DEFAULT_RISK_SETTINGS);
      expect(result.adjustedVOR).toBeLessThanOrEqual(baseVOR);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --testPathPattern=engine/.*vor.test.ts`
Expected: FAIL with "Cannot find module '../vor'"

**Step 3: Write minimal implementation**

Create file `app/lib/engine/vor.ts`:

```typescript
/**
 * Enhanced VOR (Value Over Replacement) calculation engine.
 *
 * Risk-Adjusted VOR Formula:
 * Adjusted VOR = Base VOR × (1 - (InjuryRisk/100 × (1 - RiskTolerance)))
 *                         × (Consistency ^ (1 - RiskTolerance))
 *
 * This creates a sliding scale where:
 * - Conservative (0.2): Heavily penalizes risk
 * - Balanced (0.5): Moderate adjustments
 * - Aggressive (0.8): Embraces upside, minimal penalties
 */

import { IRiskProfile, IRiskSettings, DEFAULT_RISK_SETTINGS } from '../models/Risk';

/**
 * Result of risk-adjusted VOR calculation with breakdown
 */
export interface IRiskAdjustedVORResult {
  /** Original VOR before adjustments */
  baseVOR: number;
  /** Final VOR after risk adjustments */
  adjustedVOR: number;
  /** Points deducted for injury risk */
  riskAdjustment: number;
  /** Points adjusted for consistency */
  consistencyAdjustment: number;
}

/**
 * Apply risk tolerance to base VOR using risk profile.
 *
 * @param baseVOR - Original VOR value
 * @param riskProfile - Player's calculated risk profile
 * @param settings - Risk settings including tolerance
 * @returns Risk-adjusted VOR
 */
export const applyRiskTolerance = (
  baseVOR: number,
  riskProfile: IRiskProfile,
  settings: IRiskSettings = DEFAULT_RISK_SETTINGS
): number => {
  const { riskTolerance } = settings;
  const { injuryScore, consistencyScore } = riskProfile;

  // Risk sensitivity = inverse of tolerance
  // Conservative (0.2 tolerance) = 0.8 sensitivity
  // Aggressive (0.8 tolerance) = 0.2 sensitivity
  const riskSensitivity = 1 - riskTolerance;

  // Injury risk factor: reduces VOR based on injury probability
  // At 50% injury score with 0.5 sensitivity: factor = 1 - (0.5 * 0.5) = 0.75
  const injuryFactor = 1 - (injuryScore / 100) * riskSensitivity;

  // Consistency factor: adjusts based on week-to-week reliability
  // Higher consistency = less penalty
  // Formula: consistency ^ (1 - tolerance)
  // At 0.7 consistency with 0.2 tolerance: 0.7^0.8 = 0.74 (significant penalty)
  // At 0.7 consistency with 0.8 tolerance: 0.7^0.2 = 0.93 (minimal penalty)
  const consistencyFactor = Math.pow(consistencyScore, riskSensitivity);

  return Math.round(baseVOR * injuryFactor * consistencyFactor);
};

/**
 * Calculate complete risk-adjusted VOR with breakdown.
 *
 * @param baseVOR - Original VOR value
 * @param riskProfile - Player's calculated risk profile
 * @param settings - Risk settings including tolerance
 * @returns Result object with VOR and adjustment breakdown
 */
export const calculateRiskAdjustedVOR = (
  baseVOR: number,
  riskProfile: IRiskProfile,
  settings: IRiskSettings = DEFAULT_RISK_SETTINGS
): IRiskAdjustedVORResult => {
  const { riskTolerance } = settings;
  const { injuryScore, consistencyScore } = riskProfile;
  const riskSensitivity = 1 - riskTolerance;

  // Calculate individual factors
  const injuryFactor = 1 - (injuryScore / 100) * riskSensitivity;
  const consistencyFactor = Math.pow(consistencyScore, riskSensitivity);

  // Calculate individual adjustments
  const afterInjuryAdjustment = Math.round(baseVOR * injuryFactor);
  const adjustedVOR = Math.round(afterInjuryAdjustment * consistencyFactor);

  return {
    baseVOR,
    adjustedVOR,
    riskAdjustment: afterInjuryAdjustment - baseVOR,
    consistencyAdjustment: adjustedVOR - afterInjuryAdjustment,
  };
};
```

**Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --testPathPattern=engine/.*vor.test.ts`
Expected: PASS - all 8 tests should pass

**Step 5: Commit**

```bash
git add app/lib/engine/vor.ts app/lib/engine/__tests__/vor.test.ts
git commit -m "feat(engine): add risk-adjusted VOR calculator

- Add applyRiskTolerance for risk-tolerance slider support
- Add calculateRiskAdjustedVOR with full breakdown
- Support conservative/balanced/aggressive risk profiles
- Formula: VOR × injuryFactor × consistencyFactor"
```

---

## Task 5: Extend Player Model with Advanced Stats

**Files:**
- Modify: `app/lib/models/Player.ts`
- Modify: `app/lib/models/__tests__/Risk.test.ts` (add Player extension tests)

**Step 1: Write the failing test**

Add to `app/lib/models/__tests__/Risk.test.ts`:

```typescript
import {
  IInjuryHistory,
  IRiskProfile,
  IRiskSettings,
  HealthStatus,
  isValidRiskProfile,
  DEFAULT_RISK_SETTINGS,
} from '../Risk';
import { IPlayerAdvanced, IPlayerRisk, hasAdvancedStats, hasRiskProfile } from '../Player';

// ... existing tests ...

describe('Extended Player Models', () => {
  describe('IPlayerAdvanced', () => {
    it('should contain advanced stats', () => {
      const advanced: IPlayerAdvanced = {
        targetShare: 0.28,
        airYards: 1620,
        redZoneTargets: 22,
        snapPct: 0.92,
        yardsPerRouteRun: 2.41,
        yardsAfterContact: 3.2,
        pressureRate: 0.25,
      };
      expect(advanced.targetShare).toBe(0.28);
      expect(advanced.snapPct).toBe(0.92);
    });
  });

  describe('IPlayerRisk', () => {
    it('should contain risk data', () => {
      const risk: IPlayerRisk = {
        age: 26,
        injuryHistory: {
          gamesPlayed: [16, 17, 15],
          currentStatus: 'healthy',
        },
        riskProfile: {
          injuryScore: 25,
          consistencyScore: 0.75,
          floor: 180,
          ceiling: 320,
          weeklyVariance: 0.25,
        },
      };
      expect(risk.age).toBe(26);
      expect(risk.injuryHistory.currentStatus).toBe('healthy');
    });
  });

  describe('hasAdvancedStats', () => {
    it('should return true for player with advanced stats', () => {
      const player = {
        key: 'test_WR_DAL',
        name: 'Test Player',
        pos: 'WR',
        advanced: {
          targetShare: 0.25,
        },
      };
      expect(hasAdvancedStats(player)).toBe(true);
    });

    it('should return false for player without advanced stats', () => {
      const player = {
        key: 'test_WR_DAL',
        name: 'Test Player',
        pos: 'WR',
      };
      expect(hasAdvancedStats(player)).toBe(false);
    });
  });

  describe('hasRiskProfile', () => {
    it('should return true for player with risk profile', () => {
      const player = {
        key: 'test_WR_DAL',
        name: 'Test Player',
        pos: 'WR',
        risk: {
          age: 25,
          injuryHistory: { gamesPlayed: [17, 17, 17], currentStatus: 'healthy' },
          riskProfile: {
            injuryScore: 20,
            consistencyScore: 0.8,
            floor: 200,
            ceiling: 300,
            weeklyVariance: 0.2,
          },
        },
      };
      expect(hasRiskProfile(player)).toBe(true);
    });

    it('should return false for player without risk profile', () => {
      const player = {
        key: 'test_WR_DAL',
        name: 'Test Player',
        pos: 'WR',
      };
      expect(hasRiskProfile(player)).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --testPathPattern=Risk.test.ts`
Expected: FAIL with "IPlayerAdvanced is not exported"

**Step 3: Write minimal implementation**

Modify `app/lib/models/Player.ts` - add after the existing interfaces:

```typescript
import { IScoring } from './Scoring';
import { IInjuryHistory, IRiskProfile } from './Risk';

// ... existing code ...

/**
 * Advanced stats for enhanced projections.
 * These stats help predict performance beyond basic projections.
 */
export interface IPlayerAdvanced {
  /** Percentage of team targets (WR/TE) */
  targetShare?: number;
  /** Total air yards on targets (WR/TE) */
  airYards?: number;
  /** Red zone targets or carries */
  redZoneTargets?: number;
  /** Percentage of offensive snaps played */
  snapPct?: number;
  /** Yards per route run (WR/TE efficiency) */
  yardsPerRouteRun?: number;
  /** Yards after contact (RB talent) */
  yardsAfterContact?: number;
  /** QB pressure rate (QB metric) */
  pressureRate?: number;
  /** Pass block win rate (O-line, affects RB value) */
  passBlockWinRate?: number;
}

/**
 * Risk-related data for a player
 */
export interface IPlayerRisk {
  /** Player's age */
  age: number;
  /** Historical injury data */
  injuryHistory: IInjuryHistory;
  /** Calculated risk profile (may be computed client-side) */
  riskProfile?: IRiskProfile;
  /** Weekly scores from previous season(s) for consistency calc */
  weeklyScores?: number[];
}

/**
 * Extended player interface with advanced stats and risk data.
 * Backwards compatible with existing IPlayer.
 */
export interface IPlayerExtended extends IPlayer {
  /** Advanced analytics stats */
  advanced?: IPlayerAdvanced;
  /** Risk and injury data */
  risk?: IPlayerRisk;
  /** Risk-adjusted VOR (calculated client-side) */
  adjustedVOR?: number;
}

/**
 * Type guard to check if player has advanced stats
 */
export const hasAdvancedStats = (player: Partial<IPlayerExtended>): player is IPlayerExtended & { advanced: IPlayerAdvanced } => {
  return player.advanced !== undefined && player.advanced !== null;
};

/**
 * Type guard to check if player has risk profile
 */
export const hasRiskProfile = (player: Partial<IPlayerExtended>): player is IPlayerExtended & { risk: IPlayerRisk } => {
  return (
    player.risk !== undefined &&
    player.risk !== null &&
    player.risk.riskProfile !== undefined
  );
};
```

**Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --testPathPattern=Risk.test.ts`
Expected: PASS - all tests should pass

**Step 5: Commit**

```bash
git add app/lib/models/Player.ts app/lib/models/__tests__/Risk.test.ts
git commit -m "feat(models): extend Player with advanced stats and risk data

- Add IPlayerAdvanced for targetShare, snapPct, airYards, etc.
- Add IPlayerRisk for age, injury history, risk profile
- Add IPlayerExtended combining base player with extensions
- Add hasAdvancedStats and hasRiskProfile type guards
- Backwards compatible with existing IPlayer interface"
```

---

## Task 6: Create Risk Profile Builder

**Files:**
- Create: `app/lib/engine/riskProfile.ts`
- Test: `app/lib/engine/__tests__/riskProfile.test.ts`

**Step 1: Write the failing test**

Create file `app/lib/engine/__tests__/riskProfile.test.ts`:

```typescript
/**
 * Tests for building complete risk profiles for players
 */
import { buildRiskProfile } from '../riskProfile';
import { IPlayerExtended } from '../../models/Player';
import { DEFAULT_RISK_SETTINGS } from '../../models/Risk';

describe('Risk Profile Builder', () => {
  const createMockPlayer = (overrides: Partial<IPlayerExtended> = {}): IPlayerExtended => ({
    index: 0,
    key: 'test_RB_DAL',
    name: 'Test Player',
    pos: 'RB',
    team: 'DAL',
    bye: 7,
    std: 15,
    halfPpr: 14,
    ppr: 12,
    passYds: 0,
    passTds: 0,
    passInts: 0,
    receptions: 45,
    receptionYds: 350,
    receptionTds: 2,
    rushYds: 1200,
    rushTds: 10,
    fumbles: 2,
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
    forecast: 250,
    vor: 75,
    ...overrides,
  });

  describe('buildRiskProfile', () => {
    it('should build complete risk profile for player with full data', () => {
      const player = createMockPlayer({
        risk: {
          age: 26,
          injuryHistory: {
            gamesPlayed: [16, 17, 15],
            currentStatus: 'healthy',
          },
          weeklyScores: [15, 18, 12, 20, 16, 14, 19, 15, 17, 13, 16, 18, 14, 15, 17, 16],
        },
      });

      const profile = buildRiskProfile(player, DEFAULT_RISK_SETTINGS);

      expect(profile).toBeDefined();
      expect(profile.injuryScore).toBeGreaterThanOrEqual(0);
      expect(profile.injuryScore).toBeLessThanOrEqual(100);
      expect(profile.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(profile.consistencyScore).toBeLessThanOrEqual(1);
      expect(profile.floor).toBeLessThanOrEqual(player.forecast!);
      expect(profile.ceiling).toBeGreaterThanOrEqual(player.forecast!);
    });

    it('should return default profile for player without risk data', () => {
      const player = createMockPlayer();

      const profile = buildRiskProfile(player, DEFAULT_RISK_SETTINGS);

      expect(profile.injuryScore).toBe(50); // Default moderate risk
      expect(profile.consistencyScore).toBe(0.7); // Default moderate consistency
      expect(profile.floor).toBe(player.forecast!);
      expect(profile.ceiling).toBe(player.forecast!);
    });

    it('should calculate higher risk for injury-prone older RB', () => {
      const healthyYoungRB = createMockPlayer({
        risk: {
          age: 23,
          injuryHistory: {
            gamesPlayed: [17, 17, 17],
            currentStatus: 'healthy',
          },
        },
      });

      const injuredOldRB = createMockPlayer({
        risk: {
          age: 29,
          injuryHistory: {
            gamesPlayed: [10, 12, 8],
            currentStatus: 'questionable',
          },
        },
      });

      const healthyProfile = buildRiskProfile(healthyYoungRB, DEFAULT_RISK_SETTINGS);
      const injuredProfile = buildRiskProfile(injuredOldRB, DEFAULT_RISK_SETTINGS);

      expect(injuredProfile.injuryScore).toBeGreaterThan(healthyProfile.injuryScore);
    });

    it('should calculate consistency from weekly scores', () => {
      const consistentPlayer = createMockPlayer({
        risk: {
          age: 25,
          injuryHistory: { gamesPlayed: [17, 17, 17], currentStatus: 'healthy' },
          weeklyScores: [15, 16, 15, 16, 15, 16, 15, 16, 15, 16], // Very consistent
        },
      });

      const boomBustPlayer = createMockPlayer({
        risk: {
          age: 25,
          injuryHistory: { gamesPlayed: [17, 17, 17], currentStatus: 'healthy' },
          weeklyScores: [5, 30, 8, 25, 3, 28, 6, 32, 4, 27], // Boom/bust
        },
      });

      const consistentProfile = buildRiskProfile(consistentPlayer, DEFAULT_RISK_SETTINGS);
      const boomBustProfile = buildRiskProfile(boomBustPlayer, DEFAULT_RISK_SETTINGS);

      expect(consistentProfile.consistencyScore).toBeGreaterThan(boomBustProfile.consistencyScore);
    });

    it('should calculate floor/ceiling from weekly variance', () => {
      const player = createMockPlayer({
        forecast: 250,
        risk: {
          age: 25,
          injuryHistory: { gamesPlayed: [17, 17, 17], currentStatus: 'healthy' },
          weeklyScores: [12, 18, 10, 22, 14, 16, 20, 15, 13, 19, 17, 11, 21, 14, 16, 18],
        },
      });

      const profile = buildRiskProfile(player, DEFAULT_RISK_SETTINGS);

      expect(profile.floor).toBeLessThan(250);
      expect(profile.ceiling).toBeGreaterThan(250);
      expect(profile.weeklyVariance).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --testPathPattern=riskProfile.test.ts`
Expected: FAIL with "Cannot find module '../riskProfile'"

**Step 3: Write minimal implementation**

Create file `app/lib/engine/riskProfile.ts`:

```typescript
/**
 * Risk profile builder - creates complete risk profiles for players.
 * Combines injury risk, consistency, and floor/ceiling calculations.
 */

import { IPlayerExtended } from '../models/Player';
import { IRiskProfile, IRiskSettings, DEFAULT_RISK_SETTINGS } from '../models/Risk';
import { calculateInjuryRisk, calculateConsistencyScore, calculateFloorCeiling } from './risk';

/**
 * Default risk profile for players without risk data
 */
const DEFAULT_RISK_PROFILE: IRiskProfile = {
  injuryScore: 50, // Moderate risk assumed
  consistencyScore: 0.7, // Moderate consistency assumed
  floor: 0, // Will be set to forecast
  ceiling: 0, // Will be set to forecast
  weeklyVariance: 0.3, // Moderate variance assumed
};

/**
 * Build a complete risk profile for a player.
 * Uses available data or falls back to defaults.
 *
 * @param player - Player with optional risk data
 * @param settings - Risk calculation settings
 * @returns Complete risk profile
 */
export const buildRiskProfile = (
  player: IPlayerExtended,
  settings: IRiskSettings = DEFAULT_RISK_SETTINGS
): IRiskProfile => {
  const forecast = player.forecast ?? 0;

  // If player has no risk data, return defaults
  if (!player.risk) {
    return {
      ...DEFAULT_RISK_PROFILE,
      floor: forecast,
      ceiling: forecast,
    };
  }

  const { age, injuryHistory, weeklyScores } = player.risk;

  // Calculate injury risk if we have injury history
  const injuryScore = injuryHistory
    ? calculateInjuryRisk(injuryHistory, age, player.pos, settings)
    : DEFAULT_RISK_PROFILE.injuryScore;

  // Calculate consistency if we have weekly scores
  const consistencyScore = weeklyScores && weeklyScores.length > 0
    ? calculateConsistencyScore(weeklyScores)
    : DEFAULT_RISK_PROFILE.consistencyScore;

  // Calculate floor/ceiling if we have weekly scores
  const { floor, ceiling, weeklyVariance } = weeklyScores && weeklyScores.length > 0
    ? calculateFloorCeiling(weeklyScores, forecast)
    : { floor: forecast, ceiling: forecast, weeklyVariance: DEFAULT_RISK_PROFILE.weeklyVariance };

  return {
    injuryScore,
    consistencyScore,
    floor,
    ceiling,
    weeklyVariance,
  };
};
```

**Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --testPathPattern=riskProfile.test.ts`
Expected: PASS - all 5 tests should pass

**Step 5: Commit**

```bash
git add app/lib/engine/riskProfile.ts app/lib/engine/__tests__/riskProfile.test.ts
git commit -m "feat(engine): add risk profile builder

- Add buildRiskProfile to create complete risk profiles
- Combines injury risk, consistency, floor/ceiling
- Falls back to sensible defaults when data unavailable
- Integrates all risk calculation functions"
```

---

## Task 7: Create Engine Index and Integration Test

**Files:**
- Create: `app/lib/engine/index.ts`
- Test: `app/lib/engine/__tests__/integration.test.ts`

**Step 1: Write the failing test**

Create file `app/lib/engine/__tests__/integration.test.ts`:

```typescript
/**
 * Integration tests for the complete risk engine
 */
import {
  calculateInjuryRisk,
  calculateConsistencyScore,
  calculateFloorCeiling,
  buildRiskProfile,
  calculateRiskAdjustedVOR,
  applyRiskTolerance,
  DEFAULT_RISK_SETTINGS,
} from '../index';
import { IPlayerExtended } from '../../models/Player';

describe('Risk Engine Integration', () => {
  const createFullPlayer = (): IPlayerExtended => ({
    index: 0,
    key: 'barkley_RB_NYG',
    name: 'Saquon Barkley',
    pos: 'RB',
    team: 'NYG',
    bye: 11,
    std: 8,
    halfPpr: 6,
    ppr: 5,
    passYds: 0,
    passTds: 0,
    passInts: 0,
    receptions: 50,
    receptionYds: 400,
    receptionTds: 2,
    rushYds: 1100,
    rushTds: 8,
    fumbles: 2,
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
    forecast: 250,
    vor: 85,
    risk: {
      age: 27,
      injuryHistory: {
        gamesPlayed: [14, 7, 16], // Injury history (ACL tear year)
        currentStatus: 'healthy',
      },
      weeklyScores: [22, 8, 28, 12, 25, 5, 30, 15, 18, 10, 24, 14, 20, 16],
    },
  });

  it('should calculate complete risk-adjusted VOR end-to-end', () => {
    const player = createFullPlayer();

    // Step 1: Build risk profile
    const riskProfile = buildRiskProfile(player, DEFAULT_RISK_SETTINGS);

    expect(riskProfile.injuryScore).toBeGreaterThan(30); // Some injury history
    expect(riskProfile.consistencyScore).toBeLessThan(0.7); // Boom/bust tendencies

    // Step 2: Calculate risk-adjusted VOR
    const result = calculateRiskAdjustedVOR(player.vor!, riskProfile, DEFAULT_RISK_SETTINGS);

    expect(result.baseVOR).toBe(85);
    expect(result.adjustedVOR).toBeLessThan(85); // Should be reduced
    expect(result.riskAdjustment).toBeLessThan(0);
  });

  it('should show conservative vs aggressive differences', () => {
    const player = createFullPlayer();
    const riskProfile = buildRiskProfile(player, DEFAULT_RISK_SETTINGS);

    const conservativeSettings = { ...DEFAULT_RISK_SETTINGS, riskTolerance: 0.2 };
    const aggressiveSettings = { ...DEFAULT_RISK_SETTINGS, riskTolerance: 0.8 };

    const conservativeVOR = applyRiskTolerance(player.vor!, riskProfile, conservativeSettings);
    const aggressiveVOR = applyRiskTolerance(player.vor!, riskProfile, aggressiveSettings);

    // Conservative should value this risky player much lower
    expect(conservativeVOR).toBeLessThan(aggressiveVOR);
    expect(aggressiveVOR - conservativeVOR).toBeGreaterThan(10); // Significant difference
  });

  it('should export all necessary functions', () => {
    // Verify all exports are available
    expect(calculateInjuryRisk).toBeDefined();
    expect(calculateConsistencyScore).toBeDefined();
    expect(calculateFloorCeiling).toBeDefined();
    expect(buildRiskProfile).toBeDefined();
    expect(calculateRiskAdjustedVOR).toBeDefined();
    expect(applyRiskTolerance).toBeDefined();
    expect(DEFAULT_RISK_SETTINGS).toBeDefined();
  });

  it('should handle player comparison scenario', () => {
    // Scenario: Comparing two RBs with similar projections but different risk
    const safeRB: IPlayerExtended = {
      ...createFullPlayer(),
      key: 'jacobs_RB_LV',
      name: 'Josh Jacobs',
      vor: 70,
      risk: {
        age: 25,
        injuryHistory: {
          gamesPlayed: [17, 16, 17],
          currentStatus: 'healthy',
        },
        weeklyScores: [14, 16, 15, 17, 14, 15, 16, 14, 17, 15, 16, 14, 15, 16, 17, 15],
      },
    };

    const riskyRB = createFullPlayer(); // Barkley with injury history

    const safeProfile = buildRiskProfile(safeRB, DEFAULT_RISK_SETTINGS);
    const riskyProfile = buildRiskProfile(riskyRB, DEFAULT_RISK_SETTINGS);

    // With conservative settings, safe RB should be valued higher despite lower base VOR
    const conservativeSettings = { ...DEFAULT_RISK_SETTINGS, riskTolerance: 0.2 };

    const safeAdjusted = applyRiskTolerance(safeRB.vor!, safeProfile, conservativeSettings);
    const riskyAdjusted = applyRiskTolerance(riskyRB.vor!, riskyProfile, conservativeSettings);

    // Safe RB (70 base) should now be close to or exceed risky RB (85 base)
    expect(riskyAdjusted - safeAdjusted).toBeLessThan(20); // Gap should narrow significantly
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --testPathPattern=integration.test.ts`
Expected: FAIL with "Cannot find module '../index'"

**Step 3: Write minimal implementation**

Create file `app/lib/engine/index.ts`:

```typescript
/**
 * Fantasy Football Draft Engine
 *
 * Exports all engine functions for risk calculation, VOR adjustment,
 * and player evaluation.
 */

// Risk calculation functions
export {
  calculateInjuryRisk,
  calculateHistoricalInjuryRate,
  calculateAgeFactor,
  calculatePositionRisk,
  calculateStatusFactor,
  calculateConsistencyScore,
  calculateFloorCeiling,
} from './risk';

// Risk profile builder
export { buildRiskProfile } from './riskProfile';

// VOR calculation functions
export {
  calculateRiskAdjustedVOR,
  applyRiskTolerance,
  IRiskAdjustedVORResult,
} from './vor';

// Re-export types and constants from models
export {
  IInjuryHistory,
  IRiskProfile,
  IRiskSettings,
  HealthStatus,
  DEFAULT_RISK_SETTINGS,
  isValidRiskProfile,
} from '../models/Risk';

export {
  IPlayerAdvanced,
  IPlayerRisk,
  IPlayerExtended,
  hasAdvancedStats,
  hasRiskProfile,
} from '../models/Player';
```

**Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --testPathPattern=integration.test.ts`
Expected: PASS - all 4 tests should pass

**Step 5: Run all engine tests**

Run: `cd app && npm test -- --testPathPattern=engine/`
Expected: PASS - all engine tests should pass

**Step 6: Commit**

```bash
git add app/lib/engine/index.ts app/lib/engine/__tests__/integration.test.ts
git commit -m "feat(engine): add engine index and integration tests

- Export all risk and VOR calculation functions
- Add integration tests for end-to-end scenarios
- Verify conservative vs aggressive risk tolerance
- Test player comparison scenarios"
```

---

## Task 8: Final Documentation and Summary Commit

**Files:**
- Modify: `docs/plans/2025-01-01-advanced-vor-phase1-risk-engine.md` (mark complete)

**Step 1: Run full test suite**

Run: `cd app && npm test -- --coverage`
Expected: All tests pass with good coverage on new engine code

**Step 2: Create summary commit**

```bash
git add -A
git commit -m "docs: complete Phase 1 - Risk & Consistency Engine

Phase 1 Implementation Summary:
- Created Risk model interfaces (IInjuryHistory, IRiskProfile, IRiskSettings)
- Built injury risk calculator with historical, age, position, and status factors
- Built consistency calculator using coefficient of variation
- Built floor/ceiling calculator using percentiles
- Created risk-adjusted VOR calculator with tolerance slider
- Extended Player model with advanced stats and risk data
- Created risk profile builder to combine all calculations
- Added comprehensive test coverage (40+ new tests)

Ready for Phase 2: Schedule Strength Engine"
```

---

## Execution Summary

| Task | Component | Tests | Status |
|------|-----------|-------|--------|
| 1 | Risk Model Interfaces | 7 | Pending |
| 2 | Risk Calculator Engine | 18 | Pending |
| 3 | Consistency Calculator | 11 | Pending |
| 4 | Risk-Adjusted VOR | 8 | Pending |
| 5 | Extended Player Model | 6 | Pending |
| 6 | Risk Profile Builder | 5 | Pending |
| 7 | Engine Index & Integration | 4 | Pending |
| 8 | Documentation | - | Pending |

**Total new tests:** ~59 tests
**Total new files:** 8 files
**Estimated commits:** 8 atomic commits

---

## Next Phase Preview

**Phase 2: Schedule Strength Engine** will include:
- Defense ranking model interfaces
- Weekly matchup rating calculator
- Playoff schedule weighting
- Bye week intelligence
- Schedule score integration with VOR
