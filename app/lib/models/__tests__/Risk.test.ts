import {
  HealthStatus,
  IInjuryHistory,
  IRiskProfile,
  IPositionAgeThresholds,
  IPositionBaseRisk,
  IRiskSettings,
  DEFAULT_RISK_SETTINGS,
  isValidRiskProfile,
} from '../Risk';

describe('Risk Model Interfaces', () => {
  describe('HealthStatus', () => {
    it('should accept valid health status values', () => {
      const statuses: HealthStatus[] = [
        'healthy',
        'questionable',
        'doubtful',
        'out',
        'ir',
      ];
      expect(statuses).toHaveLength(5);
      expect(statuses).toContain('healthy');
      expect(statuses).toContain('questionable');
      expect(statuses).toContain('doubtful');
      expect(statuses).toContain('out');
      expect(statuses).toContain('ir');
    });
  });

  describe('IInjuryHistory', () => {
    it('should have gamesPlayed as a 3-year array', () => {
      const injuryHistory: IInjuryHistory = {
        gamesPlayed: [16, 14, 17],
        currentStatus: 'healthy',
      };
      expect(injuryHistory.gamesPlayed).toHaveLength(3);
      expect(injuryHistory.currentStatus).toBe('healthy');
    });

    it('should accept different current status values', () => {
      const injured: IInjuryHistory = {
        gamesPlayed: [10, 8, 12],
        currentStatus: 'questionable',
      };
      expect(injured.currentStatus).toBe('questionable');
    });
  });

  describe('IRiskProfile', () => {
    it('should have all required properties', () => {
      const riskProfile: IRiskProfile = {
        injuryScore: 50,
        consistencyScore: 0.75,
        floor: 5.0,
        ceiling: 25.0,
        weeklyVariance: 8.5,
      };

      expect(riskProfile.injuryScore).toBe(50);
      expect(riskProfile.consistencyScore).toBe(0.75);
      expect(riskProfile.floor).toBe(5.0);
      expect(riskProfile.ceiling).toBe(25.0);
      expect(riskProfile.weeklyVariance).toBe(8.5);
    });

    it('should represent injury score in 0-100 range', () => {
      const lowRisk: IRiskProfile = {
        injuryScore: 0,
        consistencyScore: 0.9,
        floor: 10,
        ceiling: 20,
        weeklyVariance: 3,
      };

      const highRisk: IRiskProfile = {
        injuryScore: 100,
        consistencyScore: 0.3,
        floor: 2,
        ceiling: 30,
        weeklyVariance: 15,
      };

      expect(lowRisk.injuryScore).toBeGreaterThanOrEqual(0);
      expect(lowRisk.injuryScore).toBeLessThanOrEqual(100);
      expect(highRisk.injuryScore).toBeGreaterThanOrEqual(0);
      expect(highRisk.injuryScore).toBeLessThanOrEqual(100);
    });

    it('should represent consistency score in 0-1 range', () => {
      const profile: IRiskProfile = {
        injuryScore: 25,
        consistencyScore: 0.5,
        floor: 8,
        ceiling: 18,
        weeklyVariance: 5,
      };

      expect(profile.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(profile.consistencyScore).toBeLessThanOrEqual(1);
    });
  });

  describe('IPositionAgeThresholds', () => {
    it('should have thresholds for all positions', () => {
      const thresholds: IPositionAgeThresholds = {
        QB: 35,
        RB: 27,
        WR: 30,
        TE: 30,
        K: 38,
        DST: 99,
      };

      expect(thresholds.QB).toBe(35);
      expect(thresholds.RB).toBe(27);
      expect(thresholds.WR).toBe(30);
      expect(thresholds.TE).toBe(30);
      expect(thresholds.K).toBe(38);
      expect(thresholds.DST).toBe(99);
    });
  });

  describe('IPositionBaseRisk', () => {
    it('should have base risk values for all positions', () => {
      const baseRisk: IPositionBaseRisk = {
        QB: 0.2,
        RB: 0.7,
        WR: 0.4,
        TE: 0.5,
        K: 0.1,
        DST: 0.1,
      };

      expect(baseRisk.QB).toBe(0.2);
      expect(baseRisk.RB).toBe(0.7);
      expect(baseRisk.WR).toBe(0.4);
      expect(baseRisk.TE).toBe(0.5);
      expect(baseRisk.K).toBe(0.1);
      expect(baseRisk.DST).toBe(0.1);
    });
  });

  describe('IRiskSettings', () => {
    it('should have all required properties', () => {
      const settings: IRiskSettings = {
        riskTolerance: 0.5,
        positionAgeThresholds: {
          QB: 35,
          RB: 27,
          WR: 30,
          TE: 30,
          K: 38,
          DST: 99,
        },
        positionBaseRisk: {
          QB: 0.2,
          RB: 0.7,
          WR: 0.4,
          TE: 0.5,
          K: 0.1,
          DST: 0.1,
        },
        weights: {
          historical: 0.4,
          age: 0.25,
          position: 0.2,
          status: 0.15,
        },
      };

      expect(settings.riskTolerance).toBe(0.5);
      expect(settings.positionAgeThresholds).toBeDefined();
      expect(settings.positionBaseRisk).toBeDefined();
      expect(settings.weights).toBeDefined();
    });
  });

  describe('DEFAULT_RISK_SETTINGS', () => {
    it('should have riskTolerance of 0.5 (balanced)', () => {
      expect(DEFAULT_RISK_SETTINGS.riskTolerance).toBe(0.5);
    });

    it('should have correct position age thresholds', () => {
      expect(DEFAULT_RISK_SETTINGS.positionAgeThresholds.QB).toBe(35);
      expect(DEFAULT_RISK_SETTINGS.positionAgeThresholds.RB).toBe(27);
      expect(DEFAULT_RISK_SETTINGS.positionAgeThresholds.WR).toBe(30);
      expect(DEFAULT_RISK_SETTINGS.positionAgeThresholds.TE).toBe(30);
      expect(DEFAULT_RISK_SETTINGS.positionAgeThresholds.K).toBe(38);
      expect(DEFAULT_RISK_SETTINGS.positionAgeThresholds.DST).toBe(99);
    });

    it('should have correct position base risk values', () => {
      expect(DEFAULT_RISK_SETTINGS.positionBaseRisk.QB).toBe(0.2);
      expect(DEFAULT_RISK_SETTINGS.positionBaseRisk.RB).toBe(0.7);
      expect(DEFAULT_RISK_SETTINGS.positionBaseRisk.WR).toBe(0.4);
      expect(DEFAULT_RISK_SETTINGS.positionBaseRisk.TE).toBe(0.5);
      expect(DEFAULT_RISK_SETTINGS.positionBaseRisk.K).toBe(0.1);
      expect(DEFAULT_RISK_SETTINGS.positionBaseRisk.DST).toBe(0.1);
    });

    it('should have correct weights that sum to 1', () => {
      const { weights } = DEFAULT_RISK_SETTINGS;
      expect(weights.historical).toBe(0.4);
      expect(weights.age).toBe(0.25);
      expect(weights.position).toBe(0.2);
      expect(weights.status).toBe(0.15);

      const sum =
        weights.historical + weights.age + weights.position + weights.status;
      expect(sum).toBe(1);
    });
  });

  describe('isValidRiskProfile', () => {
    it('should return true for valid risk profiles', () => {
      const validProfile: IRiskProfile = {
        injuryScore: 50,
        consistencyScore: 0.75,
        floor: 5.0,
        ceiling: 25.0,
        weeklyVariance: 8.5,
      };
      expect(isValidRiskProfile(validProfile)).toBe(true);
    });

    it('should return true for edge case values (min bounds)', () => {
      const minProfile: IRiskProfile = {
        injuryScore: 0,
        consistencyScore: 0,
        floor: 0,
        ceiling: 0,
        weeklyVariance: 0,
      };
      expect(isValidRiskProfile(minProfile)).toBe(true);
    });

    it('should return true for edge case values (max bounds)', () => {
      const maxProfile: IRiskProfile = {
        injuryScore: 100,
        consistencyScore: 1,
        floor: 100,
        ceiling: 100,
        weeklyVariance: 100,
      };
      expect(isValidRiskProfile(maxProfile)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isValidRiskProfile(null)).toBe(false);
      expect(isValidRiskProfile(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isValidRiskProfile('string')).toBe(false);
      expect(isValidRiskProfile(123)).toBe(false);
      expect(isValidRiskProfile([])).toBe(false);
    });

    it('should return false for missing properties', () => {
      const missingInjuryScore = {
        consistencyScore: 0.5,
        floor: 5,
        ceiling: 20,
        weeklyVariance: 5,
      };
      expect(isValidRiskProfile(missingInjuryScore)).toBe(false);

      const missingConsistencyScore = {
        injuryScore: 50,
        floor: 5,
        ceiling: 20,
        weeklyVariance: 5,
      };
      expect(isValidRiskProfile(missingConsistencyScore)).toBe(false);
    });

    it('should return false for out-of-range injury score', () => {
      const negativeInjuryScore = {
        injuryScore: -1,
        consistencyScore: 0.5,
        floor: 5,
        ceiling: 20,
        weeklyVariance: 5,
      };
      expect(isValidRiskProfile(negativeInjuryScore)).toBe(false);

      const overMaxInjuryScore = {
        injuryScore: 101,
        consistencyScore: 0.5,
        floor: 5,
        ceiling: 20,
        weeklyVariance: 5,
      };
      expect(isValidRiskProfile(overMaxInjuryScore)).toBe(false);
    });

    it('should return false for out-of-range consistency score', () => {
      const negativeConsistencyScore = {
        injuryScore: 50,
        consistencyScore: -0.1,
        floor: 5,
        ceiling: 20,
        weeklyVariance: 5,
      };
      expect(isValidRiskProfile(negativeConsistencyScore)).toBe(false);

      const overMaxConsistencyScore = {
        injuryScore: 50,
        consistencyScore: 1.1,
        floor: 5,
        ceiling: 20,
        weeklyVariance: 5,
      };
      expect(isValidRiskProfile(overMaxConsistencyScore)).toBe(false);
    });

    it('should return false for non-number property values', () => {
      const stringInjuryScore = {
        injuryScore: '50',
        consistencyScore: 0.5,
        floor: 5,
        ceiling: 20,
        weeklyVariance: 5,
      };
      expect(isValidRiskProfile(stringInjuryScore)).toBe(false);
    });

    it('should return false when floor exceeds ceiling', () => {
      const floorExceedsCeiling = {
        injuryScore: 50,
        consistencyScore: 0.5,
        floor: 25,
        ceiling: 10,
        weeklyVariance: 5,
      };
      expect(isValidRiskProfile(floorExceedsCeiling)).toBe(false);
    });
  });
});
