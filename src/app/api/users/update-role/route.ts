import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserSessionAndRole } from "@/lib/supabase/optimized-queries";

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["super_admin", "admin", "member", "viewer"]),
});

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const validatedData = updateRoleSchema.parse(body);

    // Optimized: Get session and role in parallel using optimized query
    const { session, role, organizationId } = await getUserSessionAndRole(user.id);

    if (!session || !organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    if (role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admins can update user roles" },
        { status: 403 }
      );
    }

    // Verify the user to update is in the same organization
    const { data: targetUserOrg } = await supabase
      .from("organization_users")
      .select("role, organization_id")
      .eq("user_id", validatedData.userId)
      .single();

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

    // Prevent changing the last super admin
    if (targetOrg.role === "super_admin" && validatedData.role !== "super_admin") {
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
              "Cannot change the last super admin's role. Please assign another super admin first.",
          },
          { status: 400 }
        );
      }
    }

    // Update the role
    const { error: updateError } = await supabase
      .from("organization_users")
      .update({ role: validatedData.role, updated_at: new Date().toISOString() } as never)
      .eq("user_id", validatedData.userId)
      .eq("organization_id", organizationId);

    if (updateError) {
      console.error("Error updating user role:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User role updated successfully",
    });
  } catch (error) {
    console.error("Error updating user role:", error);
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

