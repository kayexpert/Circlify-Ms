/**
 * Retry Utility
 * Provides retry logic with exponential backoff for transient failures
 */

export interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryable?: (error: unknown) => boolean
}

export class RetryableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RetryableError"
  }
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown, retryable?: (error: unknown) => boolean): boolean {
  if (retryable) {
    return retryable(error)
  }

  // Default: retry on network errors, timeout errors, and 5xx server errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnreset") ||
      message.includes("econnrefused") ||
      message.includes("etimedout")
    ) {
      return true
    }
  }

  // Check for HTTP errors
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status
    return status >= 500 && status < 600
  }

  // Check for Supabase errors
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: string }).code
    return code === "PGRST116" || code === "08P01" || code === "57014" // Connection errors
  }

  return false
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt: number, initialDelay: number, maxDelay: number, multiplier: number): number {
  const delay = initialDelay * Math.pow(multiplier, attempt - 1)
  return Math.min(delay, maxDelay)
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 * 
 * @example
 * ```typescript
 * const result = await retry(
 *   () => fetch('/api/data'),
 *   { maxAttempts: 3, initialDelay: 1000 }
 * )
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    retryable,
  } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry if it's the last attempt or error is not retryable
      if (attempt === maxAttempts || !isRetryableError(error, retryable)) {
        throw error
      }

      // Calculate delay with exponential backoff
      const delay = calculateDelay(attempt, initialDelay, maxDelay, backoffMultiplier)

      // Wait before retrying
      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError
}

/**
 * Retry a function with exponential backoff, but return result/error tuple
 * Useful when you want to handle errors yourself
 */
export async function retrySafe<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<[T | null, Error | null]> {
  try {
    const result = await retry(fn, options)
    return [result, null]
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))]
  }
}

