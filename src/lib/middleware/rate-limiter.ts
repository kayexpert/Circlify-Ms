/**
 * Rate Limiter with Database Backend
 * Uses Supabase for distributed rate limiting (serverless compatible)
 * Falls back to in-memory for development or if DB fails
 */

import { createClient } from "@/lib/supabase/server"

// ============================================
// Types
// ============================================

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetAt: number
  }
}

// In-memory store (fallback for dev or DB failures)
const memoryStore: RateLimitStore = {}

// ============================================
// Database-Backed Rate Limiter (Production)
// ============================================

/**
 * Check rate limit using Supabase database
 * This is the primary rate limiter for production/serverless environments
 * 
 * @param identifier - Unique identifier (e.g., "sms:{org_id}")
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 */
export async function checkRateLimitDB(
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  try {
    const supabase = await createClient()

    // Define expected response type from database function
    type RateLimitDBResponse = {
      allowed: boolean
      remaining: number
      reset_at: string
    }

    // Call the database function that atomically checks and increments
    // Use type assertion through unknown since the RPC function is dynamically defined
    const rpcFn = supabase.rpc as unknown as (
      fn: string,
      params: Record<string, unknown>
    ) => Promise<{ data: RateLimitDBResponse[] | null; error: { message: string } | null }>

    const { data, error } = await rpcFn(
      "check_rate_limit",
      {
        p_identifier: identifier,
        p_max_requests: maxRequests,
        p_window_ms: windowMs,
      }
    )

    if (error) {
      console.error("[RateLimiter] Database error, falling back to memory:", error)
      // Fall back to in-memory rate limiting
      return checkRateLimitMemory(identifier, maxRequests, windowMs)
    }

    // Handle both single object and array responses from Supabase RPC
    const result = Array.isArray(data) ? data[0] : data as RateLimitDBResponse | null

    if (!result) {
      console.error("[RateLimiter] No result from database, falling back to memory")
      return checkRateLimitMemory(identifier, maxRequests, windowMs)
    }

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAt: new Date(result.reset_at).getTime(),
    }
  } catch (error) {
    console.error("[RateLimiter] Unexpected error, falling back to memory:", error)
    return checkRateLimitMemory(identifier, maxRequests, windowMs)
  }
}

// ============================================
// In-Memory Rate Limiter (Fallback/Development)
// ============================================

/**
 * In-memory rate limiter
 * Used as fallback when database is unavailable
 * Note: Does not work across serverless instances
 */
export function checkRateLimitMemory(
  identifier: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const record = memoryStore[identifier]

  // Periodic cleanup (1% chance)
  if (Math.random() < 0.01) {
    for (const key in memoryStore) {
      if (memoryStore[key].resetAt < now) {
        delete memoryStore[key]
      }
    }
  }

  if (!record || record.resetAt < now) {
    // Create new record or reset expired record
    memoryStore[identifier] = {
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

// ============================================
// Synchronous Rate Limiter (Legacy/Backward Compatible)
// ============================================

/**
 * Synchronous rate limiter (in-memory only)
 * @deprecated Use checkRateLimitDB for production
 * Kept for backward compatibility with existing code
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  return checkRateLimitMemory(identifier, maxRequests, windowMs)
}

// ============================================
// Rate Limit Configuration
// ============================================

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
  AUTH_ATTEMPTS: {
    maxRequests: 10, // 10 auth attempts per 15 minutes
    windowMs: 15 * 60 * 1000,
  },
} as const

// ============================================
// Response Headers Helper
// ============================================

/**
 * Get rate limit headers for HTTP response
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
