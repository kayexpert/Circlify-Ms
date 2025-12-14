import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyAuthAndOrganization } from "@/lib/middleware/api-auth"
import { getWigalBalance } from "@/lib/services/wigal-sms.service"
import { uuidSchema } from "@/lib/validations/schemas"

/**
 * GET /api/messaging/balance
 * Get Wigal account balance
 * 
 * Query params:
 * - apiConfigId: UUID of the API configuration to use
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication and organization
    const authResult = await verifyAuthAndOrganization(request)
    if (authResult.error || !authResult.auth) {
      return authResult.error!
    }

    const { organizationId } = authResult.auth
    const supabase = await createClient()

    // Get and validate API config ID from query params
    const searchParams = request.nextUrl.searchParams
    const apiConfigId = searchParams.get("apiConfigId")

    if (!apiConfigId) {
      return NextResponse.json(
        { error: "API configuration ID is required" },
        { status: 400 }
      )
    }

    // Validate UUID format
    const apiConfigIdValidation = uuidSchema.safeParse(apiConfigId)
    if (!apiConfigIdValidation.success) {
      return NextResponse.json(
        { error: "Invalid API configuration ID format", details: apiConfigIdValidation.error.issues },
        { status: 400 }
      )
    }

    // Get API configuration - only select needed fields
    const { data: apiConfig, error: apiConfigError } = await supabase
      .from("messaging_api_configurations")
      .select("id, name, api_key, username, sender_id, is_active, organization_id")
      .eq("id", apiConfigIdValidation.data)
      .eq("organization_id", organizationId)
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
