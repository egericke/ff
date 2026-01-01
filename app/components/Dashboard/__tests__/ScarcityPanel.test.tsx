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
