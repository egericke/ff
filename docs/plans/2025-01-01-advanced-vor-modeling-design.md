# Advanced VOR Modeling System - Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create detailed implementation tasks from this design.

**Goal:** Build a championship-caliber fantasy football draft assistant with dynamic VOR calculations, risk modeling, schedule analysis, and real-time scarcity tracking.

**Architecture:** Multi-layer system with Python data pipeline feeding a TypeScript draft engine, connected via JSON API. Live data updates during draft season, with comprehensive dashboard UI.

**Tech Stack:** Python 3.11+, Next.js 14, Redux Toolkit, TypeScript, Jest, pytest, AWS S3/CloudFront

---

## 1. Core VOR Formula

### Enhanced Value Calculation

```
Player Value = Base VOR + Risk Adjustment + Schedule Adjustment + Scarcity Premium + ADP Value Gap
```

| Component | Description |
|-----------|-------------|
| **Base VOR** | Projected Points - Replacement Level Points |
| **Risk Adjustment** | Injury probability × Consistency score modifier |
| **Schedule Adjustment** | Strength of schedule impact (-15 to +15 points) |
| **Scarcity Premium** | Dynamic value based on position supply during draft |
| **ADP Value Gap** | Your value rank vs. market ADP rank |

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATA LAYER (Python)                         │
├─────────────────────────────────────────────────────────────────┤
│  Live Scrapers    │  Advanced Stats   │  Injury/News Feed      │
│  - ESPN, CBS, NFL │  - PFF grades     │  - Injury reports      │
│  - FantasyPros    │  - Target share   │  - Depth chart changes │
│  - NumberFire     │  - Snap %         │  - Suspension news     │
│  - PFF            │  - RedZone looks  │                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MODELING ENGINE (Python/TS)                   │
├─────────────────────────────────────────────────────────────────┤
│  Projection Aggregator  │  Risk Calculator  │  Schedule Scorer │
│  - Weighted consensus   │  - Injury prob    │  - DEF rankings  │
│  - Source reliability   │  - Variance calc  │  - Bye weeks     │
│  - Recency weighting    │  - Floor/ceiling  │  - Weekly SOS    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DRAFT ENGINE (TypeScript)                    │
├─────────────────────────────────────────────────────────────────┤
│  Dynamic VOR Calculator │  Scarcity Monitor │  Recommendation  │
│  - Live recalculation   │  - Position runs  │  - Risk slider   │
│  - Roster context       │  - Drop-off alerts│  - Top picks     │
│  - Pick optimization    │  - Value windows  │  - Dashboard     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Enhanced Projection System

### Multi-Source Weighted Aggregation

```
Weighted Projection = Σ (Source Projection × Source Weight × Recency Factor)
```

### Data Sources & Weights

| Source | Weight | Strengths |
|--------|--------|-----------|
| FantasyPros ECR | 1.2 | Best consensus, combines 100+ experts |
| PFF | 1.1 | Elite advanced metrics, film-based |
| ESPN | 1.0 | Solid baseline, good for mainstream |
| CBS | 0.9 | Conservative, good floors |
| NFL.com | 0.8 | Official but less analytical |
| NumberFire | 1.0 | Strong algorithmic model |

### Recency Factor

- Last 7 days: 100% weight
- 8-14 days: 80% weight
- 15+ days: 50% weight

### Advanced Stats to Collect

| Stat | Why It Matters |
|------|----------------|
| Target Share % | Sticky metric, predicts WR/TE volume |
| Snap Count % | Usage indicator, especially for RBs |
| Red Zone Targets/Carries | TD upside predictor |
| Air Yards | Deep threat potential for WRs |
| Yards After Contact | RB talent independent of O-line |
| Pressure Rate | QB quality indicator |
| Pass Block Win Rate | Offensive line quality for RBs |

---

## 3. Risk & Consistency Scoring

### Injury Risk Model (0-100 score)

```
Injury Risk = (Historical Injury Rate × 0.4) + (Age Factor × 0.25) +
              (Position Risk × 0.2) + (Current Status × 0.15)
```

| Factor | Calculation |
|--------|-------------|
| Historical Injury Rate | Games missed last 3 seasons / 51 possible games |
| Age Factor | Increases after thresholds: RB: 27, WR: 30, QB: 35, TE: 30 |
| Position Risk | RB = 0.7, WR = 0.4, QB = 0.2, TE = 0.5 |
| Current Status | Healthy = 0, Questionable = 0.3, Recent injury = 0.5 |

### Consistency Score (0-1 scale)

```
Consistency = 1 - (Standard Deviation of Weekly Finish / Mean Weekly Finish)
```

- **0.8+**: Rock solid (Davante Adams, Travis Kelce)
- **0.5-0.8**: Moderate variance (most players)
- **<0.5**: Boom/bust (deep threats, volatile RBs)

### Risk-Adjusted VOR

```
Adjusted VOR = Base VOR × (1 - (Injury Risk × Risk Sensitivity))
                        × (Consistency ^ (1 - Risk Tolerance))
```

**Risk Tolerance Slider:**
- Conservative (0.2): Heavily penalizes risk
- Balanced (0.5): Moderate adjustments
- Aggressive (0.8): Embraces upside

### Example Impact

| Player | Base VOR | Injury Risk | Consistency | Conservative | Aggressive |
|--------|----------|-------------|-------------|--------------|------------|
| Saquon Barkley | 85 | 0.65 | 0.55 | 52 | 78 |
| Josh Jacobs | 70 | 0.25 | 0.75 | 68 | 69 |
| Ja'Marr Chase | 80 | 0.15 | 0.70 | 79 | 80 |

---

## 4. Schedule Strength & Matchup Analysis

### Schedule Score (-15 to +15 points)

```
Schedule Score = Σ (Weekly Matchup Rating × Week Weight) / 17
```

### Matchup Factors by Position

| Position | Favorable Matchup Factors |
|----------|---------------------------|
| QB | DEF pass rush rank, secondary rank, blitz rate, dome/weather |
| RB | DEF run stop rate, box count, LB quality, game script |
| WR | CB rankings, slot coverage, safety help, target competition |
| TE | LB coverage ability, slot nickel quality, red zone DEF |
| K | Dome, altitude, projected game totals, red zone stop rate |
| DST | Opposing O-line rank, turnover tendency, sack rate allowed |

### Week Weighting

| Weeks | Weight | Reason |
|-------|--------|--------|
| 1-4 | 0.8 | Warm-up, less critical |
| 5-13 | 1.0 | Regular season |
| 14-17 | 1.5 | Fantasy playoffs - must perform |

### Bye Week Intelligence

- Flag Week 14 byes (playoff disaster)
- Track bye week stacking (avoid 3+ starters same bye)
- Premium for early byes (Weeks 5-7)

---

## 5. Dynamic Draft Engine

### Real-Time VOR Recalculation

After every pick:

```
Dynamic VOR = Base VOR + Scarcity Premium + Drop-off Alert + ADP Arbitrage
```

### Scarcity Premium

```
Scarcity Premium = (Expected Starters Needed - Available Quality Players) × Position Weight
```

| Scenario | Premium |
|----------|---------|
| 8 RBs drafted in first 2 rounds | +15 to +25 VOR boost for remaining RB1s |
| QBs ignored through round 5 | Minimal change |
| Elite TE just drafted | +5 to +10 boost for next tier TEs |

### Positional Drop-off Alerts

```
Drop-off Alert = (Current Tier Avg VOR - Next Tier Avg VOR) > Threshold
```

- 🔴 **CRITICAL**: Value drops 25+ points after current tier
- 🟡 **WARNING**: Value cliff approaching in 3-5 picks
- 🟢 **SAFE**: Position depth remains strong

### ADP Arbitrage

```
ADP Value Gap = Your VOR Rank - ADP Rank
```

| Gap | Meaning | Action |
|-----|---------|--------|
| +20 or more | Massive sleeper | Strong buy |
| +5 to +19 | Good value | Consider |
| -5 to +5 | Fairly priced | Draft on need |
| -6 to -19 | Overpriced | Avoid unless scarcity |
| -20 or worse | Significant reach | Do not draft |

### Roster Context Awareness

```
Need Multiplier = 1.0 + (Roster Hole Urgency × Rounds Remaining Factor)
```

- Empty RB1 slot in round 6? RB values get 1.3x multiplier
- Already have 3 WRs but no TE? TE values boosted
- Stacking bye weeks? Different-bye players get premium

---

## 6. Dashboard UI Design

### Main Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ROUND 4 • PICK 7 (43rd Overall) • YOUR PICK          [Risk: ●●●○○ Balanced]│
├─────────────────────────────────────────────────────────────────────────────┤
│  ⚡ TOP RECOMMENDATIONS                     │  📊 POSITION SCARCITY        │
│  ┌─────────────────────────────────────┐   │  ┌────────────────────────┐   │
│  │ 1. DeVonta Smith (WR) PHI          │   │  │ RB  ████████░░ 🔴 CRIT │   │
│  │    VOR: 67 → 74 (+7 scarcity)      │   │  │ WR  ██████████░░ 🟡     │   │
│  │    📈 ADP Value: +12 (steal)       │   │  │ TE  ████████████ 🟢     │   │
│  │    🛡️ Risk: Low | 📅 SOS: +4      │   │  │ QB  █████████████ 🟢    │   │
│  ├─────────────────────────────────────┤   │  └────────────────────────┘   │
│  │ 2. Travis Etienne (RB) JAX         │   │                                │
│  │    VOR: 71 → 82 (+11 scarcity)     │   │  ⚠️ ALERTS                     │
│  │    📈 ADP Value: +3               │   │  • RB cliff in 4 picks!        │
│  │    🛡️ Risk: Med | 📅 SOS: -2     │   │  • Week 10 bye stacking (2)    │
│  └─────────────────────────────────────┘   │                                │
│                                             │  🎯 YOUR ROSTER NEEDS          │
│  🔍 FULL PLAYER LIST            [Filter ▼] │  ✓ QB1  ✗ RB1  ✓ RB2          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Rank │ Player          │ Pos │ VOR  │ Risk │ SOS │ ADP Gap │ Action │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  1   │ T. Etienne      │ RB  │  82  │ Med  │ -2  │   +3    │ [PICK] │  │
│  │  2   │ D. Smith        │ WR  │  74  │ Low  │ +4  │  +12    │ [PICK] │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Player Detail Popup

```
┌─────────────────────────────────────────┐
│ TRAVIS ETIENNE JR. • RB • JAX           │
├─────────────────────────────────────────┤
│ Projection: 247 pts (RB8)               │
│                                         │
│ VOR Breakdown:                          │
│   Base VOR:         71                  │
│   + Scarcity:      +11 (RB run active)  │
│   + Schedule:       -2 (tough Wk14-16)  │
│   + Risk Adj:       +2 (healthy camp)   │
│   = FINAL VOR:      82                  │
│                                         │
│ Risk Profile:       ████░░ Medium       │
│   • Injury Risk:    35%                 │
│   • Consistency:    0.68                │
│   • Ceiling:        RB3 | Floor: RB18   │
│                                         │
│ Playoff Schedule:                       │
│   Wk14: vs TEN 🟢  Wk15: @ BAL 🔴      │
│   Wk16: vs LV  🟢                       │
│                                         │
│ [DRAFT PLAYER]  [REMOVE FROM BOARD]     │
└─────────────────────────────────────────┘
```

---

## 7. Live Data Pipeline

### Refresh Schedule

| Period | Frequency | Data |
|--------|-----------|------|
| Offseason (Feb-Jun) | Weekly | ADP trends, roster moves, injury news |
| Preseason (Jul-Aug) | Daily | Projections, depth charts, camp reports |
| Draft Season (Aug-Sep) | Hourly | All data, live ADP, breaking news |

### Data Schema (projections.json)

```json
{
  "meta": {
    "updated": "2025-08-15T14:30:00Z",
    "sources": ["espn", "cbs", "nfl", "fantasypros", "pff"],
    "season": 2025
  },
  "players": [
    {
      "key": "chase_WR_CIN",
      "name": "Ja'Marr Chase",
      "pos": "WR",
      "team": "CIN",
      "bye": 12,
      "adp": { "std": 5.2, "halfPpr": 4.8, "ppr": 4.1 },

      "projections": {
        "receptions": 98, "receptionYds": 1350, "receptionTds": 11,
        "rushYds": 45, "rushTds": 0, "fumbles": 1
      },

      "advanced": {
        "targetShare": 0.28, "airYards": 1620, "redZoneTargets": 22,
        "snapPct": 0.92, "yprr": 2.41
      },

      "risk": {
        "injuryScore": 15, "gamesPlayed3Yr": [16, 17, 16],
        "weeklyVariance": 0.31, "floor": 185, "ceiling": 340
      },

      "schedule": {
        "sosOverall": 0.52, "sosPlayoffs": 0.38,
        "weeklyMatchups": [3, 2, 4, 3, 1, 5, 3, 2, 4, 3, 2, "BYE", 4, 2, 3, 4, 5]
      }
    }
  ],
  "defenses": {
    "CIN": { "passRank": 12, "rushRank": 18, "overallRank": 14 }
  }
}
```

---

## 8. Project Structure

```
ff_repo/
├── app/
│   ├── lib/
│   │   ├── models/
│   │   │   ├── Player.ts              # Extend with advanced stats
│   │   │   ├── Risk.ts                # NEW: Risk scoring interfaces
│   │   │   ├── Schedule.ts            # NEW: SOS interfaces
│   │   │   └── DraftState.ts          # NEW: Dynamic draft context
│   │   ├── engine/
│   │   │   ├── vor.ts                 # NEW: Enhanced VOR calculator
│   │   │   ├── risk.ts                # NEW: Injury/consistency scoring
│   │   │   ├── schedule.ts            # NEW: SOS calculations
│   │   │   ├── scarcity.ts            # NEW: Dynamic scarcity tracking
│   │   │   └── recommendations.ts     # NEW: Pick recommendation engine
│   │   ├── store/
│   │   │   ├── slices/                # NEW: Redux Toolkit migration
│   │   │   │   ├── playersSlice.ts
│   │   │   │   ├── draftSlice.ts
│   │   │   │   └── settingsSlice.ts
│   │   │   └── store.ts               # Modernized store setup
│   │   └── __tests__/
│   │       ├── vor.test.ts
│   │       ├── risk.test.ts
│   │       ├── scarcity.test.ts
│   │       └── recommendations.test.ts
│   ├── components/
│   │   ├── Dashboard/                 # NEW: Main draft dashboard
│   │   │   ├── Dashboard.tsx
│   │   │   ├── RecommendationCard.tsx
│   │   │   ├── ScarcityMeter.tsx
│   │   │   ├── PlayerDetailPopup.tsx
│   │   │   └── RiskSlider.tsx
│   │   └── ...
│   └── pages/
│       └── index.tsx
│
├── data/
│   ├── scrapers/                      # NEW: Modular scraper system
│   │   ├── base.py
│   │   ├── espn.py
│   │   ├── cbs.py
│   │   ├── nfl.py
│   │   ├── fantasypros.py
│   │   ├── pff.py
│   │   └── numberfire.py
│   ├── processors/
│   │   ├── aggregator.py
│   │   ├── risk_calculator.py
│   │   ├── schedule_analyzer.py
│   │   └── normalizer.py
│   ├── validators/
│   │   └── data_quality.py
│   └── tests/
│
└── docs/plans/
```

---

## 9. Implementation Phases

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| **1. Foundation** | Week 1-2 | Bug fixes, test infrastructure, Redux Toolkit migration |
| **2. Data Layer** | Week 3-4 | New scrapers, enhanced aggregator, normalized schema |
| **3. Risk Engine** | Week 5-6 | Injury scoring, consistency calc, floor/ceiling |
| **4. Schedule Engine** | Week 7-8 | SOS calculation, playoff weighting, matchup ratings |
| **5. Dynamic VOR** | Week 9-10 | Scarcity tracking, real-time recalc, roster context |
| **6. Dashboard UI** | Week 11-13 | New dashboard components, player popups, alerts |
| **7. Integration** | Week 14-15 | End-to-end testing, performance tuning, polish |
| **8. Live Data** | Week 16+ | Automated refresh pipeline, monitoring, pre-draft prep |

---

## 10. Dependencies

### Python (data/)
```
pandas>=2.0
numpy>=1.24
beautifulsoup4
selenium>=4.10
requests
pytest
python-dateutil
fuzzywuzzy
```

### TypeScript (app/)
```
next: ^14
react: ^18
@reduxjs/toolkit
antd: ^5
jest
@testing-library/react
```

---

## Success Metrics

- **VOR Accuracy**: Back-test against previous seasons, target >70% correlation with actual results
- **Draft Value**: Track total roster VOR vs. league average in test drafts
- **Usability**: Complete mock draft in real-time without lag (<100ms per pick update)
- **Data Freshness**: Projections updated within 4 hours of source updates

---

*Document created: 2025-01-01*
*Ready for implementation planning with superpowers:writing-plans*
