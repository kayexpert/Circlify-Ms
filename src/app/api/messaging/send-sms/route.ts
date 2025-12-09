import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendSMSViaWigal, formatPhoneForWigal, type WigalSMSDestination } from "@/lib/services/wigal-sms.service"

/**
 * POST /api/messaging/send-sms
 * Send SMS messages via Wigal API
 * 
 * Request body:
 * {
 *   apiKey: string
 *   senderId: string
 *   destinations: Array<{ phone: string, message: string }>
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
    const { apiKey, username, senderId, destinations } = body

    // Validate input
    if (!apiKey || !senderId) {
      return NextResponse.json(
        { error: "API key and sender ID are required" },
        { status: 400 }
      )
    }

    if (!destinations || !Array.isArray(destinations) || destinations.length === 0) {
      return NextResponse.json(
        { error: "At least one destination is required" },
        { status: 400 }
      )
    }

    // Format destinations for Wigal API
    const wigalDestinations: WigalSMSDestination[] = destinations.map((dest: { phone: string; message: string; msgid?: string }) => ({
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
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message || "SMS sent successfully",
      data: result.data,
    })
  } catch (error) {
    console.error("Error in send-sms API route:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    )
  }
}
