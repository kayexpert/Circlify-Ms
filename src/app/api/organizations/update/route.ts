import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifySuperAdmin } from "@/lib/middleware/api-auth"
import { organizationUpdateSchema } from "@/lib/validations/schemas"

export async function PATCH(request: NextRequest) {
  try {
    // Verify super admin access
    const authResult = await verifySuperAdmin(request)
    if (authResult.error || !authResult.auth) {
      return authResult.error!
    }

    const { organizationId } = authResult.auth

    // Parse and validate request body
    const body = await request.json()
    const validatedData = organizationUpdateSchema.safeParse(body)

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validatedData.error.issues },
        { status: 400 }
      )
    }

    // Get service role key for admin operations (bypasses RLS)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
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
      ...validatedData.data,
      updated_at: new Date().toISOString(),
    }

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
        .select("id, name, email, phone, location, country, website, logo_url, currency, type, size, description, created_at, updated_at")
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
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
