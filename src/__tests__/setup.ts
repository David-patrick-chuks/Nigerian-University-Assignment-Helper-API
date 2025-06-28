// Global test setup
import { jest } from '@jest/globals';
import { resetRateLimiters } from '../middleware/rateLimiter';

// Mock environment variables for testing
process.env.GEMINI_API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(30000);

// Clean up before and after each test
beforeEach(() => {
  resetRateLimiters();
});
afterEach(() => {
  jest.clearAllMocks();
  resetRateLimiters();
});

// Clean up after all tests
afterAll(() => {
  jest.restoreAllMocks();
}); 