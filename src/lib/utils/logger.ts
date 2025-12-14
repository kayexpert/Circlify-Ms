/**
 * Structured Logging Utilities
 * Provides consistent structured logging across the application
 * Integrates with Sentry logger when available
 */

export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogContext {
  userId?: string
  organizationId?: string
  action?: string
  resource?: string
  duration?: number
  metadata?: Record<string, unknown>
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development"
  private logLevel: LogLevel = this.isDevelopment ? "debug" : "info"

  /**
   * Get Sentry logger if available (async)
   */
  private async getSentryLogger() {
    try {
      const Sentry = await import("@sentry/nextjs")
      if (Sentry && "logger" in Sentry) {
        return (Sentry as any).logger
      }
    } catch {
      // Sentry not available - return null
    }
    return null
  }

  /**
   * Set the minimum log level
   */
  setLogLevel(level: LogLevel) {
    this.logLevel = level
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"]
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const logLevelIndex = levels.indexOf(level)
    return logLevelIndex >= currentLevelIndex
  }

  /**
   * Format log entry
   */
  private formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` | ${JSON.stringify(context)}` : ""
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: LogContext) {
    if (this.shouldLog("debug")) {
      const formattedMessage = this.formatLog("debug", message, context)
      console.debug(formattedMessage)
      
      // Send to Sentry logger if available (fire and forget)
      this.getSentryLogger().then((sentryLogger) => {
        if (sentryLogger?.debug) {
          try {
            sentryLogger.debug(message, context)
          } catch {
            // Ignore Sentry logger errors
          }
        }
      }).catch(() => {
        // Ignore errors
      })
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext) {
    if (this.shouldLog("info")) {
      const formattedMessage = this.formatLog("info", message, context)
      console.info(formattedMessage)
      
      // Send to Sentry logger if available (fire and forget)
      this.getSentryLogger().then((sentryLogger) => {
        if (sentryLogger?.info) {
          try {
            sentryLogger.info(message, context)
          } catch {
            // Ignore Sentry logger errors
          }
        }
      }).catch(() => {
        // Ignore errors
      })
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext) {
    if (this.shouldLog("warn")) {
      const formattedMessage = this.formatLog("warn", message, context)
      console.warn(formattedMessage)
      
      // Send to Sentry logger if available (fire and forget)
      this.getSentryLogger().then((sentryLogger) => {
        if (sentryLogger?.warn) {
          try {
            sentryLogger.warn(message, context)
          } catch {
            // Ignore Sentry logger errors
          }
        }
      }).catch(() => {
        // Ignore errors
      })
    }
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error | unknown, context?: LogContext) {
    if (this.shouldLog("error")) {
      const errorDetails = error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error

      const formattedMessage = this.formatLog("error", message, {
        ...context,
        metadata: {
          ...(context?.metadata || {}),
          error: errorDetails,
        },
      })
      console.error(formattedMessage)
      
      // Send to Sentry logger if available (fire and forget)
      this.getSentryLogger().then((sentryLogger) => {
        if (sentryLogger?.error) {
          try {
            if (error instanceof Error) {
              sentryLogger.error(message, { error, ...context })
            } else {
              sentryLogger.error(message, context)
            }
          } catch {
            // Ignore Sentry logger errors
          }
        }
      }).catch(() => {
        // Ignore errors
      })
    }
  }

  /**
   * Trace level logging (for Sentry logger compatibility)
   */
  trace(message: string, context?: LogContext) {
    if (this.shouldLog("debug")) {
      const formattedMessage = this.formatLog("debug", message, context)
      console.debug(formattedMessage)
      
      // Send to Sentry logger if available (fire and forget)
      this.getSentryLogger().then((sentryLogger) => {
        if (sentryLogger?.trace) {
          try {
            sentryLogger.trace(message, context)
          } catch {
            // Ignore Sentry logger errors
          }
        }
      }).catch(() => {
        // Ignore errors
      })
    }
  }

  /**
   * Fatal level logging (for Sentry logger compatibility)
   */
  fatal(message: string, context?: LogContext) {
    const formattedMessage = this.formatLog("error", message, context)
    console.error(formattedMessage)
    
    // Send to Sentry logger if available (fire and forget)
    this.getSentryLogger().then((sentryLogger) => {
      if (sentryLogger?.fatal) {
        try {
          sentryLogger.fatal(message, context)
        } catch {
          // Ignore Sentry logger errors
        }
      }
    }).catch(() => {
      // Ignore errors
    })
  }

  /**
   * Log performance metrics
   */
  performance(action: string, duration: number, context?: LogContext) {
    this.info(`Performance: ${action} took ${duration}ms`, {
      ...context,
      action,
      duration,
    })
  }

  /**
   * Log API request
   */
  apiRequest(method: string, path: string, context?: LogContext) {
    this.debug(`API Request: ${method} ${path}`, context)
  }

  /**
   * Log API response
   */
  apiResponse(method: string, path: string, status: number, duration?: number, context?: LogContext) {
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info"
    this[level](`API Response: ${method} ${path} - ${status}`, {
      ...context,
      duration,
      metadata: {
        ...(context?.metadata || {}),
        status,
      },
    })
  }

  /**
   * Log database operation
   */
  dbOperation(operation: string, table: string, context?: LogContext) {
    this.debug(`DB Operation: ${operation} on ${table}`, context)
  }
}

// Export singleton instance
export const logger = new Logger()

