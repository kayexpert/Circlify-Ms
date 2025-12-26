/**
 * CORS Middleware for API Routes
 * Provides CORS headers for API endpoints with configurable allowed origins
 */

import { NextRequest, NextResponse } from "next/server"

// Allowed origins for CORS
// Automatically detects Vercel deployment URL and respects ALLOWED_ORIGINS env var
const getAllowedOrigins = (): string[] => {
    const origins: string[] = []

    // Add origins from environment variable
    const envOrigins = process.env.ALLOWED_ORIGINS
    if (envOrigins) {
        origins.push(...envOrigins.split(",").map((origin) => origin.trim()))
    }

    // Auto-detect Vercel deployment URL
    const vercelUrl = process.env.VERCEL_URL
    if (vercelUrl) {
        origins.push(`https://${vercelUrl}`)
    }

    // Add Vercel production URL if set
    const vercelProjectDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL
    if (vercelProjectDomain) {
        origins.push(`https://${vercelProjectDomain}`)
    }

    // Development defaults
    if (process.env.NODE_ENV === "development") {
        origins.push("http://localhost:3000", "http://127.0.0.1:3000")
    }

    // Return unique origins
    return [...new Set(origins)]
}

const ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
const ALLOWED_HEADERS = [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "X-CSRF-Token",
]

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
    if (!origin) return true // Same-origin requests don't have Origin header

    const allowedOrigins = getAllowedOrigins()

    // If no origins configured, allow all (for development)
    if (allowedOrigins.length === 0 && process.env.NODE_ENV === "development") {
        return true
    }

    return allowedOrigins.includes(origin)
}

/**
 * Add CORS headers to response
 */
export function addCorsHeaders(
    response: NextResponse,
    request: NextRequest
): NextResponse {
    const origin = request.headers.get("origin")

    // Set CORS headers if origin is allowed
    if (isOriginAllowed(origin)) {
        if (origin) {
            response.headers.set("Access-Control-Allow-Origin", origin)
        }
        response.headers.set("Access-Control-Allow-Credentials", "true")
        response.headers.set(
            "Access-Control-Allow-Methods",
            ALLOWED_METHODS.join(", ")
        )
        response.headers.set(
            "Access-Control-Allow-Headers",
            ALLOWED_HEADERS.join(", ")
        )
        response.headers.set("Access-Control-Max-Age", "86400") // 24 hours
    }

    return response
}

/**
 * Handle CORS preflight (OPTIONS) request
 */
export function handleCorsPreflightRequest(request: NextRequest): NextResponse | null {
    if (request.method !== "OPTIONS") {
        return null
    }

    const origin = request.headers.get("origin")

    if (!isOriginAllowed(origin)) {
        return NextResponse.json(
            { error: "CORS not allowed" },
            { status: 403 }
        )
    }

    const response = new NextResponse(null, { status: 204 })
    return addCorsHeaders(response, request)
}

/**
 * CORS middleware wrapper for API route handlers
 * Usage:
 * export async function POST(request: NextRequest) {
 *   return withCors(request, async () => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true })
 *   })
 * }
 */
export async function withCors(
    request: NextRequest,
    handler: () => Promise<NextResponse>
): Promise<NextResponse> {
    // Handle preflight
    const preflightResponse = handleCorsPreflightRequest(request)
    if (preflightResponse) {
        return preflightResponse
    }

    // Check origin for non-preflight requests
    const origin = request.headers.get("origin")
    if (!isOriginAllowed(origin)) {
        return NextResponse.json(
            { error: "CORS not allowed" },
            { status: 403 }
        )
    }

    // Execute handler and add CORS headers
    const response = await handler()
    return addCorsHeaders(response, request)
}
