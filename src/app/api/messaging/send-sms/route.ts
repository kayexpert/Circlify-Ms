import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendSMSViaWigal, formatPhoneForWigal, type WigalSMSDestination } from "@/lib/services/wigal-sms.service"
import { sendSMSSchema } from "@/lib/validations/schemas"
import { verifyAuthAndOrganization } from "@/lib/middleware/api-auth"
import { checkRateLimit, RATE_LIMITS, getRateLimitHeaders } from "@/lib/middleware/rate-limiter"

/**
 * POST /api/messaging/send-sms
 * Send SMS messages via Wigal API
 * 
 * Request body:
 * {
 *   apiKey: string
 *   username?: string
 *   senderId: string
 *   destinations: Array<{ phone: string, message: string, msgid?: string }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication and organization
    const authResult = await verifyAuthAndOrganization(request)
    if (authResult.error || !authResult.auth) {
      // Log the error for debugging
      console.error("Authentication failed in send-sms route:", {
        hasError: !!authResult.error,
        errorStatus: authResult.error?.status,
        errorBody: authResult.error ? await authResult.error.clone().json().catch(() => null) : null,
      })
      return authResult.error!
    }

    const { auth } = authResult

    // Rate limiting per organization
    const rateLimitResult = checkRateLimit(
      `sms:${auth.organizationId}`,
      RATE_LIMITS.SMS_SEND.maxRequests,
      RATE_LIMITS.SMS_SEND.windowMs
    )

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          resetAt: new Date(rateLimitResult.resetAt).toISOString(),
        },
        {
          status: 429,
          headers: getRateLimitHeaders(
            rateLimitResult.remaining,
            rateLimitResult.resetAt,
            RATE_LIMITS.SMS_SEND.maxRequests
          ),
        }
      )
    }

    // Get and validate request body
    const body = await request.json()
    const validationResult = sendSMSSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    const { apiKey, username, senderId, destinations } = validationResult.data

    // Format destinations for Wigal API
    const wigalDestinations: WigalSMSDestination[] = destinations.map((dest) => ({
      destination: formatPhoneForWigal(dest.phone),
      message: dest.message,
      msgid: dest.msgid,
    }))

    // Send SMS via Wigal
    const result = await sendSMSViaWigal(
      {
        apiKey,
        username: username || apiKey, // Use provided username or fallback to apiKey for backward compatibility
        senderId,
      },
      wigalDestinations
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to send SMS",
        },
        {
          status: 500,
          headers: getRateLimitHeaders(
            rateLimitResult.remaining,
            rateLimitResult.resetAt,
            RATE_LIMITS.SMS_SEND.maxRequests
          ),
        }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message || "SMS sent successfully",
        data: result.data,
      },
      {
        headers: getRateLimitHeaders(
          rateLimitResult.remaining,
          rateLimitResult.resetAt,
          RATE_LIMITS.SMS_SEND.maxRequests
        ),
      }
    )
  } catch (error) {
    console.error("Error in send-sms API route:", error)
    
    // Log detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    const errorStack = error instanceof Error ? error.stack : undefined
    
    // Capture in Sentry if available
    try {
      const Sentry = await import("@sentry/nextjs")
      Sentry.captureException(error, {
        tags: {
          route: "/api/messaging/send-sms",
          error_type: "api_route_error",
        },
        extra: {
          error_message: errorMessage,
          error_stack: errorStack,
        },
      })
    } catch {
      // Sentry not available, continue without it
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 }
    )
  }
}
