"use client";

import { createClient } from "@/lib/supabase/client";

export type Permission = string; // e.g., "members.read", "finance.write"
export type Role = "super_admin" | "admin" | "member" | "viewer";

/**
 * Get the current user's role in their organization
 */
export async function getUserRole(): Promise<Role | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: orgUser } = await supabase
    .from("organization_users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  return ((orgUser as { role: Role } | null)?.role) || null;
}

/**
 * Check if the current user has a specific permission
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
  const role = await getUserRole();
  if (!role) return false;

  // Super admin has all permissions
  if (role === "super_admin") return true;

  const supabase = createClient();

  // Check if role has this permission
  const { data } = await supabase
    .from("role_permissions")
    .select("permission_id, permissions!inner(name)")
    .eq("role", role)
    .eq("permissions.name", permission)
    .single() as { data: { permission_id: string; permissions: { name: string } } | null };

  return !!data;
}

/**
 * Check if the current user has any of the specified permissions
 */
export async function hasAnyPermission(
  permissions: Permission[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermission(permission)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if the current user has all of the specified permissions
 */
export async function hasAllPermissions(
  permissions: Permission[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await hasPermission(permission))) {
      return false;
    }
  }
  return true;
}

/**
 * Get all permissions for the current user's role
 */
export async function getUserPermissions(): Promise<Permission[]> {
  const role = await getUserRole();
  if (!role) return [];

  // Super admin has all permissions
  if (role === "super_admin") {
    const supabase = createClient();
    const { data } = await supabase.from("permissions").select("name");
    return (data as { name: string }[] | null)?.map((p) => p.name) || [];
  }

  const supabase = createClient();

  const { data } = await supabase
    .from("role_permissions")
    .select("permissions!inner(name)")
    .eq("role", role) as { data: { permissions: { name: string } }[] | null };

  return data?.map((rp) => rp.permissions.name) || [];
}

/**
 * Check if user is super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === "super_admin";
}

/**
 * Check if user is admin or super admin
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === "super_admin" || role === "admin";
}

