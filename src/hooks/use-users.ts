"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { User as UserType, OrganizationUser } from "@/types/database";

interface UserWithRole extends UserType {
  role: OrganizationUser["role"];
  organization_user_id: string;
}

/**
 * Optimized hook to fetch and manage organization users
 * Prevents duplicate requests and uses optimized queries
 */
export function useOrganizationUsers() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const supabase = createClient();

  const loadUsers = useCallback(async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setIsLoading(false);
        return null;
      }

      // Optimized: Get role and organization in parallel
      const [orgUserResult, sessionResult] = await Promise.all([
        supabase
          .from("organization_users")
          .select("role, organization_id")
          .eq("user_id", authUser.id)
          .maybeSingle(),
        supabase
          .from("user_sessions")
          .select("organization_id")
          .eq("user_id", authUser.id)
          .maybeSingle(),
      ]);

      const currentUserOrg = orgUserResult.data as { role: string; organization_id: string } | null;
      const session = sessionResult.data as { organization_id: string } | null;

      if (!currentUserOrg) {
        setIsLoading(false);
        return null;
      }

      setCurrentUserRole(currentUserOrg.role);
      const orgId = session?.organization_id || currentUserOrg.organization_id;

      if (!orgId) {
        setIsLoading(false);
        return null;
      }

      setOrganizationId(orgId);

      // Create session if it doesn't exist
      if (!session?.organization_id && currentUserOrg.organization_id) {
        await supabase.from("user_sessions").upsert({
          user_id: authUser.id,
          organization_id: currentUserOrg.organization_id,
        } as never);
      }

      // Optimized: Single query with join to get all users with their details, with limit
      const { data: orgUsers, error: orgUsersError } = await supabase
        .from("organization_users")
        .select(`
          id,
          role,
          user_id,
          organization_id,
          users (
            id,
            email,
            full_name,
            avatar_url,
            created_at,
            updated_at
          )
        `)
        .eq("organization_id", orgId)
        .limit(100);

      if (orgUsersError) {
        throw orgUsersError;
      }

      const usersWithRoles: UserWithRole[] = (orgUsers || [])
        .map((ou) => {
          const orgUser = ou as { id: string; role: string; users: unknown };
          const user = orgUser.users as unknown as UserType;
          if (!user) return null;
          return {
            ...user,
            role: orgUser.role,
            organization_user_id: orgUser.id,
          };
        })
        .filter((u): u is UserWithRole => u !== null);

      setUsers(usersWithRoles);
      return { users: usersWithRoles, role: currentUserOrg.role, organizationId: orgId };
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const refreshUsers = useCallback(() => {
    setIsLoading(true);
    return loadUsers();
  }, [loadUsers]);

  return {
    users,
    currentUserRole,
    isLoading,
    organizationId,
    refreshUsers,
  };
}

