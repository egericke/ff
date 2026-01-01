# Advanced VOR Modeling - Phase 6: Dashboard UI

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build React components that display enhanced VOR data, scarcity meters, recommendations, risk slider, and player detail popups - transforming the engine calculations into actionable draft intelligence.

**Architecture:** Create modular Dashboard components that integrate with the existing Redux store. Use the existing Ant Design component library. Connect to the engine layer via selectors that compute enhanced VOR on-demand.

**Tech Stack:** React, Redux, Ant Design, TypeScript, Jest, @testing-library/react

---

## Task 1: Create Risk Slider Component

**Files:**
- Create: `app/components/Dashboard/RiskSlider.tsx`
- Test: `app/components/Dashboard/__tests__/RiskSlider.test.tsx`

**Step 1: Write the failing test**

```typescript
// app/components/Dashboard/__tests__/RiskSlider.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RiskSlider from '../RiskSlider';

// Mock antd Slider
jest.mock('antd', () => ({
  Slider: jest.fn().mockImplementation(({ value, onChange, min, max }) => (
    <input
      data-testid="risk-slider"
      type="range"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  )),
  Tooltip: jest.fn().mockImplementation(({ children }) => children),
}));

describe('RiskSlider', () => {
  const defaultProps = {
    value: 0.5,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the slider with current value', () => {
    render(<RiskSlider {...defaultProps} />);
    const slider = screen.getByTestId('risk-slider');
    expect(slider).toHaveValue('0.5');
  });

  it('should display risk level label', () => {
    render(<RiskSlider {...defaultProps} value={0.2} />);
    expect(screen.getByText(/Conservative/i)).toBeInTheDocument();
  });

  it('should display Balanced for mid-range values', () => {
    render(<RiskSlider {...defaultProps} value={0.5} />);
    expect(screen.getByText(/Balanced/i)).toBeInTheDocument();
  });

  it('should display Aggressive for high values', () => {
    render(<RiskSlider {...defaultProps} value={0.8} />);
    expect(screen.getByText(/Aggressive/i)).toBeInTheDocument();
  });

  it('should call onChange when slider value changes', () => {
    render(<RiskSlider {...defaultProps} />);
    const slider = screen.getByTestId('risk-slider');
    fireEvent.change(slider, { target: { value: '0.8' } });
    expect(defaultProps.onChange).toHaveBeenCalledWith(0.8);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --testPathPatterns="RiskSlider"`
Expected: FAIL with "Cannot find module '../RiskSlider'"

**Step 3: Write minimal implementation**

```typescript
// app/components/Dashboard/RiskSlider.tsx
import { Slider, Tooltip } from 'antd';
import * as React from 'react';

interface IRiskSliderProps {
  value: number;
  onChange: (value: number) => void;
}

/**
 * Risk tolerance slider for adjusting VOR calculations.
 * - Conservative (0.2): Heavily penalizes risky players
 * - Balanced (0.5): Moderate risk adjustments
 * - Aggressive (0.8): Embraces high-upside players
 */
export default function RiskSlider({ value, onChange }: IRiskSliderProps) {
  const getRiskLabel = (val: number): string => {
    if (val <= 0.35) return 'Conservative';
    if (val <= 0.65) return 'Balanced';
    return 'Aggressive';
  };

  const getRiskDescription = (val: number): string => {
    if (val <= 0.35) return 'Prioritizes safe, consistent players';
    if (val <= 0.65) return 'Balanced risk/reward approach';
    return 'Embraces high-upside, boom/bust players';
  };

  return (
    <div className="RiskSlider">
      <div className="RiskSlider-Header">
        <span className="RiskSlider-Label">Risk Tolerance</span>
        <Tooltip title={getRiskDescription(value)}>
          <span className="RiskSlider-Value">{getRiskLabel(value)}</span>
        </Tooltip>
      </div>
      <Slider
        min={0.1}
        max={0.9}
        step={0.1}
        value={value}
        onChange={onChange}
        marks={{
          0.2: 'Safe',
          0.5: 'Balanced',
          0.8: 'Risky',
        }}
      />
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --testPathPatterns="RiskSlider"`
Expected: PASS

---

## Task 2: Create Scarcity Meter Component

**Files:**
- Create: `app/components/Dashboard/ScarcityMeter.tsx`
- Test: `app/components/Dashboard/__tests__/ScarcityMeter.test.tsx`

**Step 1: Write the failing test**

```typescript
// app/components/Dashboard/__tests__/ScarcityMeter.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import ScarcityMeter from '../ScarcityMeter';
import { Position } from '../../../lib/models/Player';
import { ScarcitySeverity } from '../../../lib/models/Scarcity';

describe('ScarcityMeter', () => {
  const defaultProps = {
    position: 'RB' as Position,
    severity: 'medium' as ScarcitySeverity,
    tier1Remaining: 3,
    tier2Remaining: 8,
    totalRemaining: 25,
  };

  it('should render the position label', () => {
    render(<ScarcityMeter {...defaultProps} />);
    expect(screen.getByText('RB')).toBeInTheDocument();
  });

  it('should show critical indicator for critical severity', () => {
    render(<ScarcityMeter {...defaultProps} severity="critical" />);
    expect(screen.getByText(/CRIT/i)).toBeInTheDocument();
  });

  it('should show warning indicator for high severity', () => {
    render(<ScarcityMeter {...defaultProps} severity="high" />);
    const container = document.querySelector('.ScarcityMeter');
    expect(container).toHaveClass('severity-high');
  });

  it('should display remaining tier counts', () => {
    render(<ScarcityMeter {...defaultProps} tier1Remaining={5} />);
    expect(screen.getByText(/5 elite/i)).toBeInTheDocument();
  });

  it('should show progress bar representing supply', () => {
    render(<ScarcityMeter {...defaultProps} />);
    const progressBar = document.querySelector('.ScarcityMeter-Bar');
    expect(progressBar).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --testPathPatterns="ScarcityMeter"`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// app/components/Dashboard/ScarcityMeter.tsx
import * as React from 'react';
import { Position } from '../../lib/models/Player';
import { ScarcitySeverity } from '../../lib/models/Scarcity';

interface IScarcityMeterProps {
  position: Position;
  severity: ScarcitySeverity;
  tier1Remaining: number;
  tier2Remaining: number;
  totalRemaining: number;
}

/**
 * Visual meter showing positional scarcity during the draft.
 * Displays remaining player tiers and urgency level.
 */
export default function ScarcityMeter({
  position,
  severity,
  tier1Remaining,
  tier2Remaining,
  totalRemaining,
}: IScarcityMeterProps) {
  const getSeverityLabel = (): string | null => {
    if (severity === 'critical') return 'CRIT';
    if (severity === 'high') return 'HIGH';
    return null;
  };

  const getSeverityEmoji = (): string => {
    if (severity === 'critical') return '🔴';
    if (severity === 'high') return '🟡';
    if (severity === 'medium') return '🟡';
    return '🟢';
  };

  // Calculate fill percentage (max 100%)
  const fillPercentage = Math.min((totalRemaining / 40) * 100, 100);

  return (
    <div className={`ScarcityMeter severity-${severity}`}>
      <div className="ScarcityMeter-Header">
        <span className="ScarcityMeter-Position">{position}</span>
        <span className="ScarcityMeter-Indicator">
          {getSeverityEmoji()}
          {getSeverityLabel() && (
            <span className="ScarcityMeter-Label">{getSeverityLabel()}</span>
          )}
        </span>
      </div>
      <div className="ScarcityMeter-Bar">
        <div
          className="ScarcityMeter-Fill"
          style={{ width: `${fillPercentage}%` }}
        />
      </div>
      <div className="ScarcityMeter-Details">
        <span className="small">{tier1Remaining} elite</span>
        <span className="small">{tier2Remaining} starter</span>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --testPathPatterns="ScarcityMeter"`
Expected: PASS

---

## Task 3: Create Recommendation Card Component

**Files:**
- Create: `app/components/Dashboard/RecommendationCard.tsx`
- Test: `app/components/Dashboard/__tests__/RecommendationCard.test.tsx`

**Step 1: Write the failing test**

```typescript
// app/components/Dashboard/__tests__/RecommendationCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecommendationCard from '../RecommendationCard';
import { IPlayerRecommendation } from '../../../lib/models/EnhancedVOR';
import { IPlayerExtended } from '../../../lib/models/Player';

// Mock antd
jest.mock('antd', () => ({
  Tooltip: jest.fn().mockImplementation(({ children }) => children),
  Tag: jest.fn().mockImplementation(({ children, color }) => (
    <span data-testid="tag" data-color={color}>{children}</span>
  )),
  Button: jest.fn().mockImplementation(({ children, onClick }) => (
    <button onClick={onClick}>{children}</button>
  )),
}));

describe('RecommendationCard', () => {
  const mockPlayer: IPlayerExtended = {
    index: 1,
    key: 'smith_WR_PHI',
    name: 'DeVonta Smith',
    pos: 'WR',
    team: 'PHI',
    bye: 14,
    std: 25,
    halfPpr: 20,
    ppr: 15,
    vor: 67,
    forecast: 245,
  };

  const mockRecommendation: IPlayerRecommendation = {
    player: mockPlayer,
    enhancedVOR: {
      playerId: 'smith_WR_PHI',
      playerName: 'DeVonta Smith',
      position: 'WR',
      baseVOR: 67,
      forecast: 245,
      riskAdjustment: -3,
      scheduleAdjustment: 4,
      scarcityPremium: 7,
      enhancedVOR: 75,
      overallRank: 12,
      positionRank: 5,
      adpDiff: 13,
    },
    reasons: ['ADP value of +13 picks', 'Favorable schedule (+4)'],
    urgency: 'high',
    valueIndicator: 'steal',
  };

  const defaultProps = {
    recommendation: mockRecommendation,
    onDraft: jest.fn(),
    onViewDetails: jest.fn(),
    rank: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render player name and position', () => {
    render(<RecommendationCard {...defaultProps} />);
    expect(screen.getByText('DeVonta Smith')).toBeInTheDocument();
    expect(screen.getByText('WR')).toBeInTheDocument();
  });

  it('should display enhanced VOR value', () => {
    render(<RecommendationCard {...defaultProps} />);
    expect(screen.getByText(/75/)).toBeInTheDocument();
  });

  it('should show value indicator as steal', () => {
    render(<RecommendationCard {...defaultProps} />);
    expect(screen.getByText(/steal/i)).toBeInTheDocument();
  });

  it('should display ADP value', () => {
    render(<RecommendationCard {...defaultProps} />);
    expect(screen.getByText(/\+13/)).toBeInTheDocument();
  });

  it('should show recommendation reasons', () => {
    render(<RecommendationCard {...defaultProps} />);
    expect(screen.getByText(/Favorable schedule/)).toBeInTheDocument();
  });

  it('should call onDraft when draft button clicked', () => {
    render(<RecommendationCard {...defaultProps} />);
    const draftButton = screen.getByText(/Draft/i);
    fireEvent.click(draftButton);
    expect(defaultProps.onDraft).toHaveBeenCalledWith(mockPlayer);
  });

  it('should show urgency indicator', () => {
    render(<RecommendationCard {...defaultProps} />);
    expect(screen.getByText(/high/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --testPathPatterns="RecommendationCard"`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// app/components/Dashboard/RecommendationCard.tsx
import { Button, Tag, Tooltip } from 'antd';
import * as React from 'react';
import { IPlayerRecommendation, ValueIndicator, Urgency } from '../../lib/models/EnhancedVOR';
import { IPlayerExtended } from '../../lib/models/Player';

interface IRecommendationCardProps {
  recommendation: IPlayerRecommendation;
  onDraft: (player: IPlayerExtended) => void;
  onViewDetails: (player: IPlayerExtended) => void;
  rank: number;
}

const VALUE_COLORS: Record<ValueIndicator, string> = {
  steal: 'green',
  'good-value': 'blue',
  fair: 'default',
  reach: 'orange',
  avoid: 'red',
};

const URGENCY_COLORS: Record<Urgency, string> = {
  'must-draft': 'red',
  high: 'orange',
  medium: 'blue',
  low: 'default',
};

/**
 * Card displaying a recommended player with VOR breakdown,
 * value indicator, and action buttons.
 */
export default function RecommendationCard({
  recommendation,
  onDraft,
  onViewDetails,
  rank,
}: IRecommendationCardProps) {
  const { player, enhancedVOR, reasons, urgency, valueIndicator } = recommendation;
  const adpSign = enhancedVOR.adpDiff >= 0 ? '+' : '';

  return (
    <div className="RecommendationCard">
      <div className="RecommendationCard-Rank">{rank}</div>
      <div className="RecommendationCard-Content">
        <div className="RecommendationCard-Header">
          <span className="RecommendationCard-Name">{player.name}</span>
          <Tag>{player.pos}</Tag>
          <span className="RecommendationCard-Team">{player.team}</span>
        </div>

        <div className="RecommendationCard-Stats">
          <Tooltip title="Enhanced VOR with all adjustments">
            <span className="RecommendationCard-VOR">
              VOR: {enhancedVOR.enhancedVOR.toFixed(0)}
            </span>
          </Tooltip>
          <Tooltip title="Your rank vs ADP (positive = value)">
            <span className="RecommendationCard-ADP">
              ADP: {adpSign}{enhancedVOR.adpDiff}
            </span>
          </Tooltip>
        </div>

        <div className="RecommendationCard-Indicators">
          <Tag color={VALUE_COLORS[valueIndicator]}>{valueIndicator}</Tag>
          <Tag color={URGENCY_COLORS[urgency]}>{urgency}</Tag>
        </div>

        <div className="RecommendationCard-Reasons">
          {reasons.slice(0, 2).map((reason, idx) => (
            <span key={idx} className="RecommendationCard-Reason small">
              {reason}
            </span>
          ))}
        </div>
      </div>

      <div className="RecommendationCard-Actions">
        <Button type="primary" size="small" onClick={() => onDraft(player)}>
          Draft
        </Button>
        <Button size="small" onClick={() => onViewDetails(player)}>
          Details
        </Button>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --testPathPatterns="RecommendationCard"`
Expected: PASS

---

## Task 4: Create Player Detail Popup Component

**Files:**
- Create: `app/components/Dashboard/PlayerDetailPopup.tsx`
- Test: `app/components/Dashboard/__tests__/PlayerDetailPopup.test.tsx`

**Step 1: Write the failing test**

```typescript
// app/components/Dashboard/__tests__/PlayerDetailPopup.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerDetailPopup from '../PlayerDetailPopup';
import { IEnhancedVOR } from '../../../lib/models/EnhancedVOR';
import { IPlayerExtended } from '../../../lib/models/Player';

// Mock antd Modal
jest.mock('antd', () => ({
  Modal: jest.fn().mockImplementation(({ open, onCancel, children, title }) => (
    open ? (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        <button data-testid="modal-close" onClick={onCancel}>Close</button>
        {children}
      </div>
    ) : null
  )),
  Progress: jest.fn().mockImplementation(({ percent }) => (
    <div data-testid="progress" data-percent={percent} />
  )),
  Tag: jest.fn().mockImplementation(({ children }) => <span>{children}</span>),
  Button: jest.fn().mockImplementation(({ children, onClick }) => (
    <button onClick={onClick}>{children}</button>
  )),
}));

describe('PlayerDetailPopup', () => {
  const mockPlayer: IPlayerExtended = {
    index: 1,
    key: 'etienne_RB_JAX',
    name: 'Travis Etienne Jr.',
    pos: 'RB',
    team: 'JAX',
    bye: 11,
    std: 15,
    halfPpr: 12,
    ppr: 10,
    vor: 71,
    forecast: 247,
    risk: {
      age: 25,
      injuryHistory: {
        gamesPlayed: [16, 15, 17] as [number, number, number],
        currentStatus: 'healthy',
      },
      riskProfile: {
        injuryScore: 35,
        consistencyScore: 0.68,
        floor: 180,
        ceiling: 300,
        weeklyVariance: 8,
      },
    },
  };

  const mockEnhancedVOR: IEnhancedVOR = {
    playerId: 'etienne_RB_JAX',
    playerName: 'Travis Etienne Jr.',
    position: 'RB',
    baseVOR: 71,
    forecast: 247,
    riskAdjustment: -5,
    scheduleAdjustment: -2,
    scarcityPremium: 11,
    enhancedVOR: 75,
    overallRank: 8,
    positionRank: 4,
    adpDiff: 7,
  };

  const defaultProps = {
    open: true,
    player: mockPlayer,
    enhancedVOR: mockEnhancedVOR,
    onClose: jest.fn(),
    onDraft: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render player name in title', () => {
    render(<PlayerDetailPopup {...defaultProps} />);
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Travis Etienne Jr.');
  });

  it('should display VOR breakdown', () => {
    render(<PlayerDetailPopup {...defaultProps} />);
    expect(screen.getByText(/Base VOR/i)).toBeInTheDocument();
    expect(screen.getByText(/71/)).toBeInTheDocument();
  });

  it('should show scarcity adjustment', () => {
    render(<PlayerDetailPopup {...defaultProps} />);
    expect(screen.getByText(/Scarcity/i)).toBeInTheDocument();
    expect(screen.getByText(/\+11/)).toBeInTheDocument();
  });

  it('should display risk profile when available', () => {
    render(<PlayerDetailPopup {...defaultProps} />);
    expect(screen.getByText(/Risk Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/35%/)).toBeInTheDocument(); // injury score
  });

  it('should show floor and ceiling', () => {
    render(<PlayerDetailPopup {...defaultProps} />);
    expect(screen.getByText(/Floor/i)).toBeInTheDocument();
    expect(screen.getByText(/Ceiling/i)).toBeInTheDocument();
  });

  it('should call onDraft when draft button clicked', () => {
    render(<PlayerDetailPopup {...defaultProps} />);
    const draftButton = screen.getByText(/Draft Player/i);
    fireEvent.click(draftButton);
    expect(defaultProps.onDraft).toHaveBeenCalledWith(mockPlayer);
  });

  it('should call onClose when modal is closed', () => {
    render(<PlayerDetailPopup {...defaultProps} />);
    const closeButton = screen.getByTestId('modal-close');
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should not render when open is false', () => {
    render(<PlayerDetailPopup {...defaultProps} open={false} />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --testPathPatterns="PlayerDetailPopup"`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// app/components/Dashboard/PlayerDetailPopup.tsx
import { Button, Modal, Progress, Tag } from 'antd';
import * as React from 'react';
import { IEnhancedVOR } from '../../lib/models/EnhancedVOR';
import { IPlayerExtended } from '../../lib/models/Player';

interface IPlayerDetailPopupProps {
  open: boolean;
  player: IPlayerExtended | null;
  enhancedVOR: IEnhancedVOR | null;
  onClose: () => void;
  onDraft: (player: IPlayerExtended) => void;
}

/**
 * Detailed popup showing complete VOR breakdown, risk profile,
 * and schedule analysis for a player.
 */
export default function PlayerDetailPopup({
  open,
  player,
  enhancedVOR,
  onClose,
  onDraft,
}: IPlayerDetailPopupProps) {
  if (!player || !enhancedVOR) return null;

  const riskProfile = player.risk?.riskProfile;
  const formatAdjustment = (val: number): string => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(0)}`;
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={`${player.name} - ${player.pos} - ${player.team}`}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button key="draft" type="primary" onClick={() => onDraft(player)}>
          Draft Player
        </Button>,
      ]}
    >
      <div className="PlayerDetail">
        <section className="PlayerDetail-Projection">
          <h4>Projection</h4>
          <p>
            <strong>{enhancedVOR.forecast} pts</strong> (Rank: {enhancedVOR.positionRank})
          </p>
        </section>

        <section className="PlayerDetail-VOR">
          <h4>VOR Breakdown</h4>
          <div className="PlayerDetail-VOR-Row">
            <span>Base VOR:</span>
            <span>{enhancedVOR.baseVOR}</span>
          </div>
          <div className="PlayerDetail-VOR-Row">
            <span>+ Scarcity:</span>
            <span>{formatAdjustment(enhancedVOR.scarcityPremium)}</span>
          </div>
          <div className="PlayerDetail-VOR-Row">
            <span>+ Schedule:</span>
            <span>{formatAdjustment(enhancedVOR.scheduleAdjustment)}</span>
          </div>
          <div className="PlayerDetail-VOR-Row">
            <span>+ Risk Adj:</span>
            <span>{formatAdjustment(enhancedVOR.riskAdjustment)}</span>
          </div>
          <div className="PlayerDetail-VOR-Row PlayerDetail-VOR-Total">
            <span>= FINAL VOR:</span>
            <span><strong>{enhancedVOR.enhancedVOR.toFixed(0)}</strong></span>
          </div>
        </section>

        {riskProfile && (
          <section className="PlayerDetail-Risk">
            <h4>Risk Profile</h4>
            <div className="PlayerDetail-Risk-Row">
              <span>Injury Risk:</span>
              <Progress
                percent={riskProfile.injuryScore}
                size="small"
                status={riskProfile.injuryScore > 50 ? 'exception' : 'normal'}
              />
              <span>{riskProfile.injuryScore}%</span>
            </div>
            <div className="PlayerDetail-Risk-Row">
              <span>Consistency:</span>
              <Progress
                percent={riskProfile.consistencyScore * 100}
                size="small"
                status="active"
              />
            </div>
            <div className="PlayerDetail-Risk-Row">
              <span>Floor:</span>
              <Tag>{riskProfile.floor} pts</Tag>
              <span>Ceiling:</span>
              <Tag>{riskProfile.ceiling} pts</Tag>
            </div>
          </section>
        )}

        <section className="PlayerDetail-ADP">
          <h4>ADP Value</h4>
          <p>
            Your Rank: {enhancedVOR.overallRank} | ADP: {player.std}
            {enhancedVOR.adpDiff > 0 && (
              <Tag color="green">+{enhancedVOR.adpDiff} value</Tag>
            )}
            {enhancedVOR.adpDiff < 0 && (
              <Tag color="red">{enhancedVOR.adpDiff} reach</Tag>
            )}
          </p>
        </section>
      </div>
    </Modal>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --testPathPatterns="PlayerDetailPopup"`
Expected: PASS

---

## Task 5: Create Scarcity Panel Component

**Files:**
- Create: `app/components/Dashboard/ScarcityPanel.tsx`
- Test: `app/components/Dashboard/__tests__/ScarcityPanel.test.tsx`

**Step 1: Write the failing test**

```typescript
// app/components/Dashboard/__tests__/ScarcityPanel.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import ScarcityPanel from '../ScarcityPanel';
import { IScarcityPremium, IDropOffAlert } from '../../../lib/models/Scarcity';

describe('ScarcityPanel', () => {
  const mockPremiums: IScarcityPremium[] = [
    { position: 'RB', premium: 8, severity: 'high', message: 'RB run in progress' },
    { position: 'WR', premium: 3, severity: 'medium' },
    { position: 'TE', premium: 0, severity: 'none' },
    { position: 'QB', premium: 0, severity: 'none' },
  ];

  const mockAlerts: IDropOffAlert[] = [
    {
      position: 'RB',
      currentTierAvgVOR: 65,
      nextTierAvgVOR: 35,
      dropOffPoints: 30,
      picksUntilDrop: 4,
      severity: 'critical',
    },
  ];

  const defaultProps = {
    premiums: mockPremiums,
    alerts: mockAlerts,
  };

  it('should render all position scarcity meters', () => {
    render(<ScarcityPanel {...defaultProps} />);
    expect(screen.getByText('RB')).toBeInTheDocument();
    expect(screen.getByText('WR')).toBeInTheDocument();
    expect(screen.getByText('TE')).toBeInTheDocument();
  });

  it('should display alerts when present', () => {
    render(<ScarcityPanel {...defaultProps} />);
    expect(screen.getByText(/RB cliff/i)).toBeInTheDocument();
    expect(screen.getByText(/4 picks/i)).toBeInTheDocument();
  });

  it('should show header', () => {
    render(<ScarcityPanel {...defaultProps} />);
    expect(screen.getByText(/Position Scarcity/i)).toBeInTheDocument();
  });

  it('should not show alerts section when no alerts', () => {
    render(<ScarcityPanel {...defaultProps} alerts={[]} />);
    expect(screen.queryByText(/cliff/i)).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --testPathPatterns="ScarcityPanel"`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// app/components/Dashboard/ScarcityPanel.tsx
import * as React from 'react';
import { IScarcityPremium, IDropOffAlert } from '../../lib/models/Scarcity';
import ScarcityMeter from './ScarcityMeter';

interface IScarcityPanelProps {
  premiums: IScarcityPremium[];
  alerts: IDropOffAlert[];
}

/**
 * Panel displaying positional scarcity across all positions
 * with drop-off alerts.
 */
export default function ScarcityPanel({ premiums, alerts }: IScarcityPanelProps) {
  // Filter to main positions only
  const mainPositions = premiums.filter((p) =>
    ['QB', 'RB', 'WR', 'TE'].includes(p.position)
  );

  return (
    <div className="ScarcityPanel Section">
      <header>
        <h3>Position Scarcity</h3>
      </header>

      <div className="ScarcityPanel-Meters">
        {mainPositions.map((premium) => (
          <ScarcityMeter
            key={premium.position}
            position={premium.position}
            severity={premium.severity}
            tier1Remaining={0} // TODO: Connect to actual supply data
            tier2Remaining={0}
            totalRemaining={0}
          />
        ))}
      </div>

      {alerts.length > 0 && (
        <div className="ScarcityPanel-Alerts">
          <h4>Alerts</h4>
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`ScarcityPanel-Alert severity-${alert.severity}`}
            >
              <span className="alert-icon">
                {alert.severity === 'critical' ? '🔴' : '🟡'}
              </span>
              <span>
                {alert.position} cliff in {alert.picksUntilDrop} picks!
                <span className="small">
                  {' '}(drop of {alert.dropOffPoints.toFixed(0)} VOR)
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --testPathPatterns="ScarcityPanel"`
Expected: PASS

---

## Task 6: Create Recommendations Panel Component

**Files:**
- Create: `app/components/Dashboard/RecommendationsPanel.tsx`
- Test: `app/components/Dashboard/__tests__/RecommendationsPanel.test.tsx`

**Step 1: Write the failing test**

```typescript
// app/components/Dashboard/__tests__/RecommendationsPanel.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecommendationsPanel from '../RecommendationsPanel';
import { IPlayerRecommendation } from '../../../lib/models/EnhancedVOR';
import { IPlayerExtended } from '../../../lib/models/Player';

// Mock antd
jest.mock('antd', () => ({
  Tooltip: jest.fn().mockImplementation(({ children }) => children),
  Tag: jest.fn().mockImplementation(({ children }) => <span>{children}</span>),
  Button: jest.fn().mockImplementation(({ children, onClick }) => (
    <button onClick={onClick}>{children}</button>
  )),
}));

describe('RecommendationsPanel', () => {
  const createMockRecommendation = (
    name: string,
    pos: string,
    enhancedVOR: number
  ): IPlayerRecommendation => ({
    player: {
      index: 1,
      key: `${name.toLowerCase()}_${pos}_TEST`,
      name,
      pos: pos as any,
      team: 'TEST',
      bye: 10,
      std: 20,
      halfPpr: 18,
      ppr: 15,
      vor: enhancedVOR - 5,
      forecast: 200,
    },
    enhancedVOR: {
      playerId: `${name.toLowerCase()}_${pos}_TEST`,
      playerName: name,
      position: pos as any,
      baseVOR: enhancedVOR - 5,
      forecast: 200,
      riskAdjustment: 0,
      scheduleAdjustment: 2,
      scarcityPremium: 3,
      enhancedVOR,
      overallRank: 10,
      positionRank: 5,
      adpDiff: 10,
    },
    reasons: ['Good value'],
    urgency: 'high',
    valueIndicator: 'good-value',
  });

  const mockRecommendations: IPlayerRecommendation[] = [
    createMockRecommendation('Player One', 'RB', 80),
    createMockRecommendation('Player Two', 'WR', 75),
    createMockRecommendation('Player Three', 'TE', 70),
  ];

  const defaultProps = {
    recommendations: mockRecommendations,
    onDraft: jest.fn(),
    onViewDetails: jest.fn(),
    currentPick: 15,
    trackedTeam: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render header with pick info', () => {
    render(<RecommendationsPanel {...defaultProps} />);
    expect(screen.getByText(/Top Recommendations/i)).toBeInTheDocument();
  });

  it('should display all recommendations', () => {
    render(<RecommendationsPanel {...defaultProps} />);
    expect(screen.getByText('Player One')).toBeInTheDocument();
    expect(screen.getByText('Player Two')).toBeInTheDocument();
    expect(screen.getByText('Player Three')).toBeInTheDocument();
  });

  it('should call onDraft when recommendation is drafted', () => {
    render(<RecommendationsPanel {...defaultProps} />);
    const draftButtons = screen.getAllByText(/Draft/i);
    fireEvent.click(draftButtons[0]);
    expect(defaultProps.onDraft).toHaveBeenCalled();
  });

  it('should show empty state when no recommendations', () => {
    render(<RecommendationsPanel {...defaultProps} recommendations={[]} />);
    expect(screen.getByText(/No recommendations/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd app && npm test -- --testPathPatterns="RecommendationsPanel"`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// app/components/Dashboard/RecommendationsPanel.tsx
import * as React from 'react';
import { IPlayerRecommendation } from '../../lib/models/EnhancedVOR';
import { IPlayerExtended } from '../../lib/models/Player';
import RecommendationCard from './RecommendationCard';

interface IRecommendationsPanelProps {
  recommendations: IPlayerRecommendation[];
  onDraft: (player: IPlayerExtended) => void;
  onViewDetails: (player: IPlayerExtended) => void;
  currentPick: number;
  trackedTeam: number;
}

/**
 * Panel displaying top player recommendations with
 * VOR breakdowns and draft actions.
 */
export default function RecommendationsPanel({
  recommendations,
  onDraft,
  onViewDetails,
  currentPick,
  trackedTeam,
}: IRecommendationsPanelProps) {
  const round = Math.floor(currentPick / 10) + 1;
  const pickInRound = (currentPick % 10) + 1;

  return (
    <div className="RecommendationsPanel Section">
      <header>
        <h3>Top Recommendations</h3>
        <span className="RecommendationsPanel-Pick">
          Round {round} - Pick {pickInRound}
        </span>
      </header>

      <div className="RecommendationsPanel-List">
        {recommendations.length === 0 ? (
          <p className="RecommendationsPanel-Empty">
            No recommendations available
          </p>
        ) : (
          recommendations.map((rec, idx) => (
            <RecommendationCard
              key={rec.player.key}
              recommendation={rec}
              onDraft={onDraft}
              onViewDetails={onViewDetails}
              rank={idx + 1}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `cd app && npm test -- --testPathPatterns="RecommendationsPanel"`
Expected: PASS

---

## Task 7: Create Dashboard Index and CSS

**Files:**
- Create: `app/components/Dashboard/index.ts`
- Create: `app/components/Dashboard/Dashboard.css`

**Step 1: Create index file**

```typescript
// app/components/Dashboard/index.ts
export { default as RiskSlider } from './RiskSlider';
export { default as ScarcityMeter } from './ScarcityMeter';
export { default as ScarcityPanel } from './ScarcityPanel';
export { default as RecommendationCard } from './RecommendationCard';
export { default as RecommendationsPanel } from './RecommendationsPanel';
export { default as PlayerDetailPopup } from './PlayerDetailPopup';
```

**Step 2: Create Dashboard CSS**

```css
/* app/components/Dashboard/Dashboard.css */

/* Risk Slider */
.RiskSlider {
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 12px;
}

.RiskSlider-Header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.RiskSlider-Label {
  font-weight: 600;
}

.RiskSlider-Value {
  color: #1890ff;
  cursor: help;
}

/* Scarcity Meter */
.ScarcityMeter {
  padding: 8px 12px;
  border-radius: 6px;
  background: #fafafa;
  margin-bottom: 8px;
}

.ScarcityMeter.severity-critical {
  background: #fff1f0;
  border-left: 3px solid #ff4d4f;
}

.ScarcityMeter.severity-high {
  background: #fff7e6;
  border-left: 3px solid #fa8c16;
}

.ScarcityMeter.severity-medium {
  background: #fffbe6;
  border-left: 3px solid #fadb14;
}

.ScarcityMeter-Header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ScarcityMeter-Position {
  font-weight: 600;
  font-size: 14px;
}

.ScarcityMeter-Bar {
  height: 6px;
  background: #e8e8e8;
  border-radius: 3px;
  margin: 6px 0;
  overflow: hidden;
}

.ScarcityMeter-Fill {
  height: 100%;
  background: linear-gradient(90deg, #52c41a, #fadb14, #ff4d4f);
  transition: width 0.3s ease;
}

.ScarcityMeter-Details {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #8c8c8c;
}

/* Recommendation Card */
.RecommendationCard {
  display: flex;
  align-items: stretch;
  padding: 12px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: box-shadow 0.2s ease;
}

.RecommendationCard:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.RecommendationCard-Rank {
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #1890ff;
}

.RecommendationCard-Content {
  flex: 1;
  padding: 0 12px;
}

.RecommendationCard-Header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.RecommendationCard-Name {
  font-weight: 600;
}

.RecommendationCard-Team {
  color: #8c8c8c;
  font-size: 12px;
}

.RecommendationCard-Stats {
  display: flex;
  gap: 16px;
  margin-bottom: 4px;
}

.RecommendationCard-VOR {
  font-weight: 600;
  color: #52c41a;
}

.RecommendationCard-ADP {
  color: #1890ff;
}

.RecommendationCard-Indicators {
  margin-bottom: 4px;
}

.RecommendationCard-Reasons {
  font-size: 11px;
  color: #8c8c8c;
}

.RecommendationCard-Reason {
  display: block;
}

.RecommendationCard-Actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
}

/* Scarcity Panel */
.ScarcityPanel {
  padding: 12px;
}

.ScarcityPanel-Alerts {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e8e8e8;
}

.ScarcityPanel-Alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 4px;
}

.ScarcityPanel-Alert.severity-critical {
  background: #fff1f0;
}

.ScarcityPanel-Alert.severity-warning {
  background: #fffbe6;
}

/* Recommendations Panel */
.RecommendationsPanel {
  padding: 12px;
}

.RecommendationsPanel-Pick {
  font-size: 12px;
  color: #8c8c8c;
}

.RecommendationsPanel-Empty {
  text-align: center;
  color: #8c8c8c;
  padding: 24px;
}

/* Player Detail Popup */
.PlayerDetail section {
  margin-bottom: 16px;
}

.PlayerDetail h4 {
  margin-bottom: 8px;
  color: #1890ff;
  border-bottom: 1px solid #e8e8e8;
  padding-bottom: 4px;
}

.PlayerDetail-VOR-Row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.PlayerDetail-VOR-Total {
  border-top: 1px solid #e8e8e8;
  margin-top: 8px;
  padding-top: 8px;
  font-size: 16px;
}

.PlayerDetail-Risk-Row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.PlayerDetail-Risk-Row span:first-child {
  width: 100px;
}
```

**Step 3: Run all Dashboard tests**

Run: `cd app && npm test -- --testPathPatterns="Dashboard"`
Expected: All tests PASS

---

## Task 8: Integration Test for Dashboard Components

**Files:**
- Create: `app/components/Dashboard/__tests__/DashboardIntegration.test.tsx`

**Step 1: Write integration tests**

```typescript
// app/components/Dashboard/__tests__/DashboardIntegration.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  RiskSlider,
  ScarcityMeter,
  ScarcityPanel,
  RecommendationCard,
  RecommendationsPanel,
  PlayerDetailPopup,
} from '../index';

// Mock antd
jest.mock('antd', () => ({
  Slider: jest.fn().mockImplementation(({ value }) => (
    <input data-testid="risk-slider" type="range" value={value} readOnly />
  )),
  Modal: jest.fn().mockImplementation(({ open, children }) => (
    open ? <div data-testid="modal">{children}</div> : null
  )),
  Progress: jest.fn().mockImplementation(() => <div data-testid="progress" />),
  Tooltip: jest.fn().mockImplementation(({ children }) => children),
  Tag: jest.fn().mockImplementation(({ children }) => <span>{children}</span>),
  Button: jest.fn().mockImplementation(({ children, onClick }) => (
    <button onClick={onClick}>{children}</button>
  )),
}));

describe('Dashboard Components Integration', () => {
  describe('Component Exports', () => {
    it('should export RiskSlider', () => {
      expect(RiskSlider).toBeDefined();
    });

    it('should export ScarcityMeter', () => {
      expect(ScarcityMeter).toBeDefined();
    });

    it('should export ScarcityPanel', () => {
      expect(ScarcityPanel).toBeDefined();
    });

    it('should export RecommendationCard', () => {
      expect(RecommendationCard).toBeDefined();
    });

    it('should export RecommendationsPanel', () => {
      expect(RecommendationsPanel).toBeDefined();
    });

    it('should export PlayerDetailPopup', () => {
      expect(PlayerDetailPopup).toBeDefined();
    });
  });

  describe('Component Rendering', () => {
    it('should render RiskSlider without errors', () => {
      render(<RiskSlider value={0.5} onChange={jest.fn()} />);
      expect(screen.getByTestId('risk-slider')).toBeInTheDocument();
    });

    it('should render ScarcityMeter without errors', () => {
      render(
        <ScarcityMeter
          position="RB"
          severity="high"
          tier1Remaining={3}
          tier2Remaining={8}
          totalRemaining={25}
        />
      );
      expect(screen.getByText('RB')).toBeInTheDocument();
    });

    it('should render ScarcityPanel without errors', () => {
      render(
        <ScarcityPanel
          premiums={[{ position: 'RB', premium: 5, severity: 'medium' }]}
          alerts={[]}
        />
      );
      expect(screen.getByText(/Position Scarcity/i)).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run integration tests**

Run: `cd app && npm test -- --testPathPatterns="DashboardIntegration"`
Expected: All tests PASS

**Step 3: Run all tests to verify no regressions**

Run: `cd app && npm test`
Expected: All 460+ tests PASS

---

## Execution Summary

| Task | Component | Tests |
|------|-----------|-------|
| 1 | RiskSlider | 5 |
| 2 | ScarcityMeter | 5 |
| 3 | RecommendationCard | 7 |
| 4 | PlayerDetailPopup | 8 |
| 5 | ScarcityPanel | 4 |
| 6 | RecommendationsPanel | 4 |
| 7 | Dashboard Index & CSS | 0 |
| 8 | Integration Tests | 9 |

**Total new tests:** ~42 tests
