import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user ID to delete from query params
    const { searchParams } = new URL(request.url);
    const userIdToDelete = searchParams.get("userId");

    if (!userIdToDelete) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent deleting yourself
    if (userIdToDelete === user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Optimized: Get session, role, and target user org in parallel
    const { getUserSessionAndRole } = await import("@/lib/supabase/optimized-queries");
    const [sessionAndRole, targetUserOrgResult] = await Promise.all([
      getUserSessionAndRole(user.id),
      supabase
        .from("organization_users")
        .select("role, organization_id")
        .eq("user_id", userIdToDelete)
        .single(),
    ]);

    const { session, role, organizationId } = sessionAndRole;

    if (!session || !organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    if (role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admins can delete users" },
        { status: 403 }
      );
    }

    const { data: targetUserOrg } = targetUserOrgResult;

    if (!targetUserOrg) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const targetOrg = targetUserOrg as { role: string; organization_id: string };
    if (targetOrg.organization_id !== organizationId) {
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
        .eq("organization_id", organizationId)
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
      userIdToDelete
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

