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
