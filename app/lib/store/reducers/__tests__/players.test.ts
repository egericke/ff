import { dstPointsPerGame } from '../players';

describe('dstPointsPerGame', () => {
  describe('null input', () => {
    it('should return 0 when points is null', () => {
      expect(dstPointsPerGame(null)).toBe(0);
    });
  });

  describe('0 points allowed', () => {
    it('should return 5 when points allowed is 0', () => {
      expect(dstPointsPerGame(0)).toBe(5);
    });
  });

  describe('1-6 points allowed', () => {
    it('should return 4 when points allowed is 1', () => {
      expect(dstPointsPerGame(1)).toBe(4);
    });

    it('should return 4 when points allowed is 6', () => {
      expect(dstPointsPerGame(6)).toBe(4);
    });
  });

  describe('7-13 points allowed', () => {
    it('should return 3 when points allowed is 7', () => {
      expect(dstPointsPerGame(7)).toBe(3);
    });

    it('should return 3 when points allowed is 13', () => {
      expect(dstPointsPerGame(13)).toBe(3);
    });
  });

  describe('14-17 points allowed', () => {
    it('should return 1 when points allowed is 14', () => {
      expect(dstPointsPerGame(14)).toBe(1);
    });

    it('should return 1 when points allowed is 17', () => {
      expect(dstPointsPerGame(17)).toBe(1);
    });
  });

  describe('18-27 points allowed', () => {
    it('should return 0 when points allowed is 18', () => {
      expect(dstPointsPerGame(18)).toBe(0);
    });

    it('should return 0 when points allowed is 27', () => {
      expect(dstPointsPerGame(27)).toBe(0);
    });
  });

  describe('28-34 points allowed', () => {
    it('should return -1 when points allowed is 28', () => {
      expect(dstPointsPerGame(28)).toBe(-1);
    });

    it('should return -1 when points allowed is 34', () => {
      expect(dstPointsPerGame(34)).toBe(-1);
    });
  });

  describe('35-45 points allowed', () => {
    it('should return -3 when points allowed is 35', () => {
      expect(dstPointsPerGame(35)).toBe(-3);
    });

    it('should return -3 when points allowed is 45', () => {
      expect(dstPointsPerGame(45)).toBe(-3);
    });
  });

  describe('46+ points allowed', () => {
    it('should return -5 when points allowed is 46', () => {
      expect(dstPointsPerGame(46)).toBe(-5);
    });

    it('should return -5 when points allowed is 100', () => {
      expect(dstPointsPerGame(100)).toBe(-5);
    });
  });
});
