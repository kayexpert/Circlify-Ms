import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifySuperAdmin } from "@/lib/middleware/api-auth";
import { handleApiError, logError } from "@/lib/utils/error-handler";
import { withPerformanceMonitoring } from "@/lib/middleware/performance-monitor";

const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(200),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "member", "viewer"]).refine(
    (val) => ["admin", "member", "viewer"].includes(val),
    { message: "Role must be admin, member, or viewer" }
  ),
});

async function handleCreateUser(request: NextRequest) {
  // Use Sentry tracing for this operation
  try {
    const Sentry = await import("@sentry/nextjs")
    
    return await Sentry.startSpan(
      {
        op: "http.server",
        name: "POST /api/users/create",
      },
      async (span) => {
        span.setAttribute("http.method", "POST")
        span.setAttribute("http.route", "/api/users/create")
        
        try {
          return await executeCreateUser(request, span)
        } catch (error) {
          span.setStatus({ code: 2, message: error instanceof Error ? error.message : "Unknown error" })
          span.setAttribute("error", true)
          throw error
        }
      }
    )
  } catch {
    // Sentry not available, execute without tracing
    return await executeCreateUser(request, null)
  }
}

async function executeCreateUser(request: NextRequest, span: any) {
  try {
    // Verify super admin access
    const authResult = await verifySuperAdmin(request);
    if (authResult.error || !authResult.auth) {
      return authResult.error!;
    }

    const { organizationId } = authResult.auth;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createUserSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validatedData.error.issues },
        { status: 400 }
      );
    }

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
    if (span) {
      span.setAttribute("step", "create_auth_user")
    }
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: validatedData.data.email,
        password: validatedData.data.password,
        email_confirm: true,
        user_metadata: {
          full_name: validatedData.data.full_name,
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
    if (span) {
      span.setAttribute("step", "create_user_record")
    }
    const { error: userError } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          id: authData.user.id,
          email: validatedData.data.email,
          full_name: validatedData.data.full_name,
        },
        {
          onConflict: "id",
        }
      );

    if (userError) {
      logError(userError, {
        action: "create_user_record",
        userId: authData.user.id,
        organizationId,
      }, "high");
      // Cleanup: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: `Failed to create user record: ${userError.message}` },
        { status: 400 }
      );
    }

    // Add to organization (use admin client to bypass RLS)
    if (span) {
      span.setAttribute("step", "add_to_organization")
    }
    const { error: orgUserError } = await supabaseAdmin
      .from("organization_users")
      .insert({
        organization_id: organizationId,
        user_id: authData.user.id,
        role: validatedData.data.role,
      });

    if (orgUserError) {
      logError(orgUserError, {
        action: "add_user_to_organization",
        userId: authData.user.id,
        organizationId,
      }, "high");
      // Cleanup
      await supabaseAdmin.from("users").delete().eq("id", authData.user.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: `Failed to add user to organization: ${orgUserError.message}` },
        { status: 400 }
      );
    }

    // Create user session (use admin client to bypass RLS)
    if (span) {
      span.setAttribute("step", "create_user_session")
    }
    const { error: sessionError } = await supabaseAdmin
      .from("user_sessions")
      .insert({
        user_id: authData.user.id,
        organization_id: organizationId,
      });

    if (sessionError) {
      logError(sessionError, {
        action: "create_user_session",
        userId: authData.user.id,
        organizationId,
      }, "high");
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
        email: validatedData.data.email,
        full_name: validatedData.data.full_name,
        role: validatedData.data.role,
      },
    });
  } catch (error) {
    logError(error, {
      action: "create_user",
    }, "high");
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    
    const errorMessage = handleApiError(error, "Failed to create user");
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Export with performance monitoring
export const POST = withPerformanceMonitoring(handleCreateUser, {
  slowThreshold: 2000, // Log warning if user creation takes > 2s
});

