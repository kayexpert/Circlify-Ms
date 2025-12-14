import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifySuperAdmin } from "@/lib/middleware/api-auth";
import { uuidSchema } from "@/lib/validations/schemas";

export async function DELETE(request: NextRequest) {
  try {
    // Verify super admin access
    const authResult = await verifySuperAdmin(request);
    if (authResult.error || !authResult.auth) {
      return authResult.error!;
    }

    const { auth } = authResult;
    const supabase = await createClient();

    // Get and validate user ID from query params
    const { searchParams } = new URL(request.url);
    const userIdToDelete = searchParams.get("userId");

    if (!userIdToDelete) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Validate UUID format
    const userIdValidation = uuidSchema.safeParse(userIdToDelete);
    if (!userIdValidation.success) {
      return NextResponse.json(
        { error: "Invalid user ID format", details: userIdValidation.error.issues },
        { status: 400 }
      );
    }

    // Prevent deleting yourself
    if (userIdToDelete === auth.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Get target user organization membership
    const { data: targetUserOrg } = await supabase
      .from("organization_users")
      .select("role, organization_id")
      .eq("user_id", userIdValidation.data)
      .single();

    if (!targetUserOrg) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const targetOrg = targetUserOrg as { role: string; organization_id: string };
    if (targetOrg.organization_id !== auth.organizationId) {
      return NextResponse.json(
        { error: "User is not in your organization" },
        { status: 403 }
      );
    }

    // Check if this is the last super admin
    if (targetOrg.role === "super_admin") {
      const { data: superAdmins, error: countError } = await supabase
        .from("organization_users")
        .select("id")
        .eq("organization_id", auth.organizationId)
        .eq("role", "super_admin");

      if (countError) {
        return NextResponse.json(
          { error: "Failed to check super admin count" },
          { status: 500 }
        );
      }

      if (superAdmins && superAdmins.length <= 1) {
        return NextResponse.json(
          {
            error:
              "Cannot delete the last super admin. Please assign another super admin first.",
          },
          { status: 400 }
        );
      }
    }

    // Get service role key
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

    // Delete user from auth (this will cascade delete from users, organization_users, user_sessions)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      userIdValidation.data
    );

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

