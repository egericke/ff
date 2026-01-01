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
