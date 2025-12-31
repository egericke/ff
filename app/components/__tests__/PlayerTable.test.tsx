import React from 'react';
import { render, cleanup } from '@testing-library/react';
import PlayerTable from '../PlayerTable';
import { IPlayer, Position } from '../../lib/models/Player';

// Mock antd components
jest.mock('antd', () => {
  return {
    Input: {
      Search: jest.fn().mockImplementation(({ onChange, value }) => {
        return React.createElement('input', {
          'data-testid': 'search-input',
          onChange,
          value,
        });
      }),
    },
    Tooltip: jest.fn().mockImplementation(({ children }) => children),
    Button: jest.fn().mockImplementation(({ children, onClick }) => {
      return React.createElement('button', { onClick }, children);
    }),
  };
});

// Mock @ant-design/icons
jest.mock('@ant-design/icons', () => ({
  DeleteOutlined: jest.fn().mockImplementation(() => {
    return React.createElement('span', { 'data-testid': 'delete-icon' }, 'X');
  }),
}));

interface ITablePlayer extends IPlayer {
  tableName: string;
}

const createMockPlayer = (
  index: number,
  name: string,
  pos: Position = 'RB'
): ITablePlayer => ({
  index,
  key: `player-${index}`,
  name,
  tableName: name,
  pos,
  team: 'TEST',
  bye: 7,
  std: 10 + index,
  halfPpr: 10 + index,
  ppr: 10 + index,
  forecast: 100 - index * 10,
  vor: 50 - index * 5,
});

const defaultProps = {
  adpCol: 'std',
  byeWeeks: {} as { [key: number]: boolean },
  currentPick: 1,
  mobile: false,
  nameFilter: '',
  onPickPlayer: jest.fn(),
  positionsToShow: ['?'] as Position[],
  rbHandcuffs: new Set<IPlayer>(),
  recommended: new Set<IPlayer>(),
  resetPositionFilter: jest.fn(),
  onRemovePlayer: jest.fn(),
  setNameFilter: jest.fn(),
  togglePositionFilter: jest.fn(),
  skip: jest.fn(),
  undo: jest.fn(),
  valuedPositions: { RB: true, WR: true, QB: true, TE: true, DST: true, K: true },
};

describe('PlayerTable', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('filtered player index mapping', () => {
    it('should correctly map draftSoon indicators when middle player is filtered out', () => {
      // Create 3 players
      const players = [
        createMockPlayer(0, 'Player One'),   // index 0 - should show draftSoon
        createMockPlayer(1, 'Player Two'),   // index 1 - will be filtered out
        createMockPlayer(2, 'Player Three'), // index 2 - should show draftSoon
      ];

      // Filter out the middle player (index 1)
      const filteredPlayers = [false, true, false];

      // Both first and third players should show draftSoon
      const draftSoon = [true, false, true];

      render(
        <PlayerTable
          {...defaultProps}
          players={players}
          filteredPlayers={filteredPlayers}
          draftSoon={draftSoon}
        />
      );

      // Get all rendered player rows by looking for orange dots in the table body
      // (exclude the legend which also has an orange dot)
      const tableBody = document.querySelector('#table-body');
      const orangeDots = tableBody?.querySelectorAll('.orange-dot') || [];

      // With correct index mapping, both visible players (0 and 2) should have orange dots
      // because draftSoon[0] = true and draftSoon[2] = true
      expect(orangeDots.length).toBe(2);
    });

    it('should show no draftSoon indicators when only filtered players have them', () => {
      // Create 3 players
      const players = [
        createMockPlayer(0, 'Player One'),
        createMockPlayer(1, 'Player Two'),   // will be filtered out
        createMockPlayer(2, 'Player Three'),
      ];

      // Filter out the middle player (index 1)
      const filteredPlayers = [false, true, false];

      // Only the filtered player (index 1) has draftSoon
      const draftSoon = [false, true, false];

      render(
        <PlayerTable
          {...defaultProps}
          players={players}
          filteredPlayers={filteredPlayers}
          draftSoon={draftSoon}
        />
      );

      // With correct index mapping, no visible players should have orange dots
      // because draftSoon[0] = false and draftSoon[2] = false
      const tableBody = document.querySelector('#table-body');
      const orangeDots = tableBody?.querySelectorAll('.orange-dot') || [];
      expect(orangeDots.length).toBe(0);
    });

    it('should correctly render first player draftSoon when second is filtered', () => {
      // Create 2 players
      const players = [
        createMockPlayer(0, 'First Player'),  // index 0 - visible, draftSoon = true
        createMockPlayer(1, 'Second Player'), // index 1 - filtered out
      ];

      // Filter out the second player
      const filteredPlayers = [false, true];

      // First player should show draftSoon
      const draftSoon = [true, false];

      render(
        <PlayerTable
          {...defaultProps}
          players={players}
          filteredPlayers={filteredPlayers}
          draftSoon={draftSoon}
        />
      );

      const tableBody = document.querySelector('#table-body');
      const orangeDots = tableBody?.querySelectorAll('.orange-dot') || [];
      expect(orangeDots.length).toBe(1);
    });

    it('should not show draftSoon for first visible player if using wrong (post-filter) index', () => {
      // This test specifically validates the bug fix
      // With the BUG: filter().map() creates new indices starting from 0
      // Player Three (original index 2) would incorrectly get draftSoon[0] = true
      // instead of draftSoon[2] = false

      const players = [
        createMockPlayer(0, 'Player One'),   // filtered out
        createMockPlayer(1, 'Player Two'),   // filtered out
        createMockPlayer(2, 'Player Three'), // visible - should NOT have draftSoon
      ];

      // Filter out first two players
      const filteredPlayers = [true, true, false];

      // Only filtered players have draftSoon, visible player does not
      const draftSoon = [true, true, false];

      render(
        <PlayerTable
          {...defaultProps}
          players={players}
          filteredPlayers={filteredPlayers}
          draftSoon={draftSoon}
        />
      );

      // With CORRECT index mapping: Player Three uses draftSoon[2] = false, no orange dot
      // With BUG (filter.map): Player Three would use draftSoon[0] = true, orange dot shown
      const tableBody = document.querySelector('#table-body');
      const orangeDots = tableBody?.querySelectorAll('.orange-dot') || [];
      expect(orangeDots.length).toBe(0);
    });
  });
});
