import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyAdmin } from "@/lib/middleware/api-auth"

/**
 * GET /api/debug/user-data
 * Diagnostic endpoint to check user's session and organization data
 * Helps identify why specific users experience transaction rollback errors
 * 
 * SECURITY: This endpoint is admin-only and disabled in production unless
 * ENABLE_DEBUG_ENDPOINTS environment variable is set to "true"
 */
export async function GET(request: NextRequest) {
  try {
    // Block debug endpoints in production unless explicitly enabled
    const isProduction = process.env.NODE_ENV === "production"
    const debugEnabled = process.env.ENABLE_DEBUG_ENDPOINTS === "true"

    if (isProduction && !debugEnabled) {
      return NextResponse.json(
        { error: "Debug endpoints are disabled in production" },
        { status: 403 }
      )
    }

    // Require admin role for this sensitive endpoint
    const authResult = await verifyAdmin(request)
    if (authResult.error || !authResult.auth) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    const { auth } = authResult
    const user = auth.user
    const supabase = await createClient()

    // Get user's session data
    const { data: sessionData, error: sessionError } = await supabase
      .from("user_sessions")
      .select("id, user_id, organization_id, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    // Get user's organization memberships
    const { data: orgUsers, error: orgUsersError } = await supabase
      .from("organization_users")
      .select("id, user_id, organization_id, role, created_at")
      .eq("user_id", user.id)

    // Check if organization exists (if session has organization_id)
    let orgCheck = null
    if (sessionData && sessionData.length > 0 && (sessionData[0] as any)?.organization_id) {
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, slug")
        .eq("id", (sessionData[0] as any).organization_id)
        .maybeSingle()

      orgCheck = {
        exists: !!orgData,
        data: orgData,
        error: orgError?.message,
      }
    }

    // Check for duplicate sessions
    const duplicateSessions = sessionData && sessionData.length > 1

    return NextResponse.json({
      userId: user.id,
      userEmail: user.email,
      diagnostics: {
        sessions: {
          count: sessionData?.length || 0,
          data: sessionData,
          error: sessionError?.message,
          hasError: !!sessionError,
          hasDuplicates: duplicateSessions,
        },
        organizationUsers: {
          count: orgUsers?.length || 0,
          data: orgUsers,
          error: orgUsersError?.message,
          hasError: !!orgUsersError,
        },
        organizationCheck: orgCheck,
        issues: [
          ...(sessionError ? [`Session query error: ${sessionError.message}`] : []),
          ...(orgUsersError ? [`Organization users query error: ${orgUsersError.message}`] : []),
          ...(!sessionData || sessionData.length === 0 ? ["No user session found"] : []),
          ...(duplicateSessions ? ["Multiple user sessions found - should be only one"] : []),
          ...(sessionData && sessionData.length > 0 && !orgCheck?.exists ? ["Organization in session does not exist"] : []),
          ...(!orgUsers || orgUsers.length === 0 ? ["User not linked to any organization"] : []),
          ...(sessionData && sessionData.length > 0 && orgUsers && orgUsers.length > 0 &&
            !(orgUsers as any[]).some((ou: any) => ou.organization_id === (sessionData[0] as any).organization_id)
            ? ["Session organization does not match any organization_users record"] : []),
        ],
      },
    })
  } catch (error) {
    console.error("Error in user-data diagnostic endpoint:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    )
  }
}

