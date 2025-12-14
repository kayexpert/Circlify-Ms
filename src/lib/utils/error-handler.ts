/**
 * Error Handling Utilities
 * Provides consistent error handling and logging across the application
 * Supports optional Sentry integration for error tracking
 */

export interface ErrorContext {
  userId?: string
  organizationId?: string
  action?: string
  resource?: string
  metadata?: Record<string, unknown>
}

export interface LoggedError extends Error {
  context?: ErrorContext
  timestamp?: string
  severity?: "low" | "medium" | "high" | "critical"
}

/**
 * Create a standardized error object with context
 */
export function createError(
  message: string,
  context?: ErrorContext,
  severity: LoggedError["severity"] = "medium"
): LoggedError {
  const error = new Error(message) as LoggedError
  error.context = context
  error.timestamp = new Date().toISOString()
  error.severity = severity
  return error
}

/**
 * Send error to Sentry (fire and forget)
 * Uses dynamic import to avoid breaking if Sentry is not configured
 */
function captureSentryException(
  error: LoggedError,
  level: "fatal" | "error" = "error"
): void {
  // Fire and forget - don't block execution
  Promise.resolve().then(async () => {
    try {
      const Sentry = await import("@sentry/nextjs")
      Sentry.captureException(error, {
        level,
        contexts: {
          custom: error.context as any,
        },
        tags: {
          severity: error.severity || "medium",
        },
      })
    } catch (sentryError) {
      // Sentry not available or failed to import - silently continue
      if (process.env.NODE_ENV === "development") {
        console.debug("Sentry not available:", sentryError)
      }
    }
  }).catch(() => {
    // Ignore any errors from Sentry capture
  })
}

/**
 * Log error with consistent formatting
 * Sentry integration happens asynchronously (fire and forget)
 */
export function logError(
  error: unknown,
  context?: ErrorContext,
  severity: LoggedError["severity"] = "medium"
): LoggedError {
  let loggedError: LoggedError

  if (error instanceof Error) {
    loggedError = error as LoggedError
    if (!loggedError.context) {
      loggedError.context = context
    }
    if (!loggedError.timestamp) {
      loggedError.timestamp = new Date().toISOString()
    }
    if (!loggedError.severity) {
      loggedError.severity = severity
    }
  } else {
    const message = typeof error === "string" ? error : "Unknown error occurred"
    loggedError = createError(message, context, severity)
  }

  // Log based on severity
  const logMessage = {
    message: loggedError.message,
    context: loggedError.context,
    timestamp: loggedError.timestamp,
    severity: loggedError.severity,
    stack: loggedError instanceof Error ? loggedError.stack : undefined,
  }

  switch (loggedError.severity) {
    case "critical":
      console.error("[CRITICAL ERROR]", logMessage)
      // Send to Sentry (fire and forget)
      captureSentryException(loggedError, "fatal")
      break
    case "high":
      console.error("[HIGH ERROR]", logMessage)
      // Send to Sentry (fire and forget)
      captureSentryException(loggedError, "error")
      break
    case "medium":
      console.warn("[ERROR]", logMessage)
      break
    case "low":
      console.info("[WARN]", logMessage)
      break
  }

  return loggedError
}

/**
 * Extract user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === "string") {
    return error
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message)
  }
  return "An unexpected error occurred"
}

/**
 * Check if error is a specific type (e.g., network error, auth error)
 */
export function isErrorType(error: unknown, type: string): boolean {
  if (error instanceof Error) {
    return error.name === type || error.message.includes(type)
  }
  return false
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown, defaultMessage: string = "Operation failed"): string {
  const loggedError = logError(error, undefined, "medium")

  // Extract specific error messages for common cases
  if (isErrorType(error, "NetworkError") || isErrorType(error, "fetch")) {
    return "Network error. Please check your connection and try again."
  }

  if (isErrorType(error, "Auth") || isErrorType(error, "Unauthorized")) {
    return "Authentication failed. Please log in again."
  }

  if (isErrorType(error, "Permission") || isErrorType(error, "Forbidden")) {
    return "You don't have permission to perform this action."
  }

  // Return the error message if it exists, otherwise return default
  const message = getErrorMessage(error)
  return message || defaultMessage
}

