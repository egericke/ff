# Advanced VOR Modeling - Phase 3: Dynamic Scarcity Engine

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build real-time scarcity tracking that adjusts player values as the draft progresses. When positions get picked heavily, remaining players at that position become more valuable.

**Architecture:** Track drafted players by position, calculate remaining quality supply, compute scarcity premiums, and generate drop-off alerts when position runs occur.

**Tech Stack:** TypeScript, Jest, existing engine patterns

---

## Task 1: Create Scarcity Model Interfaces

**Files:**
- Create: `app/lib/models/Scarcity.ts`
- Test: `app/lib/models/__tests__/Scarcity.test.ts`

**Interfaces to create:**

```typescript
// Position supply status
export interface IPositionSupply {
  position: Position;
  totalPlayers: number;
  draftedCount: number;
  remainingCount: number;
  tier1Remaining: number; // Elite players left
  tier2Remaining: number; // Good starters left
  tier3Remaining: number; // Flex/bench left
}

// Scarcity calculation result
export interface IScarcityPremium {
  position: Position;
  premium: number; // VOR points to add
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  message?: string;
}

// Drop-off alert
export interface IDropOffAlert {
  position: Position;
  currentTierAvgVOR: number;
  nextTierAvgVOR: number;
  dropOffPoints: number;
  picksUntilDrop: number;
  severity: 'warning' | 'critical';
}

// Scarcity settings
export interface IScarcitySettings {
  tierThresholds: { tier1: number; tier2: number }; // VOR thresholds
  premiumMultipliers: { low: number; medium: number; high: number; critical: number };
  dropOffThreshold: number; // VOR drop to trigger alert
  positionWeights: Record<Position, number>;
}

// Draft state for scarcity tracking
export interface IDraftScarcityState {
  currentPick: number;
  positionSupply: Record<Position, IPositionSupply>;
  scarcityPremiums: IScarcityPremium[];
  activeAlerts: IDropOffAlert[];
}
```

**Tests:**
- IPositionSupply structure validation
- IScarcityPremium severity levels
- IDropOffAlert structure
- DEFAULT_SCARCITY_SETTINGS values
- isValidScarcityState type guard

---

## Task 2: Create Scarcity Calculator

**Files:**
- Create: `app/lib/engine/scarcity.ts`
- Test: `app/lib/engine/__tests__/scarcity.test.ts`

**Functions to create:**

```typescript
// Calculate position supply from player pool
export function calculatePositionSupply(
  players: IPlayerExtended[],
  draftedKeys: Set<string>,
  position: Position,
  settings: IScarcitySettings
): IPositionSupply;

// Calculate scarcity premium for a position
export function calculateScarcityPremium(
  supply: IPositionSupply,
  expectedStarters: number,
  settings: IScarcitySettings
): IScarcityPremium;

// Calculate all scarcity premiums
export function calculateAllScarcityPremiums(
  players: IPlayerExtended[],
  draftedKeys: Set<string>,
  rosterFormat: IRoster,
  numberOfTeams: number,
  settings: IScarcitySettings
): IScarcityPremium[];

// Apply scarcity premium to player VOR
export function applyScarcityPremium(
  baseVOR: number,
  position: Position,
  premiums: IScarcityPremium[]
): number;
```

**Tests:**
- Supply calculation with drafted players
- Premium increases as position depletes
- Critical severity when supply is very low
- No premium when plenty of supply
- Apply premium correctly to VOR

---

## Task 3: Create Drop-off Alert System

**Files:**
- Modify: `app/lib/engine/scarcity.ts`
- Modify: `app/lib/engine/__tests__/scarcity.test.ts`

**Functions to add:**

```typescript
// Detect position tier drop-offs
export function detectDropOffs(
  players: IPlayerExtended[],
  draftedKeys: Set<string>,
  settings: IScarcitySettings
): IDropOffAlert[];

// Get picks until next tier for a position
export function getPicksUntilTierDrop(
  players: IPlayerExtended[],
  draftedKeys: Set<string>,
  position: Position,
  settings: IScarcitySettings
): number;
```

**Tests:**
- Detect when major VOR cliff approaching
- Calculate correct picks until drop
- Critical alert when cliff is imminent
- No alerts when position depth is good

---

## Task 4: Scarcity Integration

**Files:**
- Modify: `app/lib/engine/index.ts`
- Create: `app/lib/engine/__tests__/scarcityIntegration.test.ts`

**Integration tests:**
- Full draft simulation showing scarcity impact
- RB run scenario increases remaining RB value
- QB ignored scenario keeps QB values stable
- Drop-off alerts trigger at correct times

---

## Execution Summary

| Task | Component | Tests |
|------|-----------|-------|
| 1 | Scarcity Model Interfaces | 12 |
| 2 | Scarcity Calculator | 15 |
| 3 | Drop-off Alert System | 10 |
| 4 | Scarcity Integration | 8 |

**Total new tests:** ~45 tests
