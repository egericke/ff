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
    expect(screen.getByText(/ADP:.*\+13/)).toBeInTheDocument();
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
