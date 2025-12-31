import {
  ScarcitySeverity,
  AlertSeverity,
  IPositionSupply,
  IScarcityPremium,
  IDropOffAlert,
  IScarcitySettings,
  IDraftScarcityState,
  DEFAULT_SCARCITY_SETTINGS,
  isValidScarcityState,
} from '../Scarcity';
import { Position } from '../Player';

describe('Scarcity Model Interfaces', () => {
  describe('ScarcitySeverity', () => {
    it('should accept valid scarcity severity values', () => {
      const severities: ScarcitySeverity[] = [
        'none',
        'low',
        'medium',
        'high',
        'critical',
      ];
      expect(severities).toHaveLength(5);
      expect(severities).toContain('none');
      expect(severities).toContain('low');
      expect(severities).toContain('medium');
      expect(severities).toContain('high');
      expect(severities).toContain('critical');
    });
  });

  describe('AlertSeverity', () => {
    it('should accept valid alert severity values', () => {
      const severities: AlertSeverity[] = ['warning', 'critical'];
      expect(severities).toHaveLength(2);
      expect(severities).toContain('warning');
      expect(severities).toContain('critical');
    });
  });

  describe('IPositionSupply', () => {
    it('should have all required properties', () => {
      const supply: IPositionSupply = {
        position: 'RB',
        totalPlayers: 60,
        draftedCount: 15,
        remainingCount: 45,
        tier1Remaining: 3,
        tier2Remaining: 12,
        tier3Remaining: 30,
      };

      expect(supply.position).toBe('RB');
      expect(supply.totalPlayers).toBe(60);
      expect(supply.draftedCount).toBe(15);
      expect(supply.remainingCount).toBe(45);
      expect(supply.tier1Remaining).toBe(3);
      expect(supply.tier2Remaining).toBe(12);
      expect(supply.tier3Remaining).toBe(30);
    });

    it('should track tier counts for elite, good, and flex/bench players', () => {
      const wideReceiverSupply: IPositionSupply = {
        position: 'WR',
        totalPlayers: 80,
        draftedCount: 20,
        remainingCount: 60,
        tier1Remaining: 5, // elite players
        tier2Remaining: 15, // good starters
        tier3Remaining: 40, // flex/bench
      };

      // Tier 1 should represent elite players
      expect(wideReceiverSupply.tier1Remaining).toBeLessThan(
        wideReceiverSupply.tier2Remaining
      );
      // Tier 2 should represent good starters
      expect(wideReceiverSupply.tier2Remaining).toBeLessThan(
        wideReceiverSupply.tier3Remaining
      );
    });

    it('should handle depleted positions', () => {
      const depletedTE: IPositionSupply = {
        position: 'TE',
        totalPlayers: 20,
        draftedCount: 18,
        remainingCount: 2,
        tier1Remaining: 0,
        tier2Remaining: 0,
        tier3Remaining: 2,
      };

      expect(depletedTE.tier1Remaining).toBe(0);
      expect(depletedTE.tier2Remaining).toBe(0);
      expect(depletedTE.remainingCount).toBe(2);
    });
  });

  describe('IScarcityPremium', () => {
    it('should have all required properties', () => {
      const premium: IScarcityPremium = {
        position: 'TE',
        premium: 15.5,
        severity: 'high',
      };

      expect(premium.position).toBe('TE');
      expect(premium.premium).toBe(15.5);
      expect(premium.severity).toBe('high');
    });

    it('should support optional message property', () => {
      const premiumWithMessage: IScarcityPremium = {
        position: 'RB',
        premium: 25.0,
        severity: 'critical',
        message: 'Only 2 elite RBs remaining',
      };

      expect(premiumWithMessage.message).toBe('Only 2 elite RBs remaining');
    });

    it('should work without optional message', () => {
      const premiumWithoutMessage: IScarcityPremium = {
        position: 'QB',
        premium: 5.0,
        severity: 'low',
      };

      expect(premiumWithoutMessage.message).toBeUndefined();
    });

    it('should support all severity levels', () => {
      const noPremium: IScarcityPremium = {
        position: 'K',
        premium: 0,
        severity: 'none',
      };
      const lowPremium: IScarcityPremium = {
        position: 'DST',
        premium: 1.5,
        severity: 'low',
      };
      const mediumPremium: IScarcityPremium = {
        position: 'QB',
        premium: 6.0,
        severity: 'medium',
      };
      const highPremium: IScarcityPremium = {
        position: 'WR',
        premium: 12.0,
        severity: 'high',
      };
      const criticalPremium: IScarcityPremium = {
        position: 'TE',
        premium: 20.0,
        severity: 'critical',
      };

      expect(noPremium.severity).toBe('none');
      expect(lowPremium.severity).toBe('low');
      expect(mediumPremium.severity).toBe('medium');
      expect(highPremium.severity).toBe('high');
      expect(criticalPremium.severity).toBe('critical');
    });
  });

  describe('IDropOffAlert', () => {
    it('should have all required properties', () => {
      const alert: IDropOffAlert = {
        position: 'RB',
        currentTierAvgVOR: 45.5,
        nextTierAvgVOR: 18.2,
        dropOffPoints: 27.3,
        picksUntilDrop: 3,
        severity: 'critical',
      };

      expect(alert.position).toBe('RB');
      expect(alert.currentTierAvgVOR).toBe(45.5);
      expect(alert.nextTierAvgVOR).toBe(18.2);
      expect(alert.dropOffPoints).toBe(27.3);
      expect(alert.picksUntilDrop).toBe(3);
      expect(alert.severity).toBe('critical');
    });

    it('should support warning severity', () => {
      const warningAlert: IDropOffAlert = {
        position: 'WR',
        currentTierAvgVOR: 32.0,
        nextTierAvgVOR: 12.0,
        dropOffPoints: 20.0,
        picksUntilDrop: 8,
        severity: 'warning',
      };

      expect(warningAlert.severity).toBe('warning');
    });

    it('should support critical severity', () => {
      const criticalAlert: IDropOffAlert = {
        position: 'TE',
        currentTierAvgVOR: 55.0,
        nextTierAvgVOR: 10.0,
        dropOffPoints: 45.0,
        picksUntilDrop: 2,
        severity: 'critical',
      };

      expect(criticalAlert.severity).toBe('critical');
    });

    it('should calculate drop off as difference between tier averages', () => {
      const alert: IDropOffAlert = {
        position: 'QB',
        currentTierAvgVOR: 40.0,
        nextTierAvgVOR: 15.0,
        dropOffPoints: 25.0,
        picksUntilDrop: 5,
        severity: 'warning',
      };

      const calculatedDropOff =
        alert.currentTierAvgVOR - alert.nextTierAvgVOR;
      expect(alert.dropOffPoints).toBe(calculatedDropOff);
    });
  });

  describe('IScarcitySettings', () => {
    it('should have all required properties', () => {
      const settings: IScarcitySettings = {
        tierThresholds: { tier1: 50, tier2: 25 },
        premiumMultipliers: { low: 1.5, medium: 3, high: 5, critical: 8 },
        dropOffThreshold: 25,
        positionWeights: { QB: 0.8, RB: 1.2, WR: 1.0 },
      };

      expect(settings.tierThresholds.tier1).toBe(50);
      expect(settings.tierThresholds.tier2).toBe(25);
      expect(settings.premiumMultipliers.low).toBe(1.5);
      expect(settings.premiumMultipliers.medium).toBe(3);
      expect(settings.premiumMultipliers.high).toBe(5);
      expect(settings.premiumMultipliers.critical).toBe(8);
      expect(settings.dropOffThreshold).toBe(25);
      expect(settings.positionWeights.QB).toBe(0.8);
    });

    it('should allow partial position weights', () => {
      const partialSettings: IScarcitySettings = {
        tierThresholds: { tier1: 60, tier2: 30 },
        premiumMultipliers: { low: 2, medium: 4, high: 6, critical: 10 },
        dropOffThreshold: 30,
        positionWeights: { RB: 1.3 }, // Only RB weight defined
      };

      expect(partialSettings.positionWeights.RB).toBe(1.3);
      expect(partialSettings.positionWeights.QB).toBeUndefined();
    });
  });

  describe('IDraftScarcityState', () => {
    it('should have all required properties', () => {
      const state: IDraftScarcityState = {
        currentPick: 25,
        positionSupply: {},
        scarcityPremiums: [],
        activeAlerts: [],
      };

      expect(state.currentPick).toBe(25);
      expect(state.positionSupply).toBeDefined();
      expect(state.scarcityPremiums).toHaveLength(0);
      expect(state.activeAlerts).toHaveLength(0);
    });

    it('should support position supply for multiple positions', () => {
      const rbSupply: IPositionSupply = {
        position: 'RB',
        totalPlayers: 60,
        draftedCount: 15,
        remainingCount: 45,
        tier1Remaining: 3,
        tier2Remaining: 12,
        tier3Remaining: 30,
      };

      const wrSupply: IPositionSupply = {
        position: 'WR',
        totalPlayers: 80,
        draftedCount: 20,
        remainingCount: 60,
        tier1Remaining: 5,
        tier2Remaining: 15,
        tier3Remaining: 40,
      };

      const state: IDraftScarcityState = {
        currentPick: 50,
        positionSupply: {
          RB: rbSupply,
          WR: wrSupply,
        },
        scarcityPremiums: [],
        activeAlerts: [],
      };

      expect(state.positionSupply.RB).toBeDefined();
      expect(state.positionSupply.WR).toBeDefined();
      expect(state.positionSupply.RB?.tier1Remaining).toBe(3);
      expect(state.positionSupply.WR?.tier1Remaining).toBe(5);
    });

    it('should support multiple scarcity premiums', () => {
      const state: IDraftScarcityState = {
        currentPick: 75,
        positionSupply: {},
        scarcityPremiums: [
          { position: 'TE', premium: 15.0, severity: 'high' },
          { position: 'RB', premium: 8.0, severity: 'medium' },
        ],
        activeAlerts: [],
      };

      expect(state.scarcityPremiums).toHaveLength(2);
      expect(state.scarcityPremiums[0].position).toBe('TE');
      expect(state.scarcityPremiums[1].position).toBe('RB');
    });

    it('should support multiple active alerts', () => {
      const state: IDraftScarcityState = {
        currentPick: 80,
        positionSupply: {},
        scarcityPremiums: [],
        activeAlerts: [
          {
            position: 'TE',
            currentTierAvgVOR: 50.0,
            nextTierAvgVOR: 10.0,
            dropOffPoints: 40.0,
            picksUntilDrop: 2,
            severity: 'critical',
          },
          {
            position: 'RB',
            currentTierAvgVOR: 35.0,
            nextTierAvgVOR: 15.0,
            dropOffPoints: 20.0,
            picksUntilDrop: 5,
            severity: 'warning',
          },
        ],
      };

      expect(state.activeAlerts).toHaveLength(2);
      expect(state.activeAlerts[0].severity).toBe('critical');
      expect(state.activeAlerts[1].severity).toBe('warning');
    });
  });

  describe('DEFAULT_SCARCITY_SETTINGS', () => {
    it('should have correct tier thresholds', () => {
      expect(DEFAULT_SCARCITY_SETTINGS.tierThresholds.tier1).toBe(50);
      expect(DEFAULT_SCARCITY_SETTINGS.tierThresholds.tier2).toBe(25);
    });

    it('should have correct premium multipliers', () => {
      expect(DEFAULT_SCARCITY_SETTINGS.premiumMultipliers.low).toBe(1.5);
      expect(DEFAULT_SCARCITY_SETTINGS.premiumMultipliers.medium).toBe(3);
      expect(DEFAULT_SCARCITY_SETTINGS.premiumMultipliers.high).toBe(5);
      expect(DEFAULT_SCARCITY_SETTINGS.premiumMultipliers.critical).toBe(8);
    });

    it('should have correct drop off threshold', () => {
      expect(DEFAULT_SCARCITY_SETTINGS.dropOffThreshold).toBe(25);
    });

    it('should have correct position weights', () => {
      expect(DEFAULT_SCARCITY_SETTINGS.positionWeights.QB).toBe(0.8);
      expect(DEFAULT_SCARCITY_SETTINGS.positionWeights.RB).toBe(1.2);
      expect(DEFAULT_SCARCITY_SETTINGS.positionWeights.WR).toBe(1.0);
      expect(DEFAULT_SCARCITY_SETTINGS.positionWeights.TE).toBe(1.1);
      expect(DEFAULT_SCARCITY_SETTINGS.positionWeights.K).toBe(0.3);
      expect(DEFAULT_SCARCITY_SETTINGS.positionWeights.DST).toBe(0.3);
    });

    it('should have higher weight for RB due to scarcity', () => {
      expect(DEFAULT_SCARCITY_SETTINGS.positionWeights.RB).toBeGreaterThan(
        DEFAULT_SCARCITY_SETTINGS.positionWeights.QB!
      );
      expect(DEFAULT_SCARCITY_SETTINGS.positionWeights.RB).toBeGreaterThan(
        DEFAULT_SCARCITY_SETTINGS.positionWeights.WR!
      );
    });

    it('should have lower weights for K and DST', () => {
      expect(DEFAULT_SCARCITY_SETTINGS.positionWeights.K).toBeLessThan(1);
      expect(DEFAULT_SCARCITY_SETTINGS.positionWeights.DST).toBeLessThan(1);
      expect(DEFAULT_SCARCITY_SETTINGS.positionWeights.K).toBe(
        DEFAULT_SCARCITY_SETTINGS.positionWeights.DST
      );
    });
  });

  describe('isValidScarcityState', () => {
    it('should return true for valid scarcity state', () => {
      const validState: IDraftScarcityState = {
        currentPick: 25,
        positionSupply: {},
        scarcityPremiums: [],
        activeAlerts: [],
      };
      expect(isValidScarcityState(validState)).toBe(true);
    });

    it('should return true for state with position supply', () => {
      const stateWithSupply: IDraftScarcityState = {
        currentPick: 50,
        positionSupply: {
          RB: {
            position: 'RB',
            totalPlayers: 60,
            draftedCount: 15,
            remainingCount: 45,
            tier1Remaining: 3,
            tier2Remaining: 12,
            tier3Remaining: 30,
          },
        },
        scarcityPremiums: [],
        activeAlerts: [],
      };
      expect(isValidScarcityState(stateWithSupply)).toBe(true);
    });

    it('should return true for state with scarcity premiums', () => {
      const stateWithPremiums: IDraftScarcityState = {
        currentPick: 75,
        positionSupply: {},
        scarcityPremiums: [
          { position: 'TE', premium: 15.0, severity: 'high' },
        ],
        activeAlerts: [],
      };
      expect(isValidScarcityState(stateWithPremiums)).toBe(true);
    });

    it('should return true for state with active alerts', () => {
      const stateWithAlerts: IDraftScarcityState = {
        currentPick: 80,
        positionSupply: {},
        scarcityPremiums: [],
        activeAlerts: [
          {
            position: 'TE',
            currentTierAvgVOR: 50.0,
            nextTierAvgVOR: 10.0,
            dropOffPoints: 40.0,
            picksUntilDrop: 2,
            severity: 'critical',
          },
        ],
      };
      expect(isValidScarcityState(stateWithAlerts)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isValidScarcityState(null)).toBe(false);
      expect(isValidScarcityState(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isValidScarcityState('string')).toBe(false);
      expect(isValidScarcityState(123)).toBe(false);
      expect(isValidScarcityState([])).toBe(false);
    });

    it('should return false for missing currentPick', () => {
      const missingCurrentPick = {
        positionSupply: {},
        scarcityPremiums: [],
        activeAlerts: [],
      };
      expect(isValidScarcityState(missingCurrentPick)).toBe(false);
    });

    it('should return false for missing positionSupply', () => {
      const missingPositionSupply = {
        currentPick: 25,
        scarcityPremiums: [],
        activeAlerts: [],
      };
      expect(isValidScarcityState(missingPositionSupply)).toBe(false);
    });

    it('should return false for missing scarcityPremiums', () => {
      const missingScarcityPremiums = {
        currentPick: 25,
        positionSupply: {},
        activeAlerts: [],
      };
      expect(isValidScarcityState(missingScarcityPremiums)).toBe(false);
    });

    it('should return false for missing activeAlerts', () => {
      const missingActiveAlerts = {
        currentPick: 25,
        positionSupply: {},
        scarcityPremiums: [],
      };
      expect(isValidScarcityState(missingActiveAlerts)).toBe(false);
    });

    it('should return false for negative currentPick', () => {
      const negativeCurrentPick = {
        currentPick: -1,
        positionSupply: {},
        scarcityPremiums: [],
        activeAlerts: [],
      };
      expect(isValidScarcityState(negativeCurrentPick)).toBe(false);
    });

    it('should return false for non-number currentPick', () => {
      const nonNumberCurrentPick = {
        currentPick: '25',
        positionSupply: {},
        scarcityPremiums: [],
        activeAlerts: [],
      };
      expect(isValidScarcityState(nonNumberCurrentPick)).toBe(false);
    });

    it('should return false for non-object positionSupply', () => {
      const nonObjectPositionSupply = {
        currentPick: 25,
        positionSupply: [],
        scarcityPremiums: [],
        activeAlerts: [],
      };
      expect(isValidScarcityState(nonObjectPositionSupply)).toBe(false);
    });

    it('should return false for non-array scarcityPremiums', () => {
      const nonArrayScarcityPremiums = {
        currentPick: 25,
        positionSupply: {},
        scarcityPremiums: {},
        activeAlerts: [],
      };
      expect(isValidScarcityState(nonArrayScarcityPremiums)).toBe(false);
    });

    it('should return false for non-array activeAlerts', () => {
      const nonArrayActiveAlerts = {
        currentPick: 25,
        positionSupply: {},
        scarcityPremiums: [],
        activeAlerts: {},
      };
      expect(isValidScarcityState(nonArrayActiveAlerts)).toBe(false);
    });

    it('should return true for currentPick of 0 (before draft starts)', () => {
      const zeroCurrentPick = {
        currentPick: 0,
        positionSupply: {},
        scarcityPremiums: [],
        activeAlerts: [],
      };
      expect(isValidScarcityState(zeroCurrentPick)).toBe(true);
    });
  });
});
