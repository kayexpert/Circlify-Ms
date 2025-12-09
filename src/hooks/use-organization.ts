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

  const { data: organization, isLoading, refetch } = useQuery({
    queryKey: ["organization", "current"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      // Optimized: Get organization with join instead of two queries, using selective fields
      const { data: session, error } = await supabase
        .from("user_sessions")
        .select<"*, organizations(id, name, slug, type, size, description, email, phone, location, country, website, logo_url, currency, created_at, updated_at)", { organizations: Organization }>("*, organizations(id, name, slug, type, size, description, email, phone, location, country, website, logo_url, currency, created_at, updated_at)")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error loading organization:", error);
        throw error;
      }

      return (session?.organizations as Organization) || null;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - organization rarely changes
    gcTime: 60 * 60 * 1000, // 1 hour - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 1,
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

