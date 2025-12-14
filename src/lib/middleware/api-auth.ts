/**
 * API Authentication and Authorization Middleware
 * Provides utilities for checking authentication and permissions in API routes
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Role } from "@/lib/rbac"

export interface AuthContext {
  user: { id: string; email?: string }
  organizationId: string
  role: Role
}

/**
 * Verify user authentication and return user session
 */
export async function verifyAuth(request: NextRequest): Promise<{
  user: { id: string; email?: string } | null
  error?: NextResponse
}> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  return { user: { id: user.id, email: user.email } }
}

/**
 * Verify user authentication and organization membership
 */
export async function verifyAuthAndOrganization(request: NextRequest): Promise<{
  auth: AuthContext | null
  error?: NextResponse
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("Authentication error in verifyAuthAndOrganization:", {
        authError: authError?.message,
        hasUser: !!user,
      })
      return {
        auth: null,
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      }
    }

    console.log("[API Auth] Verifying auth for user:", user.id)

    // Use optimized query function that handles both session and role
    // This avoids potential transaction conflicts from multiple separate queries
    const { getUserSessionAndRole } = await import("@/lib/supabase/optimized-queries")
    const sessionAndRole = await getUserSessionAndRole(user.id)
    
    console.log("[API Auth] Session and role query completed:", {
      hasSession: !!sessionAndRole?.session,
      hasRole: !!sessionAndRole?.role,
      organizationId: sessionAndRole?.organizationId,
    })
    
    if (!sessionAndRole?.session) {
      console.error("[API Auth] No session found for user:", user.id)
      return {
        auth: null,
        error: NextResponse.json(
          { error: "No active organization session. Please sign out and sign in again." },
          { status: 400 }
        ),
      }
    }
    
    if (!sessionAndRole?.role) {
      console.error("[API Auth] No role found for user:", user.id)
      return {
        auth: null,
        error: NextResponse.json(
          { error: "User role not found. Please contact an administrator." },
          { status: 403 }
        ),
      }
    }
    
    const sessionResult = {
      data: sessionAndRole.session,
      error: null,
    }
    
    const roleResult = {
      data: {
        role: sessionAndRole.role,
        organization_id: sessionAndRole.organizationId,
      },
      error: null,
    }
    
    if (roleResult.data) {
      console.log("[API Auth] Role query result:", {
        hasData: true,
        role: (roleResult.data as any)?.role,
        organizationId: (roleResult.data as any)?.organization_id,
      })
    }

    // Check for errors
    if (sessionResult.error) {
      console.error("Error fetching user session:", sessionResult.error)
      // Log to Sentry if available
      try {
        const Sentry = await import("@sentry/nextjs")
        Sentry.captureException(sessionResult.error, {
          tags: { middleware: "verifyAuthAndOrganization", step: "session_query" },
          extra: { user_id: user.id },
        })
      } catch {
        // Sentry not available
      }
      return {
        auth: null,
        error: NextResponse.json(
          { error: "Failed to retrieve user session. Please try again." },
          { status: 500 }
        ),
      }
    }

    if (roleResult.error) {
      console.error("Error fetching organization user:", roleResult.error)
      // Log to Sentry if available
      try {
        const Sentry = await import("@sentry/nextjs")
        Sentry.captureException(roleResult.error, {
          tags: { middleware: "verifyAuthAndOrganization", step: "role_query" },
          extra: { user_id: user.id },
        })
      } catch {
        // Sentry not available
      }
      return {
        auth: null,
        error: NextResponse.json(
          { error: "Failed to retrieve user role. Please try again." },
          { status: 500 }
        ),
      }
    }

    const session = sessionResult.data as { organization_id: string } | null
    const orgUser = roleResult.data as { role: string; organization_id: string } | null

    if (!session?.organization_id) {
      return {
        auth: null,
        error: NextResponse.json(
          { error: "No active organization. Please ensure you have an active organization session." },
          { status: 400 }
        ),
      }
    }

    if (!orgUser) {
      return {
        auth: null,
        error: NextResponse.json(
          { error: "User role not found. Please contact an administrator." },
          { status: 403 }
        ),
      }
    }

    // Verify organization IDs match
    if (session.organization_id !== orgUser.organization_id) {
      console.warn("Organization ID mismatch between session and role", {
        sessionOrgId: session.organization_id,
        roleOrgId: orgUser.organization_id,
        userId: user.id,
      })
    }

    return {
      auth: {
        user: { id: user.id, email: user.email },
        organizationId: session.organization_id,
        role: orgUser.role as Role,
      },
    }
  } catch (error) {
    console.error("Unexpected error in verifyAuthAndOrganization:", error)
    // Log to Sentry if available
    try {
      const Sentry = await import("@sentry/nextjs")
      Sentry.captureException(error, {
        tags: { middleware: "verifyAuthAndOrganization", step: "unexpected_error" },
      })
    } catch {
      // Sentry not available
    }
    return {
      auth: null,
      error: NextResponse.json(
        { error: "An unexpected error occurred during authentication. Please try again." },
        { status: 500 }
      ),
    }
  }
}

/**
 * Verify user has required role
 */
export async function verifyRole(
  request: NextRequest,
  requiredRoles: Role[]
): Promise<{
  auth: AuthContext | null
  error?: NextResponse
}> {
  const authResult = await verifyAuthAndOrganization(request)
  if (authResult.error || !authResult.auth) {
    return authResult
  }

  if (!requiredRoles.includes(authResult.auth.role)) {
    return {
      auth: null,
      error: NextResponse.json(
        { error: `This action requires one of the following roles: ${requiredRoles.join(", ")}` },
        { status: 403 }
      ),
    }
  }

  return { auth: authResult.auth }
}

/**
 * Verify user is super admin
 */
export async function verifySuperAdmin(request: NextRequest): Promise<{
  auth: AuthContext | null
  error?: NextResponse
}> {
  return verifyRole(request, ["super_admin"])
}

/**
 * Verify user is admin or super admin
 */
export async function verifyAdmin(request: NextRequest): Promise<{
  auth: AuthContext | null
  error?: NextResponse
}> {
  return verifyRole(request, ["super_admin", "admin"])
}

/**
 * Verify organization access - ensures user can only access their organization's data
 */
export async function verifyOrganizationAccess(
  request: NextRequest,
  organizationId: string
): Promise<{
  auth: AuthContext | null
  error?: NextResponse
}> {
  const authResult = await verifyAuthAndOrganization(request)
  if (authResult.error || !authResult.auth) {
    return authResult
  }

  if (authResult.auth.organizationId !== organizationId) {
    return {
      auth: null,
      error: NextResponse.json({ error: "Access denied to this organization" }, { status: 403 }),
    }
  }

  return { auth: authResult.auth }
}

