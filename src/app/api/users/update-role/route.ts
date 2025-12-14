import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifySuperAdmin } from "@/lib/middleware/api-auth";

const updateRoleSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  role: z.enum(["super_admin", "admin", "member", "viewer"]).refine(
    (val) => ["super_admin", "admin", "member", "viewer"].includes(val),
    { message: "Role must be super_admin, admin, member, or viewer" }
  ),
});

export async function PATCH(request: NextRequest) {
  try {
    // Verify super admin access
    const authResult = await verifySuperAdmin(request);
    if (authResult.error || !authResult.auth) {
      return authResult.error!;
    }

    const { organizationId } = authResult.auth;
    const supabase = await createClient();

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateRoleSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validatedData.error.issues },
        { status: 400 }
      );
    }

    // Verify the user to update is in the same organization
    const { data: targetUserOrg } = await supabase
      .from("organization_users")
      .select("role, organization_id")
      .eq("user_id", validatedData.data.userId)
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
    if (targetOrg.role === "super_admin" && validatedData.data.role !== "super_admin") {
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
      .update({ role: validatedData.data.role, updated_at: new Date().toISOString() } as never)
      .eq("user_id", validatedData.data.userId)
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

