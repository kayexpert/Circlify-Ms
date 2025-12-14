/**
 * Simple in-memory rate limiter
 * For production, consider using Redis-based rate limiting
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetAt: number
  }
}

const store: RateLimitStore = {}

/**
 * Simple rate limiter
 * @param identifier - Unique identifier (e.g., user ID, IP address, organization ID)
 * @param maxRequests - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if request is allowed, false if rate limit exceeded
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const key = identifier
  const record = store[key]

  // Clean up expired entries periodically (simple cleanup)
  if (Math.random() < 0.01) {
    // 1% chance to clean up
    for (const k in store) {
      if (store[k].resetAt < now) {
        delete store[k]
      }
    }
  }

  if (!record || record.resetAt < now) {
    // Create new record or reset expired record
    store[key] = {
      count: 1,
      resetAt: now + windowMs,
    }
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    }
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    }
  }

  record.count++
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: record.resetAt,
  }
}

/**
 * Rate limit configuration for different endpoints
 */
export const RATE_LIMITS = {
  SMS_SEND: {
    maxRequests: 100, // 100 SMS per hour per organization
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  API_GENERAL: {
    maxRequests: 1000, // 1000 requests per hour per user
    windowMs: 60 * 60 * 1000,
  },
  FILE_UPLOAD: {
    maxRequests: 50, // 50 uploads per hour per user
    windowMs: 60 * 60 * 1000,
  },
} as const

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(
  remaining: number,
  resetAt: number,
  maxRequests: number
): Record<string, string> {
  return {
    "X-RateLimit-Limit": maxRequests.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": new Date(resetAt).toISOString(),
  }
}

