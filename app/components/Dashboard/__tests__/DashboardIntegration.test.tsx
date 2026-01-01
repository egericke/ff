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
