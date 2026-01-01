# Advanced VOR Modeling - Phase 4: Unified VOR & Recommendations

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Combine all VOR components (base, risk-adjusted, schedule, scarcity) into a unified enhanced VOR system with player recommendations.

**Architecture:** Create a single `calculateEnhancedVOR` function that combines all adjustments. Build a recommendation engine that ranks players by enhanced VOR with context-aware sorting.

**Tech Stack:** TypeScript, Jest, existing engine patterns

---

## Task 1: Create Enhanced VOR Interfaces

**Files:**
- Create: `app/lib/models/EnhancedVOR.ts`
- Test: `app/lib/models/__tests__/EnhancedVOR.test.ts`

**Interfaces:**

```typescript
// Complete VOR breakdown
export interface IEnhancedVOR {
  playerId: string;
  playerName: string;
  position: Position;

  // Base values
  baseVOR: number;
  forecast: number;

  // Adjustments
  riskAdjustment: number;
  scheduleAdjustment: number;
  scarcityPremium: number;

  // Final value
  enhancedVOR: number;

  // Rankings
  overallRank: number;
  positionRank: number;
  adpDiff: number; // Your rank - ADP rank (positive = value)
}

// Player recommendation
export interface IPlayerRecommendation {
  player: IPlayerExtended;
  enhancedVOR: IEnhancedVOR;
  reasons: string[];
  urgency: 'must-draft' | 'high' | 'medium' | 'low';
  valueIndicator: 'steal' | 'good-value' | 'fair' | 'reach' | 'avoid';
}

// Recommendation settings
export interface IRecommendationSettings {
  topNPlayers: number;
  adpValueThreshold: number; // ADP diff for "steal"
  urgencyThresholds: { mustDraft: number; high: number; medium: number };
}

export const DEFAULT_RECOMMENDATION_SETTINGS: IRecommendationSettings = {
  topNPlayers: 5,
  adpValueThreshold: 15,
  urgencyThresholds: { mustDraft: 30, high: 20, medium: 10 },
};
```

---

## Task 2: Create Unified VOR Calculator

**Files:**
- Create: `app/lib/engine/enhancedVOR.ts`
- Test: `app/lib/engine/__tests__/enhancedVOR.test.ts`

**Functions:**

```typescript
// Calculate complete enhanced VOR for a player
export function calculateEnhancedVOR(
  player: IPlayerExtended,
  riskSettings: IRiskSettings,
  scheduleScore: number,
  scarcityPremium: number,
  adpRank: number
): IEnhancedVOR;

// Calculate enhanced VOR for all players
export function calculateAllEnhancedVORs(
  players: IPlayerExtended[],
  draftedKeys: Set<string>,
  riskSettings: IRiskSettings,
  scarcitySettings: IScarcitySettings,
  scheduleSettings: IScheduleSettings,
  rosterFormat: IRoster,
  numberOfTeams: number
): IEnhancedVOR[];

// Get player with all adjustments applied
export function getPlayerWithEnhancedVOR(
  player: IPlayerExtended,
  enhancedVOR: IEnhancedVOR
): IPlayerExtended & { enhancedVOR: IEnhancedVOR };
```

---

## Task 3: Create Recommendation Engine

**Files:**
- Create: `app/lib/engine/recommendations.ts`
- Test: `app/lib/engine/__tests__/recommendations.test.ts`

**Functions:**

```typescript
// Get top player recommendations
export function getTopRecommendations(
  enhancedVORs: IEnhancedVOR[],
  players: IPlayerExtended[],
  draftedKeys: Set<string>,
  neededPositions: Position[],
  settings: IRecommendationSettings
): IPlayerRecommendation[];

// Determine value indicator based on ADP diff
export function getValueIndicator(adpDiff: number, settings: IRecommendationSettings): string;

// Determine urgency based on scarcity and drop-offs
export function getUrgency(
  enhancedVOR: IEnhancedVOR,
  alerts: IDropOffAlert[],
  settings: IRecommendationSettings
): string;

// Generate recommendation reasons
export function generateReasons(
  enhancedVOR: IEnhancedVOR,
  alerts: IDropOffAlert[],
  neededPositions: Position[]
): string[];
```

---

## Task 4: Enhanced VOR Integration

**Files:**
- Modify: `app/lib/engine/index.ts`
- Create: `app/lib/engine/__tests__/enhancedVORIntegration.test.ts`

**Integration tests:**
- Full pipeline from players to recommendations
- Verify all adjustments applied correctly
- Recommendations sorted by enhanced VOR
- Urgency and value indicators correct
- Export verification

---

## Execution Summary

| Task | Component | Tests |
|------|-----------|-------|
| 1 | Enhanced VOR Interfaces | 12 |
| 2 | Unified VOR Calculator | 15 |
| 3 | Recommendation Engine | 15 |
| 4 | Integration Tests | 10 |

**Total new tests:** ~52 tests
