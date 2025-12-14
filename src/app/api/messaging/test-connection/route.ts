import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/middleware/api-auth"
import { testWigalConnection, formatPhoneForWigal } from "@/lib/services/wigal-sms.service"
import { z } from "zod"

const testConnectionSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  username: z.string().optional(),
  senderId: z.string().min(1, "Sender ID is required"),
  testPhoneNumber: z.string().min(1, "Test phone number is required"),
})

/**
 * POST /api/messaging/test-connection
 * Test Wigal API connection
 * 
 * Request body:
 * {
 *   apiKey: string
 *   username?: string
 *   senderId: string
 *   testPhoneNumber: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (authResult.error || !authResult.user) {
      return authResult.error!
    }

    // Get and validate request body
    const body = await request.json()
    const validationResult = testConnectionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    const { apiKey, username, senderId, testPhoneNumber } = validationResult.data

    // Format phone number
    const formattedPhone = formatPhoneForWigal(testPhoneNumber)

    // Test connection
    const result = await testWigalConnection(
      {
        apiKey,
        username: username || apiKey, // Fallback to apiKey if username not provided
        senderId,
      },
      formattedPhone
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Connection test failed",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Connection test successful",
      data: result.data,
    })
  } catch (error) {
    console.error("Error in test-connection API route:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    )
  }
}
