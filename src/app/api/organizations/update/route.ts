import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserSessionAndRole } from "@/lib/supabase/optimized-queries"
import { z } from "zod"

const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  currency: z.string().optional(),
  type: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get session and role
    const { session, role, organizationId } = await getUserSessionAndRole(user.id)

    if (!session || !organizationId) {
      console.error("No active organization found for user:", user.id)
      return NextResponse.json(
        { error: "No active organization. Please ensure you have an active organization session." },
        { status: 400 }
      )
    }

    if (!role) {
      console.error("No role found for user:", user.id)
      return NextResponse.json(
        { error: "User role not found. Please contact an administrator." },
        { status: 403 }
      )
    }

    // Check if user has permission to update organization
    // Only super_admin can update organization settings
    if (role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admins can update organization settings" },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const validatedData = updateOrganizationSchema.parse(body)

    // Get service role key for admin operations (bypasses RLS)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error("Service role key not configured")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    // Create admin client to bypass RLS
    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Update organization using admin client (bypasses RLS)
    const updatePayload = {
      ...validatedData,
      updated_at: new Date().toISOString(),
    }

    console.log("Updating organization:", organizationId, "with data:", updatePayload)

    const { data, error } = await supabaseAdmin
      .from("organizations")
      .update(updatePayload)
      .eq("id", organizationId)
      .select()

    if (error) {
      console.error("Error updating organization:", error)
      return NextResponse.json(
        { error: error.message || error.details || "Failed to update organization" },
        { status: 400 }
      )
    }

    // Handle case where update returns no rows
    if (!data || data.length === 0) {
      console.warn("Update returned no rows, fetching organization to verify")
      
      // Fetch the organization using admin client to verify it exists
      const { data: fetchedOrg, error: fetchError } = await supabaseAdmin
        .from("organizations")
        .select("*")
        .eq("id", organizationId)
        .maybeSingle()

      if (fetchError) {
        console.error("Error fetching organization:", fetchError)
        return NextResponse.json(
          { error: "Failed to verify organization update" },
          { status: 500 }
        )
      }

      if (!fetchedOrg) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        )
      }

      // If organization exists but update returned nothing, something went wrong
      return NextResponse.json(
        { error: "Update failed. Please try again." },
        { status: 500 }
      )
    }

    // Return the first (and should be only) result
    const updatedOrg = Array.isArray(data) ? data[0] : data

    return NextResponse.json({
      success: true,
      organization: updatedOrg,
    })
  } catch (error) {
    console.error("Error updating organization:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      )
    }
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
