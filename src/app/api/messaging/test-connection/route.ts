import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { testWigalConnection, formatPhoneForWigal } from "@/lib/services/wigal-sms.service"

/**
 * POST /api/messaging/test-connection
 * Test Wigal API connection
 * 
 * Request body:
 * {
 *   apiKey: string
 *   senderId: string
 *   testPhoneNumber: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { apiKey, username, senderId, testPhoneNumber } = body

    // Validate input
    if (!apiKey || !username || !senderId || !testPhoneNumber) {
      return NextResponse.json(
        { error: "API key, username, sender ID, and test phone number are required" },
        { status: 400 }
      )
    }

    // Format phone number
    const formattedPhone = formatPhoneForWigal(testPhoneNumber)

    // Test connection
    const result = await testWigalConnection(
      {
        apiKey,
        username,
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
