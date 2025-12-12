"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Organization } from "@/types/database";

/**
 * Hook to get the current active organization for the logged-in user
 * Uses React Query for caching and deduplication
 * This ensures all data queries are scoped to the correct organization
 */
export function useOrganization() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: organization, isLoading, refetch, error } = useQuery({
    queryKey: ["organization", "current"],
    enabled: true, // Always enabled - we'll handle null returns gracefully
    queryFn: async () => {
      try {
        const authResult = await supabase.auth.getUser();
        const user = authResult.data?.user;
        const userError = authResult.error;

        // Handle auth errors gracefully - don't log them
        // They're expected when user is not authenticated or session expired
        // The dashboard layout will handle redirecting to signin
        if (userError || !user) {
          return null;
        }

        // First check if user has any organization_users link
        // This is faster and avoids querying user_sessions if user hasn't completed onboarding
        const { data: orgUsers, error: orgUsersError } = await supabase
          .from("organization_users")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        // If user has no organization_users link, they haven't completed onboarding
        // Return null silently - dashboard layout will redirect them
        if (orgUsersError || !orgUsers || orgUsers.length === 0) {
          return null;
        }

        // Now get the organization with join from user_sessions
        // This ensures we get the active organization
        const { data: session, error: sessionError } = await supabase
          .from("user_sessions")
          .select<"*, organizations(id, name, slug, type, size, description, email, phone, location, country, website, logo_url, currency, created_at, updated_at)", { organizations: Organization }>("*, organizations(id, name, slug, type, size, description, email, phone, location, country, website, logo_url, currency, created_at, updated_at)")
          .eq("user_id", user.id)
          .maybeSingle();

        if (sessionError) {
          // PGRST116 means no rows found - this is expected for users without an active session
          // They might have an organization_users link but no active session yet
          if (sessionError.code === "PGRST116") {
            return null;
          }

          // Log other errors only in development
          if (process.env.NODE_ENV === "development") {
            console.error("Error loading organization:", {
              message: sessionError.message || "Unknown error",
              code: sessionError.code || "Unknown code",
              details: sessionError.details || null,
              hint: sessionError.hint || null,
            });
          }
          
          // Return null instead of throwing to prevent UI crashes
          return null;
        }

        return (session?.organizations as Organization) || null;
      } catch (error) {
        // Handle unexpected errors silently
        // Return null to prevent UI crashes - dashboard layout will handle redirects
        return null;
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - organization rarely changes
    gcTime: 60 * 60 * 1000, // 1 hour - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: (failureCount, error) => {
      // Don't retry if it's a "no rows" error (expected for new users)
      if (error && typeof error === 'object' && 'code' in error && error.code === "PGRST116") {
        return false;
      }
      // Retry once for other errors
      return failureCount < 1;
    },
  });

  return { 
    organization: organization || null, 
    isLoading,
    refreshOrganization: () => refetch(),
  };
}

/**
 * Helper function to get organization ID for filtering queries
 * Use this in all data queries to ensure proper multi-tenancy
 */
export async function getCurrentOrganizationId(): Promise<string | null> {
  const supabase = createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: session } = await supabase
    .from("user_sessions")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  return (session as { organization_id: string } | null)?.organization_id || null;
}

