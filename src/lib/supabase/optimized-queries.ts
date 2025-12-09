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
 */
export async function getUserSessionAndRole(userId: string) {
  const supabase = await createServerClient()

  // Get both session and role in parallel
  const [sessionResult, roleResult] = await Promise.all([
    supabase
      .from('user_sessions')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('organization_users')
      .select('role, organization_id')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  // Check for errors
  if (sessionResult.error) {
    console.error("Error fetching session:", sessionResult.error)
  }
  if (roleResult.error) {
    console.error("Error fetching role:", roleResult.error)
  }

  const sessionData = sessionResult.data as { organization_id: string } | null;
  const roleData = roleResult.data as { role: string; organization_id: string } | null;

  return {
    session: sessionData,
    role: roleData?.role as OrganizationUser['role'] | undefined,
    organizationId: sessionData?.organization_id || roleData?.organization_id || null,
  }
}

