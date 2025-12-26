/**
 * Input Sanitization Utilities
 * Provides XSS prevention through input sanitization
 */

/**
 * HTML entities to escape for XSS prevention
 */
const HTML_ENTITIES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
}

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
    if (typeof text !== "string") {
        return ""
    }
    return text.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Remove potentially dangerous patterns from text
 * This is more aggressive than escapeHtml
 */
export function sanitizeText(text: string): string {
    if (typeof text !== "string") {
        return ""
    }

    let sanitized = text

    // Remove script tags and their contents
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")

    // Remove event handlers (onclick, onerror, etc.)
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "")

    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, "")

    // Remove data: protocol (can be used for XSS)
    sanitized = sanitized.replace(/data:(?!image\/)/gi, "")

    // Remove vbscript: protocol
    sanitized = sanitized.replace(/vbscript:/gi, "")

    // Escape remaining HTML
    return escapeHtml(sanitized)
}

/**
 * Sanitize object values recursively
 * Use this to sanitize form data before storing
 */
export function sanitizeObject<T extends Record<string, unknown>>(
    obj: T,
    options: { deep?: boolean; excludeKeys?: string[] } = {}
): T {
    const { deep = true, excludeKeys = [] } = options
    const sanitized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj)) {
        if (excludeKeys.includes(key)) {
            sanitized[key] = value
            continue
        }

        if (typeof value === "string") {
            sanitized[key] = sanitizeText(value)
        } else if (deep && value !== null && typeof value === "object") {
            if (Array.isArray(value)) {
                sanitized[key] = value.map((item) =>
                    typeof item === "string"
                        ? sanitizeText(item)
                        : typeof item === "object" && item !== null
                            ? sanitizeObject(item as Record<string, unknown>, options)
                            : item
                )
            } else {
                sanitized[key] = sanitizeObject(value as Record<string, unknown>, options)
            }
        } else {
            sanitized[key] = value
        }
    }

    return sanitized as T
}

/**
 * Validate and sanitize URL
 * Prevents javascript:, data: and other dangerous protocols
 */
export function sanitizeUrl(url: string): string {
    if (typeof url !== "string") {
        return ""
    }

    const trimmed = url.trim().toLowerCase()

    // Block dangerous protocols
    const dangerousProtocols = ["javascript:", "vbscript:", "data:", "file:"]
    for (const protocol of dangerousProtocols) {
        if (trimmed.startsWith(protocol)) {
            return ""
        }
    }

    // Allow relative URLs, http, https, mailto, tel
    const allowedProtocols = ["http://", "https://", "mailto:", "tel:", "/", "#"]
    const hasAllowedProtocol = allowedProtocols.some((p) =>
        trimmed.startsWith(p)
    )

    // If no protocol, treat as relative URL (allowed)
    if (!hasAllowedProtocol && trimmed.includes(":")) {
        // Has some other protocol - block it
        return ""
    }

    return url
}

/**
 * Strip all HTML tags from text
 * Useful for plaintext fields that should never have HTML
 */
export function stripHtml(text: string): string {
    if (typeof text !== "string") {
        return ""
    }
    return text.replace(/<[^>]*>/g, "")
}

/**
 * Validate that input doesn't contain SQL injection patterns
 * Note: This is a secondary defense - always use parameterized queries
 */
export function containsSqlInjectionPatterns(text: string): boolean {
    if (typeof text !== "string") {
        return false
    }

    const suspicious = text.toLowerCase()
    const patterns = [
        /(\b(select|insert|update|delete|drop|union|exec|execute)\b.*\b(from|into|where|table)\b)/i,
        /(-{2}|\/\*|\*\/|;)/,
        /(\bor\b\s*\d+\s*=\s*\d+|\band\b\s*\d+\s*=\s*\d+)/i,
        /(\'|\"|`)\s*(or|and)\s*(\'|\"|`)/i,
    ]

    return patterns.some((pattern) => pattern.test(suspicious))
}
