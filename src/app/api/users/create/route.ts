import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2),
  password: z.string().min(8),
  role: z.enum(["admin", "member", "viewer"]),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optimized: Get session and role in parallel
    const { getUserSessionAndRole } = await import("@/lib/supabase/optimized-queries");
    const { session, role, organizationId } = await getUserSessionAndRole(user.id);

    if (!session || !organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    if (role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admins can create users" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    // Create user in Supabase Auth (using service role key)
    // Note: This requires SUPABASE_SERVICE_ROLE_KEY in environment
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Service role key not configured" },
        { status: 500 }
      );
    }

    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: validatedData.email,
        password: validatedData.password,
        email_confirm: true,
        user_metadata: {
          full_name: validatedData.full_name,
        },
      });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Create user record (use upsert in case trigger already created it)
    // The trigger on_auth_user_created might have already created the user record
    const { error: userError } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          id: authData.user.id,
          email: validatedData.email,
          full_name: validatedData.full_name,
        },
        {
          onConflict: "id",
        }
      );

    if (userError) {
      console.error("Error creating/updating user record:", userError);
      // Cleanup: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: `Failed to create user record: ${userError.message}` },
        { status: 400 }
      );
    }

    // Add to organization (use admin client to bypass RLS)
    const { error: orgUserError } = await supabaseAdmin
      .from("organization_users")
      .insert({
        organization_id: organizationId,
        user_id: authData.user.id,
        role: validatedData.role,
      });

    if (orgUserError) {
      console.error("Error adding user to organization:", orgUserError);
      // Cleanup
      await supabaseAdmin.from("users").delete().eq("id", authData.user.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: `Failed to add user to organization: ${orgUserError.message}` },
        { status: 400 }
      );
    }

    // Create user session (use admin client to bypass RLS)
    const { error: sessionError } = await supabaseAdmin
      .from("user_sessions")
      .insert({
        user_id: authData.user.id,
        organization_id: organizationId,
      });

    if (sessionError) {
      console.error("Error creating user session:", sessionError);
      // Cleanup
      await supabaseAdmin
        .from("organization_users")
        .delete()
        .eq("user_id", authData.user.id);
      await supabaseAdmin.from("users").delete().eq("id", authData.user.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: `Failed to create user session: ${sessionError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: validatedData.email,
        full_name: validatedData.full_name,
        role: validatedData.role,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

