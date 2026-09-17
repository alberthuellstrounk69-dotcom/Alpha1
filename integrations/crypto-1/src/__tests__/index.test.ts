import * as crypto from '../index';

describe('Crypto-1 Library', () => {
  describe('initialization', () => {
    test('should export initialize function', () => {
      expect(typeof crypto.initialize).toBe('function');
    });

    test('should initialize without errors', () => {
      expect(() => crypto.initialize()).not.toThrow();
    });
  });

  describe('version', () => {
    test('should return version string', () => {
      const version = crypto.getVersion();
      expect(typeof version).toBe('string');
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('should return correct version', () => {
      expect(crypto.getVersion()).toBe('0.1.0');
    });
  });

  describe('security status', () => {
    test('should return security status string', () => {
      const status = crypto.getSecurityStatus();
      expect(typeof status).toBe('string');
      expect(status).toContain('PRE-RELEASE');
    });

    test('should warn about production use', () => {
      const status = crypto.getSecurityStatus();
      expect(status).toContain('NOT AUDITED');
      expect(status).toContain('PRODUCTION');
    });
  });

  describe('default export', () => {
    test('should export all functions in default object', () => {
      expect(crypto.default).toHaveProperty('initialize');
      expect(crypto.default).toHaveProperty('getVersion');
      expect(crypto.default).toHaveProperty('getSecurityStatus');
    });
  });
});
