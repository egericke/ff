// app/components/Dashboard/__tests__/PlayerDetailPopup.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerDetailPopup from '../PlayerDetailPopup';
import { IEnhancedVOR } from '../../../lib/models/EnhancedVOR';
import { IPlayerExtended } from '../../../lib/models/Player';

// Mock antd Modal
jest.mock('antd', () => ({
  Modal: jest.fn().mockImplementation(({ open, onCancel, children, title, footer }) => (
    open ? (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        <button data-testid="modal-close" onClick={onCancel}>Close</button>
        {children}
        {footer && <div data-testid="modal-footer">{footer}</div>}
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
    expect(screen.getByText(/35%/)).toBeInTheDocument();
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
