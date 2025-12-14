import { createClient as createServerClient } from './server'
import { User, Organization, OrganizationUser, UserSession } from '@/types/database'

/**
 * Optimized query utilities that combine multiple queries into single operations
 * to reduce database round trips and improve performance
 */

/**
 * Get user with their active organization in a single query
 * This replaces multiple sequential queries with a single optimized query
 */
export async function getUserWithActiveOrganization() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Single query to get user, session, and organization
  const { data, error } = await supabase
    .from('user_sessions')
    .select(`
      organization_id,
      organizations (
        id,
        name,
        slug,
        type,
        size,
        description,
        currency,
        location,
        country,
        phone,
        email,
        website,
        logo_url,
        settings,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    // Fallback to separate queries if join fails
    const { data: userData } = await supabase
      .from('users')
      .select<'*', User>('*')
      .eq('id', user.id)
      .single()

    return {
      user: userData,
      organization: null,
      session: null,
    }
  }

  const { data: userData } = await supabase
    .from('users')
    .select<'*', User>('*')
    .eq('id', user.id)
    .single()

  const sessionData = data as { organization_id: string; organizations: Organization | null };
  
  return {
    user: userData || null,
    organization: (sessionData.organizations as Organization) || null,
    session: {
      organization_id: sessionData.organization_id,
    } as Partial<UserSession>,
  }
}

/**
 * Get user with their role and organization in a single optimized query
 */
export async function getUserWithRoleAndOrganization() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Optimized query: get organization_users with organization and session in one go
  const { data: orgUserData, error: orgUserError } = await supabase
    .from('organization_users')
    .select(`
      role,
      organization_id,
      organizations (
        id,
        name,
        slug,
        type,
        size,
        description,
        currency,
        location,
        country,
        phone,
        email,
        website,
        logo_url,
        settings,
        created_at,
        updated_at
      ),
      user_sessions!inner (
        organization_id
      )
    `)
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (orgUserError || !orgUserData) {
    return null
  }

  const { data: userData } = await supabase
    .from('users')
    .select<'*', User>('*')
    .eq('id', user.id)
    .single()

  const orgData = orgUserData as { 
    role: string; 
    organization_id: string; 
    organizations: Organization | null;
  };

  return {
    user: userData || null,
    role: (orgData.role as OrganizationUser['role']) || null,
    organization: (orgData.organizations as Organization) || null,
    organizationId: orgData.organization_id,
  }
}

/**
 * Get all users in organization with their roles in a single optimized query
 * This replaces the N+1 query pattern in the users page
 */
export async function getOrganizationUsersWithDetails(organizationId: string) {
  const supabase = await createServerClient()

  // Single query with join instead of multiple queries
  const { data, error } = await supabase
    .from('organization_users')
    .select(`
      id,
      role,
      user_id,
      organization_id,
      created_at,
      updated_at,
      users (
        id,
        email,
        full_name,
        avatar_url,
        created_at,
        updated_at
      )
    `)
    .eq('organization_id', organizationId)

  if (error) throw error

  return (data as Array<{ 
    id: string; 
    role: string; 
    users: unknown;
  }> | null)?.map((item) => ({
    ...(item.users as unknown as User),
    role: item.role,
    organization_user_id: item.id,
  })) || []
}

/**
 * Get user session with organization in a single query
 */
export async function getActiveOrganizationOptimized(userId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('user_sessions')
    .select(`
      *,
      organizations (*)
    `)
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data
}

/**
 * Batch get user role and organization ID in a single query
 * Used in API routes to reduce sequential queries
 */
export async function getUserRoleAndOrganizationId(userId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('organization_users')
    .select('role, organization_id')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}

/**
 * Batch get session and role check in optimized way
 * Used in API routes to combine authentication checks
 * This version creates separate client instances for each query to avoid transaction conflicts
 */
export async function getUserSessionAndRole(userId: string) {
  // Create separate client instances for each query to ensure they run in separate transactions
  // This prevents transaction rollback issues when one query fails
  console.log("[getUserSessionAndRole] Fetching session for user:", userId)
  
  const sessionClient = await createServerClient()
  const sessionResult = await sessionClient
    .from('user_sessions')
    .select('organization_id, created_at')
    .eq('user_id', userId)

  // Check for errors immediately
  if (sessionResult.error) {
    console.error("[getUserSessionAndRole] Error fetching session:", {
      error: sessionResult.error,
      code: sessionResult.error.code,
      message: sessionResult.error.message,
      details: sessionResult.error.details,
      hint: sessionResult.error.hint,
    })
    // Don't return early - continue to try role query with a fresh client
  }

  console.log("[getUserSessionAndRole] Fetching role for user:", userId)
  
  // Create a fresh client for the role query to ensure it runs in a separate transaction
  const roleClient = await createServerClient()
  const roleResult = await roleClient
    .from('organization_users')
    .select('role, organization_id')
    .eq('user_id', userId)

  // Check for errors
  if (roleResult.error) {
    console.error("[getUserSessionAndRole] Error fetching role:", {
      error: roleResult.error,
      code: roleResult.error.code,
      message: roleResult.error.message,
      details: roleResult.error.details,
      hint: roleResult.error.hint,
    })
  }

  // If both queries failed, return null
  if (sessionResult.error && roleResult.error) {
    return {
      session: null,
      role: undefined,
      organizationId: null,
    }
  }

  // Get the most recent session manually
  const allSessions = sessionResult.data as Array<{ organization_id: string; created_at: string }> | null;
  const sessionData = allSessions && allSessions.length > 0
    ? allSessions.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )[0]
    : null;

  // Get the first organization_users record (should only be one per user per org)
  const allOrgUsers = roleResult.data as Array<{ role: string; organization_id: string }> | null;
  const roleData = allOrgUsers && allOrgUsers.length > 0 ? allOrgUsers[0] : null;

  console.log("[getUserSessionAndRole] Query results:", {
    hasSession: !!sessionData,
    hasRole: !!roleData,
    organizationId: sessionData?.organization_id || roleData?.organization_id || null,
  })

  return {
    session: sessionData,
    role: roleData?.role as OrganizationUser['role'] | undefined,
    organizationId: sessionData?.organization_id || roleData?.organization_id || null,
  }
}

