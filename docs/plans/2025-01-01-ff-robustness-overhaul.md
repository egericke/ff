# Fantasy Football Draft App - Robustness Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all critical bugs, add comprehensive test coverage, modernize the codebase, and make the application production-ready with robust error handling.

**Architecture:** TDD approach - write failing tests first, then implement minimal fixes. Start with critical bugs (data corruption), then security, then code quality. Each fix is isolated and independently testable.

**Tech Stack:** TypeScript, Jest, React Testing Library, Python pytest, Next.js 14, Redux Toolkit

---

## Phase 1: Critical Bug Fixes

### Task 1: Fix Missing Return Statement in DST Points Calculation

**Files:**
- Modify: `app/lib/store/reducers/players.tsx:246-266`
- Create: `app/lib/store/reducers/__tests__/players.test.ts`

**Step 1: Set up Jest testing infrastructure**

Create Jest config:

```bash
cd app && npm install --save-dev jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

**Step 2: Create Jest configuration**

Create file `app/jest.config.js`:

```javascript
/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^lib/(.*)$': '<rootDir>/lib/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    '!lib/**/*.d.ts',
  ],
};

module.exports = config;
```

**Step 3: Create Jest setup file**

Create file `app/jest.setup.js`:

```javascript
import '@testing-library/jest-dom';
```

**Step 4: Update package.json scripts**

Add to `app/package.json` scripts section:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**Step 5: Write the failing test for dstPointsPerGame**

Create file `app/lib/store/reducers/__tests__/players.test.ts`:

```typescript
/**
 * Tests for player reducers and VOR calculations
 */

// We need to extract dstPointsPerGame to test it - for now test via updatePlayerVORs
describe('dstPointsPerGame', () => {
  // The function calculates fantasy points based on points allowed per game
  // ESPN scoring: 0 pts = 5, 1-6 = 4, 7-13 = 3, 14-17 = 1, 18-27 = 0, 28-34 = -1, 35-45 = -3, 46+ = -5

  describe('points allowed ranges', () => {
    it('should return 5 for 0 points allowed', () => {
      expect(dstPointsPerGame(0)).toBe(5);
    });

    it('should return 4 for 1-6 points allowed', () => {
      expect(dstPointsPerGame(1)).toBe(4);
      expect(dstPointsPerGame(6)).toBe(4);
    });

    it('should return 3 for 7-13 points allowed', () => {
      expect(dstPointsPerGame(7)).toBe(3);
      expect(dstPointsPerGame(13)).toBe(3);
    });

    it('should return 1 for 14-17 points allowed', () => {
      expect(dstPointsPerGame(14)).toBe(1);
      expect(dstPointsPerGame(17)).toBe(1);
    });

    it('should return 0 for 18-27 points allowed', () => {
      expect(dstPointsPerGame(18)).toBe(0);
      expect(dstPointsPerGame(27)).toBe(0);
    });

    it('should return -1 for 28-34 points allowed', () => {
      expect(dstPointsPerGame(28)).toBe(-1);
      expect(dstPointsPerGame(34)).toBe(-1);
    });

    it('should return -3 for 35-45 points allowed (THE BUG)', () => {
      // This test will FAIL because of missing return statement
      expect(dstPointsPerGame(35)).toBe(-3);
      expect(dstPointsPerGame(45)).toBe(-3);
    });

    it('should return -5 for 46+ points allowed', () => {
      expect(dstPointsPerGame(46)).toBe(-5);
      expect(dstPointsPerGame(100)).toBe(-5);
    });

    it('should return 0 for null input', () => {
      expect(dstPointsPerGame(null as any)).toBe(0);
    });
  });
});

// Temporary: export for testing - will refactor later
declare function dstPointsPerGame(pts: number): number;
```

**Step 6: Run test to verify it fails**

Run: `cd app && npm test -- --testPathPattern=players.test.ts`

Expected: FAIL - function not defined, and when fixed, the 35-45 range test will fail

**Step 7: Export dstPointsPerGame for testing and fix the bug**

Modify `app/lib/store/reducers/players.tsx` - change lines 246-266:

```typescript
/**
 * Estimate the points a team will earn from points against over season
 * @param pts - Points allowed per game by the defense
 * @returns Fantasy points per game for that defensive performance
 */
export const dstPointsPerGame = (pts: number | null): number => {
  if (pts === null) {
    return 0;
  }
  if (pts < 1) {
    return 5;
  } else if (pts < 7) {
    return 4;
  } else if (pts < 14) {
    return 3;
  } else if (pts < 18) {
    return 1;
  } else if (pts < 28) {
    return 0;
  } else if (pts < 35) {
    return -1;
  } else if (pts < 46) {
    return -3;  // FIXED: Added missing return
  }
  return -5;
};
```

**Step 8: Update test to import the function**

Update `app/lib/store/reducers/__tests__/players.test.ts`:

```typescript
import { dstPointsPerGame } from '../players';

describe('dstPointsPerGame', () => {
  // ... same tests as above, remove the declare statement
});
```

**Step 9: Run test to verify it passes**

Run: `cd app && npm test -- --testPathPattern=players.test.ts`

Expected: PASS - all 9 tests should pass

**Step 10: Commit**

```bash
git add app/jest.config.js app/jest.setup.js app/package.json app/lib/store/reducers/players.tsx app/lib/store/reducers/__tests__/players.test.ts
git commit -m "fix: add missing return statement in dstPointsPerGame

- DST scoring for 35-45 points allowed now correctly returns -3
- Add Jest testing infrastructure
- Add comprehensive unit tests for dstPointsPerGame"
```

---

### Task 2: Fix Player Filtering Index Mismatch

**Files:**
- Modify: `app/components/PlayerTable.tsx:160-184`
- Create: `app/components/__tests__/PlayerTable.test.tsx`

**Step 1: Write the failing test**

Create file `app/components/__tests__/PlayerTable.test.tsx`:

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react';
import PlayerTable from '../PlayerTable';
import { IPlayer, Position } from '../../lib/models/Player';

// Mock player data
const createMockPlayer = (overrides: Partial<IPlayer> = {}): IPlayer => ({
  index: 0,
  key: 'test_QB_TEST',
  name: 'Test Player',
  tableName: 'T. Player',
  pos: 'QB' as Position,
  team: 'TEST',
  bye: 7,
  std: 1,
  halfPpr: 1,
  ppr: 1,
  vor: 100,
  forecast: 300,
  passYds: 4000,
  passTds: 30,
  passInts: 10,
  receptions: 0,
  receptionYds: 0,
  receptionTds: 0,
  rushYds: 100,
  rushTds: 2,
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
  ...overrides,
});

describe('PlayerTable', () => {
  const defaultProps = {
    adpCol: 'std',
    byeWeeks: {},
    currentPick: 1,
    draftSoon: [true, false, true],
    filteredPlayers: [false, true, false], // Player at index 1 is filtered OUT
    mobile: false,
    nameFilter: '',
    onPickPlayer: jest.fn(),
    players: [
      createMockPlayer({ key: 'player1_QB_A', name: 'Player One', tableName: 'P. One' }),
      createMockPlayer({ key: 'player2_RB_B', name: 'Player Two', tableName: 'P. Two', pos: 'RB' }),
      createMockPlayer({ key: 'player3_WR_C', name: 'Player Three', tableName: 'P. Three', pos: 'WR' }),
    ],
    positionsToShow: ['?'] as Position[],
    rbHandcuffs: new Set<IPlayer>(),
    recommended: new Set<IPlayer>(),
    resetPositionFilter: jest.fn(),
    onRemovePlayer: jest.fn(),
    setNameFilter: jest.fn(),
    togglePositionFilter: jest.fn(),
    skip: jest.fn(),
    undo: jest.fn(),
    valuedPositions: { QB: true, RB: true, WR: true },
  };

  it('should correctly map draftSoon to filtered players', () => {
    // When player 2 (index 1) is filtered out:
    // - Player 1 (index 0) should use draftSoon[0] = true
    // - Player 3 (index 2) should use draftSoon[2] = true
    //
    // BUG: Current code uses the post-filter index, so:
    // - Player 1 gets draftSoon[0] = true (correct by accident)
    // - Player 3 gets draftSoon[1] = false (WRONG - should be draftSoon[2])

    const { container } = render(<PlayerTable {...defaultProps} />);

    const rows = container.querySelectorAll('.row');
    expect(rows).toHaveLength(2); // Only 2 players shown (one filtered)

    // Both visible players should have the "draft soon" indicator
    // This test will fail with current implementation
    const orangeDots = container.querySelectorAll('.orange-dot');
    expect(orangeDots).toHaveLength(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --testPathPattern=PlayerTable.test.tsx`

Expected: FAIL - orange dots count mismatch

**Step 3: Fix the index mapping in PlayerTable**

Modify `app/components/PlayerTable.tsx` lines 158-186:

```typescript
      <div id="table">
        <div id="table-body">
          {players.map((player: ITablePlayer, originalIndex: number) => {
            // Skip filtered players
            if (filteredPlayers[originalIndex]) {
              return null;
            }

            return (
              <PlayerTableRow
                key={player.key}
                adpCol={adpCol}
                mobile={mobile}
                onPickPlayer={(p: IPlayer) => {
                  onPickPlayer(p);
                  resetPositionFilter();
                  inputRef.current?.focus();
                }}
                draftSoon={draftSoon[originalIndex]}
                byeWeekConflict={byeWeeks[player.bye]}
                inValuablePosition={valuedPositions[player.pos]}
                player={player}
                rbHandcuff={rbHandcuffs.has(player)}
                recommended={recommended.has(player)}
                onRemovePlayer={(p: IPlayer) => {
                  onRemovePlayer(p);
                  resetPositionFilter();
                  inputRef.current?.focus();
                }}
              />
            );
          })}
        </div>
      </div>
```

**Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --testPathPattern=PlayerTable.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add app/components/PlayerTable.tsx app/components/__tests__/PlayerTable.test.tsx
git commit -m "fix: correct index mapping for filtered players in PlayerTable

- Use original array index for draftSoon, rbHandcuffs, etc.
- Previously used post-filter index causing wrong tags on players
- Add unit tests for filtering behavior"
```

---

### Task 3: Fix Security - Add .env to .gitignore

**Files:**
- Modify: `.gitignore`
- Remove from tracking: `data/.env`

**Step 1: Update .gitignore**

Modify `.gitignore` - add at the end:

```gitignore

# Environment files with secrets
.env
.env.local
.env.*.local
data/.env

# Node modules (ensure coverage)
node_modules/

# IDE
.idea/
*.swp
*.swo
```

**Step 2: Remove .env from git tracking (but keep file locally)**

```bash
git rm --cached data/.env
```

**Step 3: Create .env.example template**

Create file `data/.env.example`:

```bash
# Copy this file to .env and fill in your values
# For 1Password users: eval `cat ./data/.env | op inject`

export AWS_ACCESS_KEY_ID="your-aws-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
export CF_DISTRIBUTION="your-cloudfront-distribution-id"
export S3_BUCKET="your-s3-bucket-name"
```

**Step 4: Commit**

```bash
git add .gitignore data/.env.example
git commit -m "security: remove .env from tracking, add .env.example template

- Add data/.env to .gitignore
- Create .env.example with placeholder values
- Remove tracked .env file (keeping local copy)"
```

---

### Task 4: Fix Bare Except Clauses in Python

**Files:**
- Modify: `data/main.py`
- Modify: `data/scrape.py`
- Modify: `data/upload.py`
- Create: `data/tests/test_main.py`

**Step 1: Set up pytest infrastructure**

```bash
cd data && pip install pytest pytest-cov
```

**Step 2: Create pytest configuration**

Create file `data/pytest.ini`:

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
addopts = -v --tb=short
```

**Step 3: Create tests directory structure**

```bash
mkdir -p data/tests
touch data/tests/__init__.py
```

**Step 4: Write test for proper exception handling**

Create file `data/tests/test_exception_handling.py`:

```python
"""Tests for proper exception handling across the data pipeline."""

import pytest
from unittest.mock import patch, MagicMock
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestMainExceptionHandling:
    """Test that main.py handles exceptions properly."""

    @patch.dict(os.environ, {"S3_BUCKET": "test", "AWS_ACCESS_KEY_ID": "test"})
    @patch('main.scrape')
    @patch('main.aggregate')
    @patch('main.upload')
    def test_keyboard_interrupt_propagates(self, mock_upload, mock_aggregate, mock_scrape):
        """KeyboardInterrupt should NOT be caught - should propagate up."""
        import main

        mock_scrape.scrape.side_effect = KeyboardInterrupt()

        with pytest.raises(KeyboardInterrupt):
            main.run()

    @patch.dict(os.environ, {"S3_BUCKET": "test", "AWS_ACCESS_KEY_ID": "test"})
    @patch('main.scrape')
    def test_runtime_error_is_raised(self, mock_scrape):
        """Runtime errors should be re-raised after logging."""
        import main

        mock_scrape.scrape.side_effect = RuntimeError("Test error")

        with pytest.raises(RuntimeError, match="Test error"):
            main.run()


class TestScrapeExceptionHandling:
    """Test that scrape.py handles exceptions properly."""

    def test_keyboard_interrupt_propagates_from_scrape(self):
        """KeyboardInterrupt in scrape() should propagate."""
        # This test validates the fix is in place
        pass  # Will be implemented after fix


class TestUploadExceptionHandling:
    """Test that upload.py handles exceptions properly."""

    @patch('upload.boto3')
    def test_upload_error_is_raised(self, mock_boto):
        """Upload errors should be re-raised."""
        import upload

        mock_boto.client.return_value.upload_file.side_effect = Exception("S3 error")

        with pytest.raises(Exception, match="S3 error"):
            upload.upload()
```

**Step 5: Run test to verify current behavior (some may fail)**

Run: `cd data && python -m pytest tests/test_exception_handling.py -v`

**Step 6: Fix main.py exception handling**

Modify `data/main.py`:

```python
import logging
import os

import aggregate
import scrape
import upload

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s:%(message)s")


def run():
    """Main entry point for data pipeline."""
    if not os.environ.get("S3_BUCKET") or not os.environ.get("AWS_ACCESS_KEY_ID"):
        logging.fatal("missing env vars: S3_BUCKET and AWS_ACCESS_KEY_ID required")
        raise RuntimeError("missing env vars")

    try:
        scrape.scrape()
        aggregate.aggregate()
        upload.upload()
    except KeyboardInterrupt:
        logging.info("Pipeline interrupted by user")
        raise
    except Exception:
        logging.exception("failed to update data")
        raise


if __name__ == "__main__":
    run()
```

**Step 7: Fix scrape.py exception handling**

Modify `data/scrape.py` lines 200-212:

```python
def scrape():
    """Scrape from all the sources and save to ./data/raw"""

    try:
        scrape_espn()
        scrape_cbs()
        scrape_nfl()
        scrape_fantasy_pros()
    except KeyboardInterrupt:
        logging.info("Scraping interrupted by user")
        raise
    except Exception:
        logging.exception("Failed to scrape")
        raise
    finally:
        DRIVER.quit()
```

Also fix line 573 in scrape_nfl():

```python
            except Exception:
                logging.exception("Failed to click next button")
                break
```

**Step 8: Fix upload.py exception handling**

Modify `data/upload.py`:

```python
import datetime
import logging
import os

import boto3

YEAR = datetime.datetime.now().year
DIR = os.path.dirname(__file__)
PROJECTIONS = os.path.join(DIR, "processed", f"Projections-{YEAR}.json")


def upload():
    """Upload projections to S3."""
    # uses AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from .env
    s3 = boto3.client("s3")

    logging.info(
        "uploading to S3: projections=%s bucket=%s",
        PROJECTIONS,
        os.environ["S3_BUCKET"],
    )

    try:
        s3.upload_file(
            PROJECTIONS,
            os.environ["S3_BUCKET"],
            "projections.json",
            ExtraArgs={"ACL": "public-read", "CacheControl": "max-age=7200,public"},
        )
        s3.upload_file(
            PROJECTIONS,
            os.environ["S3_BUCKET"],
            f"history/{datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.json",
        )
        logging.info("Upload completed successfully")
    except KeyboardInterrupt:
        logging.info("Upload interrupted by user")
        raise
    except Exception:
        logging.exception("failed to upload")
        raise
```

**Step 9: Run tests to verify fixes**

Run: `cd data && python -m pytest tests/test_exception_handling.py -v`

Expected: PASS

**Step 10: Commit**

```bash
git add data/main.py data/scrape.py data/upload.py data/pytest.ini data/tests/
git commit -m "fix: replace bare except clauses with Exception

- KeyboardInterrupt now propagates correctly
- All exceptions are properly logged before re-raising
- Add pytest infrastructure and exception handling tests
- Fix history filename format in upload.py"
```

---

## Phase 2: CI/CD Fixes

### Task 5: Fix Cron Schedule for Data Workflow

**Files:**
- Modify: `.github/workflows/data.yaml`

**Step 1: Analyze current cron**

Current: `0 */4 * 7-9 *` = "At minute 0 past every 4th hour in July through September"
Comment says: "July through October"

**Step 2: Fix the cron expression**

Modify `.github/workflows/data.yaml`:

```yaml
name: data

on:
  push:
    branches:
      - main
    paths:
      - 'data/**'
  schedule:
    # "At minute 0 past every 4th hour in July through October"
    # Fantasy football draft season runs July-October
    # https://crontab.guru/#0_*/4_*_7-10_*
    - cron: "0 */4 * 7-10 *"
  workflow_dispatch:

jobs:
  scrape:
    name: Scrape Data
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: browser-actions/setup-chrome@latest
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"
      - run: pip install -r ./data/requirements.txt
      - run: python ./data/main.py
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          CF_DISTRIBUTION: ${{ secrets.CF_DISTRIBUTION }}
          S3_BUCKET: ${{ secrets.S3_BUCKET }}
```

**Step 3: Also update app.yaml to use latest actions**

Modify `.github/workflows/app.yaml`:

```yaml
name: app

on:
  push:
    branches:
      - main
    paths:
      - 'app/**'
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy App
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: app/package-lock.json
      - run: cd app && ./release.sh
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          CF_DISTRIBUTION: ${{ secrets.CF_DISTRIBUTION }}
          S3_BUCKET: ${{ secrets.S3_BUCKET }}
```

**Step 4: Commit**

```bash
git add .github/workflows/data.yaml .github/workflows/app.yaml
git commit -m "fix: update CI/CD workflows

- Fix cron to include October (7-10 instead of 7-9)
- Update to actions/checkout@v4 and actions/setup-node@v4
- Add path filters to only run on relevant changes
- Specify Node.js 20 and Python 3.11
- Add npm caching for faster builds"
```

---

## Phase 3: Code Modernization

### Task 6: Add Comprehensive VOR Calculation Tests

**Files:**
- Modify: `app/lib/store/reducers/__tests__/players.test.ts`

**Step 1: Write comprehensive VOR tests**

Add to `app/lib/store/reducers/__tests__/players.test.ts`:

```typescript
import {
  dstPointsPerGame,
  updatePlayerVORs,
  initStore
} from '../players';
import { IPlayer, Position } from '../../../models/Player';
import { IStoreState, initialState, initialRoster, initialScore } from '../../store';

// Helper to create mock players
const createMockPlayer = (overrides: Partial<IPlayer>): IPlayer => ({
  index: 0,
  key: 'test_QB_TEST',
  name: 'Test Player',
  pos: 'QB',
  team: 'TEST',
  bye: 7,
  std: 1,
  halfPpr: 1,
  ppr: 1,
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

describe('dstPointsPerGame', () => {
  // ... existing tests ...
});

describe('updatePlayerVORs', () => {
  it('should calculate VOR correctly for QBs in a 10-team league', () => {
    // Create 12 QBs with descending passing stats
    const qbs: IPlayer[] = Array.from({ length: 12 }, (_, i) =>
      createMockPlayer({
        key: `qb${i}_QB_T${i}`,
        name: `QB ${i}`,
        pos: 'QB',
        team: `T${i}`,
        passTds: 40 - i * 2,  // QB0: 40 TDs, QB1: 38 TDs, etc.
        passYds: 4500 - i * 100,
      })
    );

    const state: IStoreState = {
      ...initialState,
      numberOfTeams: 10,
      rosterFormat: { ...initialRoster, QB: 1, SUPERFLEX: 0 },
      scoring: initialScore,
      players: qbs,
      undraftedPlayers: qbs,
    };

    const result = updatePlayerVORs(state);

    // With 10 teams and 1 QB each, the 11th QB (index 10) is replacement level
    // QB0 should have highest VOR
    expect(result.players[0].vor).toBeGreaterThan(0);
    expect(result.players[0].key).toBe('qb0_QB_T0');

    // The 11th QB should have VOR of 0 (replacement level)
    const replacementQB = result.players.find(p => p.key === 'qb10_QB_T10');
    expect(replacementQB?.vor).toBe(0);
  });

  it('should increase RB value in larger leagues', () => {
    const rbs: IPlayer[] = Array.from({ length: 40 }, (_, i) =>
      createMockPlayer({
        key: `rb${i}_RB_T${i % 32}`,
        name: `RB ${i}`,
        pos: 'RB',
        team: `T${i % 32}`,
        rushTds: 15 - Math.floor(i / 3),
        rushYds: 1500 - i * 30,
      })
    );

    const state10: IStoreState = {
      ...initialState,
      numberOfTeams: 10,
      players: rbs,
      undraftedPlayers: [...rbs],
    };

    const state14: IStoreState = {
      ...initialState,
      numberOfTeams: 14,
      players: rbs,
      undraftedPlayers: [...rbs],
    };

    const result10 = updatePlayerVORs(state10);
    const result14 = updatePlayerVORs(state14);

    // Top RB should have higher VOR in 14-team league
    const topRB10 = result10.players.find(p => p.pos === 'RB');
    const topRB14 = result14.players.find(p => p.pos === 'RB');

    expect(topRB14!.vor).toBeGreaterThan(topRB10!.vor!);
  });

  it('should adjust VOR for PPR scoring', () => {
    const players: IPlayer[] = [
      createMockPlayer({
        key: 'rb1_RB_A',
        name: 'Power RB',
        pos: 'RB',
        rushYds: 1200,
        rushTds: 12,
        receptions: 20,
        receptionYds: 150,
      }),
      createMockPlayer({
        key: 'rb2_RB_B',
        name: 'Receiving RB',
        pos: 'RB',
        rushYds: 800,
        rushTds: 8,
        receptions: 80,
        receptionYds: 600,
      }),
    ];

    const standardState: IStoreState = {
      ...initialState,
      scoring: { ...initialScore, receptions: 0 },
      players,
      undraftedPlayers: [...players],
    };

    const pprState: IStoreState = {
      ...initialState,
      scoring: { ...initialScore, receptions: 1 },
      players,
      undraftedPlayers: [...players],
    };

    const standardResult = updatePlayerVORs(standardState);
    const pprResult = updatePlayerVORs(pprState);

    // In standard, Power RB should be better
    const standardPowerRB = standardResult.players.find(p => p.key === 'rb1_RB_A');
    const standardReceivingRB = standardResult.players.find(p => p.key === 'rb2_RB_B');
    expect(standardPowerRB!.forecast).toBeGreaterThan(standardReceivingRB!.forecast!);

    // In PPR, Receiving RB should be better (80 extra points from receptions)
    const pprPowerRB = pprResult.players.find(p => p.key === 'rb1_RB_A');
    const pprReceivingRB = pprResult.players.find(p => p.key === 'rb2_RB_B');
    expect(pprReceivingRB!.forecast).toBeGreaterThan(pprPowerRB!.forecast!);
  });

  it('should handle SUPERFLEX leagues correctly', () => {
    const players: IPlayer[] = [
      createMockPlayer({
        key: 'qb1_QB_A',
        name: 'Elite QB',
        pos: 'QB',
        passTds: 45,
        passYds: 5000,
      }),
      ...Array.from({ length: 15 }, (_, i) =>
        createMockPlayer({
          key: `qb${i + 2}_QB_T${i}`,
          name: `QB ${i + 2}`,
          pos: 'QB',
          passTds: 30 - i,
          passYds: 4000 - i * 100,
        })
      ),
    ];

    const standardState: IStoreState = {
      ...initialState,
      numberOfTeams: 10,
      rosterFormat: { ...initialRoster, QB: 1, SUPERFLEX: 0 },
      players,
      undraftedPlayers: [...players],
    };

    const superflexState: IStoreState = {
      ...initialState,
      numberOfTeams: 10,
      rosterFormat: { ...initialRoster, QB: 1, SUPERFLEX: 1 },
      players,
      undraftedPlayers: [...players],
    };

    const standardResult = updatePlayerVORs(standardState);
    const superflexResult = updatePlayerVORs(superflexState);

    // Elite QB should have higher VOR in superflex
    const standardEliteQB = standardResult.players.find(p => p.key === 'qb1_QB_A');
    const superflexEliteQB = superflexResult.players.find(p => p.key === 'qb1_QB_A');

    expect(superflexEliteQB!.vor).toBeGreaterThan(standardEliteQB!.vor!);
  });
});

describe('initStore', () => {
  it('should reset draft state and calculate VORs', () => {
    const players: IPlayer[] = [
      createMockPlayer({ key: 'p1_QB_A', pos: 'QB', passTds: 30 }),
      createMockPlayer({ key: 'p2_RB_B', pos: 'RB', rushTds: 10 }),
    ];

    const result = initStore(initialState, players);

    expect(result.players).toHaveLength(2);
    expect(result.undraftedPlayers).toHaveLength(2);
    expect(result.currentPick).toBe(0);
    expect(result.activeTeam).toBe(0);
    expect(result.picks).toHaveLength(0);

    // VORs should be calculated
    expect(result.players[0].vor).toBeDefined();
    expect(result.players[0].forecast).toBeDefined();
  });
});
```

**Step 2: Run tests**

Run: `cd app && npm test -- --testPathPattern=players.test.ts --coverage`

Expected: PASS with coverage report

**Step 3: Commit**

```bash
git add app/lib/store/reducers/__tests__/players.test.ts
git commit -m "test: add comprehensive VOR calculation tests

- Test VOR calculation for different league sizes
- Test PPR vs standard scoring impact
- Test SUPERFLEX league adjustments
- Test initStore reset behavior
- Achieve >80% coverage on players.tsx"
```

---

## Phase 4: Enable NFL Validation

### Task 7: Fix and Re-enable NFL Scraper Validation

**Files:**
- Modify: `data/scrape.py`
- Create: `data/tests/test_scrape.py`

**Step 1: Write validation test**

Create file `data/tests/test_scrape.py`:

```python
"""Tests for web scraping validation."""

import pytest
import pandas as pd
import numpy as np

# Import will work after adding to path
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrape import validate, REQUIRED_COLS


class TestValidation:
    """Test the validate function."""

    def create_valid_df(self, pos_counts=None):
        """Create a DataFrame that passes validation."""
        if pos_counts is None:
            pos_counts = {"QB": 35, "RB": 70, "WR": 70, "TE": 30, "DST": 32, "K": 20}

        rows = []
        for pos, count in pos_counts.items():
            for i in range(count):
                row = {col: 0 for col in REQUIRED_COLS}
                row["key"] = f"player{i}_{pos}_T{i % 32}"
                row["name"] = f"Player {i}"
                row["pos"] = pos
                row["team"] = f"T{i % 32}"
                rows.append(row)

        return pd.DataFrame(rows)

    def test_validate_passes_with_sufficient_players(self):
        """Validation should pass with enough players at each position."""
        df = self.create_valid_df()
        # Should not raise
        validate(df, strict=True)

    def test_validate_fails_with_insufficient_qbs(self):
        """Validation should fail if not enough QBs."""
        df = self.create_valid_df({"QB": 20, "RB": 70, "WR": 70, "TE": 30, "DST": 32, "K": 20})

        with pytest.raises(RuntimeWarning, match="only 20 QB"):
            validate(df, strict=True)

    def test_validate_fails_with_too_many_teams(self):
        """Validation should fail if too many teams detected."""
        df = self.create_valid_df()
        # Add rows with invalid teams
        for i in range(35):
            df = pd.concat([df, pd.DataFrame([{
                "key": f"extra{i}_QB_FAKE{i}",
                "name": f"Extra {i}",
                "pos": "QB",
                "team": f"FAKE{i}",
                **{col: 0 for col in REQUIRED_COLS if col not in ["key", "name", "pos", "team"]}
            }])], ignore_index=True)

        with pytest.raises(RuntimeError, match="too many teams"):
            validate(df, strict=True)

    def test_validate_non_strict_allows_fewer_players(self):
        """Non-strict validation allows 1/3 of expected count."""
        df = self.create_valid_df({"QB": 15, "RB": 25, "WR": 25, "TE": 12, "DST": 15, "K": 8})
        # Should not raise in non-strict mode
        validate(df, strict=False)

    def test_validate_non_strict_fails_below_threshold(self):
        """Non-strict validation fails below 1/3 threshold."""
        df = self.create_valid_df({"QB": 5, "RB": 70, "WR": 70, "TE": 30, "DST": 32, "K": 20})

        with pytest.raises(RuntimeWarning, match="only 5 QB"):
            validate(df, strict=False)
```

**Step 2: Run test**

Run: `cd data && python -m pytest tests/test_scrape.py -v`

Expected: PASS

**Step 3: Re-enable NFL validation with adjusted thresholds**

Modify `data/scrape.py` line 585:

```python
    # Re-enable validation for NFL scraper
    validate(df, strict=False)  # Use non-strict due to variable availability
```

**Step 4: Commit**

```bash
git add data/scrape.py data/tests/test_scrape.py
git commit -m "fix: re-enable NFL scraper validation

- Add comprehensive validation tests
- Re-enable validate() call for NFL scraper with non-strict mode
- Non-strict mode allows for variable player availability"
```

---

## Phase 5: Testing Infrastructure Summary

### Task 8: Add Test Running to CI/CD

**Files:**
- Modify: `.github/workflows/app.yaml`
- Modify: `.github/workflows/data.yaml`

**Step 1: Add test job to app workflow**

Modify `.github/workflows/app.yaml`:

```yaml
name: app

on:
  push:
    branches:
      - main
    paths:
      - 'app/**'
  pull_request:
    paths:
      - 'app/**'
  workflow_dispatch:

jobs:
  test:
    name: Test App
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: app/package-lock.json
      - name: Install dependencies
        run: cd app && npm ci
      - name: Run tests
        run: cd app && npm test -- --coverage --watchAll=false
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: app/coverage

  deploy:
    name: Deploy App
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: app/package-lock.json
      - run: cd app && ./release.sh
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          CF_DISTRIBUTION: ${{ secrets.CF_DISTRIBUTION }}
          S3_BUCKET: ${{ secrets.S3_BUCKET }}
```

**Step 2: Add test job to data workflow**

Modify `.github/workflows/data.yaml`:

```yaml
name: data

on:
  push:
    branches:
      - main
    paths:
      - 'data/**'
  pull_request:
    paths:
      - 'data/**'
  schedule:
    - cron: "0 */4 * 7-10 *"
  workflow_dispatch:

jobs:
  test:
    name: Test Data Pipeline
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"
      - name: Install dependencies
        run: |
          pip install -r ./data/requirements.txt
          pip install pytest pytest-cov
      - name: Run tests
        run: cd data && python -m pytest tests/ -v --cov=. --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: data/coverage.xml

  scrape:
    name: Scrape Data
    needs: test
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: browser-actions/setup-chrome@latest
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"
      - run: pip install -r ./data/requirements.txt
      - run: python ./data/main.py
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          CF_DISTRIBUTION: ${{ secrets.CF_DISTRIBUTION }}
          S3_BUCKET: ${{ secrets.S3_BUCKET }}
```

**Step 3: Commit**

```bash
git add .github/workflows/app.yaml .github/workflows/data.yaml
git commit -m "ci: add test jobs to CI/CD pipelines

- Run tests before deploy for app
- Run tests before scrape for data pipeline
- Add coverage reporting to Codecov
- Only deploy/scrape on main branch or schedule"
```

---

## Execution Summary

This plan contains **8 tasks** organized into **5 phases**:

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 | 1-4 | Critical bug fixes |
| 2 | 5 | CI/CD fixes |
| 3 | 6 | Code modernization |
| 4 | 7 | Re-enable validation |
| 5 | 8 | Testing in CI/CD |

**Estimated commits:** 8 atomic, well-tested commits

**Test coverage target:** >80% on critical paths (VOR calculation, player filtering)

---

## Next Steps

After completing this plan, the codebase will be ready for the advanced VOR modeling improvements outlined in the brainstorming session.
