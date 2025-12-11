import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getWigalBalance } from "@/lib/services/wigal-sms.service"

/**
 * GET /api/messaging/balance
 * Get Wigal account balance
 * 
 * Query params:
 * - apiConfigId: UUID of the API configuration to use
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const apiConfigId = searchParams.get("apiConfigId")

    if (!apiConfigId) {
      return NextResponse.json(
        { error: "API configuration ID is required" },
        { status: 400 }
      )
    }

    // Get user's organization
    const { data: session } = await supabase
      .from("user_sessions")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()

    if (!(session as any)?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      )
    }

    // Get API configuration - only select needed fields
    const { data: apiConfig, error: apiConfigError } = await supabase
      .from("messaging_api_configurations")
      .select("id, name, api_key, username, sender_id, is_active, organization_id")
      .eq("id", apiConfigId)
      .eq("organization_id", (session as any).organization_id)
      .single()

    if (apiConfigError || !apiConfig) {
      return NextResponse.json(
        { error: "API configuration not found" },
        { status: 404 }
      )
    }

    // Fetch balance from Wigal
    const result = await getWigalBalance({
      apiKey: (apiConfig as any).api_key,
      username: (apiConfig as any).username || (apiConfig as any).api_key, // Fallback to api_key for backward compatibility       
      senderId: (apiConfig as any).sender_id,
    })

    if (!result.success) {
      // Log detailed error for debugging
      console.error("Wigal balance fetch failed:", {
        apiConfigId: (apiConfig as any).id,
        error: result.error,
      })
      
      // Return appropriate status code based on error type
      const statusCode = result.error?.code === "401" || result.error?.message?.toLowerCase().includes("unauthorized") 
        ? 401 
        : 500

      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to fetch balance",
          code: result.error?.code,
        },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    console.error("Error in balance API route:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    )
  }
}
