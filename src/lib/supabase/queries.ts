import { createClient as createServerClient } from './server'
import { User } from '@/types/database'
import { getActiveOrganizationOptimized } from './optimized-queries'

/**
 * Get user data
 * Optimized: Single query with proper error handling
 */
export async function getUser() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select<'*', User>('*')
    .eq('id', user.id)
    .single()

  return userData || null
}

/**
 * Get user organizations with organization details
 * Optimized: Uses join to get all data in one query
 */
export async function getUserOrganizations(userId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('organization_users')
    .select('*, organizations(*)')
    .eq('user_id', userId)

  if (error) throw error
  return data
}

/**
 * Get active organization for user
 * Optimized: Uses optimized query utility
 */
export async function getActiveOrganization(userId: string) {
  return getActiveOrganizationOptimized(userId)
}

export async function setActiveOrganization(
  userId: string,
  organizationId: string
) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('user_sessions')
    .upsert(
      {
        user_id: userId,
        organization_id: organizationId,
        updated_at: new Date().toISOString(),
      } as never,
      {
        onConflict: 'user_id',
      }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createOrganization(
  userId: string,
  orgData: {
    name: string
    slug: string
    type?: string
    settings?: Record<string, unknown>
  }
) {
  const supabase = await createServerClient()

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: orgData.name,
      slug: orgData.slug,
      type: orgData.type || 'other',
      settings: orgData.settings || {},
    } as never)
    .select()
    .single()

  if (orgError) throw orgError
  if (!org) throw new Error('Failed to create organization')

  const orgId = (org as Record<string, unknown>).id as string

  // Link user as admin
  const { error: linkError } = await supabase
    .from('organization_users')
    .insert({
      organization_id: orgId,
      user_id: userId,
      role: 'admin',
    } as never)

  if (linkError) throw linkError

  // Set as active organization
  await setActiveOrganization(userId, orgId)

  return org
}

