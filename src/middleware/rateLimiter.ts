import { Request, Response } from 'express';
// @ts-ignore
import rateLimit from 'express-rate-limit';

// Use higher limits during tests
const isTest = process.env.NODE_ENV === 'test';
const assignmentWindowMs = isTest ? 60000 : parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 1 minute in tests, 15 minutes in production
const assignmentMaxRequests = isTest ? 10 : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10'); // 10 requests in tests, 10 in production
const generalMaxRequests = isTest ? 1000 : 100; // 1000 requests in tests, 100 in production

// Key generator function to use X-Forwarded-For header or fallback to IP
const keyGenerator = (req: Request) => {
  return req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
};

export const assignmentRateLimiter = rateLimit({
  windowMs: assignmentWindowMs,
  max: assignmentMaxRequests,
  keyGenerator,
  message: {
    success: false,
    error: 'Too many assignment requests from this IP, rate limit exceeded. Please try again later.',
    retryAfter: Math.ceil(assignmentWindowMs / 1000 / 60)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many assignment requests from this IP, rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(assignmentWindowMs / 1000 / 60)
    });
  }
});

export const generalRateLimiter = rateLimit({
  windowMs: isTest ? 60000 : 15 * 60 * 1000, // 1 minute in tests, 15 minutes in production
  max: generalMaxRequests, // 1000 requests in tests, 100 in production
  keyGenerator,
  message: {
    success: false,
    error: 'Too many requests from this IP, rate limit exceeded. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Function to reset rate limiters for testing
export const resetRateLimiters = () => {
  if (isTest) {
    // Reset the rate limiters by clearing their internal state
    assignmentRateLimiter.resetKey('test-ip');
    generalRateLimiter.resetKey('test-ip');
  }
}; 