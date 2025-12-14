/**
 * Performance Monitoring Middleware
 * Tracks API route performance and logs metrics
 * Integrates with Sentry for tracing
 */

import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/utils/logger"

interface PerformanceMetrics {
  startTime: number
  method: string
  path: string
  statusCode?: number
  duration?: number
}

/**
 * Middleware to monitor API route performance
 * Wraps the route handler and logs performance metrics
 */
export function withPerformanceMonitoring(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    logLevel?: "debug" | "info" | "warn"
    slowThreshold?: number // Log as warning if duration exceeds this (ms)
  } = {}
) {
  const { logLevel = "info", slowThreshold = 1000 } = options

  return async (request: NextRequest): Promise<NextResponse> => {
    const method = request.method
    const path = request.nextUrl.pathname

    // Use Sentry tracing if available, otherwise fall back to performance.now()
    try {
      const Sentry = await import("@sentry/nextjs")
      
      return await Sentry.startSpan(
        {
          op: "http.server",
          name: `${method} ${path}`,
        },
        async (span) => {
          const startTime = performance.now()
          
          // Set span attributes
          span.setAttribute("http.method", method)
          span.setAttribute("http.route", path)
          span.setAttribute("http.url", request.url)

          try {
            const response = await handler(request)

            const duration = performance.now() - startTime
            const statusCode = response.status

            // Set status code attribute
            span.setAttribute("http.status_code", statusCode)
            span.setAttribute("duration", Math.round(duration))

            // Log performance metrics
            const context = {
              action: `${method} ${path}`,
              resource: path,
              duration: Math.round(duration),
              metadata: { method, path, status: statusCode },
            }

            if (duration > slowThreshold) {
              logger.warn(`Slow API request: ${method} ${path}`, context)
            } else {
              logger[logLevel](`API request: ${method} ${path}`, context)
            }

            // Add performance headers for client-side monitoring
            response.headers.set("X-Response-Time", `${Math.round(duration)}ms`)
            response.headers.set("X-Performance-Monitored", "true")

            return response
          } catch (error) {
            const duration = performance.now() - startTime
            
            // Mark span as errored
            span.setStatus({ code: 2, message: error instanceof Error ? error.message : "Unknown error" })
            span.setAttribute("error", true)

            logger.error(
              `API request failed: ${method} ${path}`,
              error,
              {
                action: `${method} ${path}`,
                resource: path,
                duration: Math.round(duration),
                metadata: { method, path },
              }
            )

            throw error
          }
        }
      )
    } catch {
      // Sentry not available, use fallback implementation
      const startTime = performance.now()

      try {
        const response = await handler(request)

        const duration = performance.now() - startTime
        const statusCode = response.status

        // Log performance metrics
        const context = {
          action: `${method} ${path}`,
          resource: path,
          duration: Math.round(duration),
          metadata: { method, path, status: statusCode },
        }

        if (duration > slowThreshold) {
          logger.warn(`Slow API request: ${method} ${path}`, context)
        } else {
          logger[logLevel](`API request: ${method} ${path}`, context)
        }

        // Add performance headers for client-side monitoring
        response.headers.set("X-Response-Time", `${Math.round(duration)}ms`)
        response.headers.set("X-Performance-Monitored", "true")

        return response
      } catch (error) {
        const duration = performance.now() - startTime

        logger.error(
          `API request failed: ${method} ${path}`,
          error,
          {
            action: `${method} ${path}`,
            resource: path,
            duration: Math.round(duration),
            metadata: { method, path },
          }
        )

        throw error
      }
    }
  }
}

/**
 * Measure execution time of an async function
 * Uses Sentry.startSpan for tracing if available
 */
export async function measurePerformance<T>(
  label: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  // Try to use Sentry tracing if available
  try {
    const Sentry = await import("@sentry/nextjs")
    
    return await Sentry.startSpan(
      {
        op: "function",
        name: label,
      },
      async (span) => {
        // Set attributes from context
        if (context) {
          Object.entries(context).forEach(([key, value]) => {
            span.setAttribute(key, String(value))
          })
        }

        const startTime = performance.now()

        try {
          const result = await fn()
          const duration = performance.now() - startTime

          span.setAttribute("duration", Math.round(duration))
          logger.performance(label, Math.round(duration), context)

          return result
        } catch (error) {
          const duration = performance.now() - startTime
          
          span.setStatus({ code: 2, message: error instanceof Error ? error.message : "Unknown error" })
          span.setAttribute("error", true)

          logger.error(
            `Performance measurement failed for: ${label}`,
            error,
            {
              ...context,
              duration: Math.round(duration),
            }
          )

          throw error
        }
      }
    )
  } catch {
    // Sentry not available, use fallback
    const startTime = performance.now()

    try {
      const result = await fn()
      const duration = performance.now() - startTime

      logger.performance(label, Math.round(duration), context)

      return result
    } catch (error) {
      const duration = performance.now() - startTime

      logger.error(
        `Performance measurement failed for: ${label}`,
        error,
        {
          ...context,
          duration: Math.round(duration),
        }
      )

      throw error
    }
  }
}

/**
 * Measure execution time of a synchronous function
 */
export function measurePerformanceSync<T>(
  label: string,
  fn: () => T,
  context?: Record<string, unknown>
): T {
  const startTime = performance.now()

  try {
    const result = fn()
    const duration = performance.now() - startTime

    logger.performance(label, Math.round(duration), context)

    return result
  } catch (error) {
    const duration = performance.now() - startTime

    logger.error(
      `Performance measurement failed for: ${label}`,
      error,
      {
        ...context,
        duration: Math.round(duration),
      }
    )

    throw error
  }
}

