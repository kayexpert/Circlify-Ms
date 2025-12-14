"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import { convertMember } from "@/lib/utils/type-converters"
import type { Member as DBMember, MemberInsert, MemberUpdate } from "@/types/database-extension"
import type { Member } from "@/app/(dashboard)/dashboard/members/types"

// Define field selections for optimized queries
// Lightweight fields for list view (grid/card display) - optimized for performance
const MEMBER_LIST_SELECT_FIELDS = "id, first_name, last_name, email, phone_number, secondary_phone, photo, membership_status, join_date, groups, departments, roles"
// Full fields for detail view (form editing) - includes all profile fields
const MEMBER_FULL_SELECT_FIELDS = "id, first_name, last_name, middle_name, email, phone_number, secondary_phone, photo, membership_status, join_date, gender, date_of_birth, marital_status, spouse_name, number_of_children, occupation, address, city, town, region, digital_address, notes, groups, departments, roles, created_at, updated_at"

/**
 * Hook to fetch all members for the current organization
 * @deprecated Use useMembersPaginated for better performance with large datasets
 */
export function useMembers() {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["members", orgId],
    queryFn: async () => {
      if (!orgId) return []

      const { data, error } = await (supabase
        .from("members") as any)
        .select("id, first_name, last_name, middle_name, email, phone_number, secondary_phone, photo, membership_status, join_date, gender, date_of_birth, marital_status, spouse_name, number_of_children, occupation, address, city, town, region, digital_address, notes, groups, departments, roles")
        .eq("organization_id", orgId)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true })
        .limit(1000) // Limit to prevent slow queries - use pagination for larger datasets

      if (error) {
        console.error("Error fetching members:", error)
        throw error
      }

      return (data || []).map(convertMember)
    },
    enabled: !!orgId, // Only enabled when orgId exists (non-blocking)
    staleTime: 5 * 60 * 1000, // 5 minutes - balance between freshness and performance
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchOnReconnect: true, // Only refetch on reconnect
  })
}

/**
 * Hook to fetch paginated members for the current organization
 */
export function useMembersPaginated(page: number = 1, pageSize: number = 20) {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["members", "paginated", orgId, page, pageSize],
    queryFn: async () => {
      if (!orgId) return { data: [], total: 0, page, pageSize, totalPages: 0 }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Fetch data and count in parallel
      // Use lightweight fields for paginated list view
      const [dataResult, countResult] = await Promise.all([
        (supabase
          .from("members") as any)
          .select(MEMBER_LIST_SELECT_FIELDS)
          .eq("organization_id", orgId)
          .order("last_name", { ascending: true })
          .order("first_name", { ascending: true })
          .range(from, to),
        (supabase
          .from("members") as any)
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgId)
      ])

      if (dataResult.error) {
        console.error("Error fetching members:", dataResult.error)
        throw dataResult.error
      }

      const total = countResult.count || 0
      const totalPages = Math.ceil(total / pageSize)

      return {
        data: (dataResult.data || []).map(convertMember),
        total,
        page,
        pageSize,
        totalPages,
      }
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

/**
 * Hook to fetch members by status
 */
export function useMembersByStatus(status: "active" | "inactive" | "visitor") {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["members", organization?.id, status],
    queryFn: async () => {
      if (!organization?.id) return []

      // Use lightweight fields for status-based list view
      const { data, error } = await (supabase
        .from("members") as any)
        .select(MEMBER_LIST_SELECT_FIELDS)
        .eq("organization_id", organization.id)
        .eq("membership_status", status)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true })
        .limit(1000) // Limit to prevent loading too much data

      if (error) {
        console.error("Error fetching members by status:", error)
        throw error
      }

      return (data || []).map(convertMember)
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to create a new member
 */
export function useCreateMember() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (memberData: Omit<Member, "id" | "uuid">) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { data, error } = await (supabase
        .from("members") as any)
        .insert({
          organization_id: organization.id,
          first_name: memberData.first_name,
          last_name: memberData.last_name,
          // All fields are already converted to null if empty in handleSubmit, so use directly
          middle_name: memberData.middle_name ?? null,
          email: memberData.email ?? null,
          phone_number: memberData.phone_number ?? null,
          secondary_phone: memberData.secondary_phone ?? null,
          photo: memberData.photo ?? null,
          membership_status: memberData.membership_status,
          join_date: memberData.join_date ?? null,
          gender: memberData.gender ?? null,
          date_of_birth: memberData.date_of_birth ?? null,
          marital_status: memberData.marital_status ?? null,
          spouse_name: memberData.spouse_name ?? null,
          number_of_children: memberData.number_of_children ?? null,
          occupation: memberData.occupation ?? null,
          address: memberData.address ?? null,
          city: memberData.city ?? null,
          town: memberData.town ?? null,
          region: memberData.region ?? null,
          digital_address: memberData.digital_address ?? null,
          notes: memberData.notes ?? null,
          groups: Array.isArray(memberData.groups) ? memberData.groups : [],
          departments: Array.isArray(memberData.departments) ? memberData.departments : [],
          roles: Array.isArray(memberData.roles) ? memberData.roles : [],
        } as MemberInsert)
        .select()
        .single()

      if (error) {
        console.error("Error creating member:", error)
        throw error
      }

      return convertMember(data)
    },
    onSuccess: async () => {
      // Invalidate both main and paginated queries, plus statistics
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["members", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["members", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["member_statistics", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["upcoming_birthdays", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["member_growth", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["recent_members", organization?.id] }),
      ])
      toast.success("Member created successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create member:", error)
      toast.error(error.message || "Failed to create member")
    },
  })
}

/**
 * Hook to update a member
 */
export function useUpdateMember() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Member> & { id: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const dbUpdateData: Partial<MemberUpdate> = {}

      // Always include all fields if they are provided (including null values)
      // Empty strings are already converted to null in handleSubmit, so we can directly assign
      if (updateData.first_name !== undefined) dbUpdateData.first_name = updateData.first_name
      if (updateData.last_name !== undefined) dbUpdateData.last_name = updateData.last_name
      if (updateData.middle_name !== undefined) dbUpdateData.middle_name = updateData.middle_name
      if (updateData.email !== undefined) dbUpdateData.email = updateData.email
      if (updateData.phone_number !== undefined) dbUpdateData.phone_number = updateData.phone_number
      if (updateData.secondary_phone !== undefined) dbUpdateData.secondary_phone = updateData.secondary_phone
      if (updateData.photo !== undefined) dbUpdateData.photo = updateData.photo
      if (updateData.membership_status !== undefined) dbUpdateData.membership_status = updateData.membership_status
      if (updateData.join_date !== undefined) dbUpdateData.join_date = updateData.join_date
      if (updateData.gender !== undefined) dbUpdateData.gender = updateData.gender
      if (updateData.date_of_birth !== undefined) dbUpdateData.date_of_birth = updateData.date_of_birth
      if (updateData.marital_status !== undefined) dbUpdateData.marital_status = updateData.marital_status
      if (updateData.spouse_name !== undefined) dbUpdateData.spouse_name = updateData.spouse_name
      if (updateData.number_of_children !== undefined) dbUpdateData.number_of_children = updateData.number_of_children
      if (updateData.occupation !== undefined) dbUpdateData.occupation = updateData.occupation
      if (updateData.address !== undefined) dbUpdateData.address = updateData.address
      if (updateData.city !== undefined) dbUpdateData.city = updateData.city
      if (updateData.town !== undefined) dbUpdateData.town = updateData.town
      if (updateData.region !== undefined) dbUpdateData.region = updateData.region
      if (updateData.digital_address !== undefined) dbUpdateData.digital_address = updateData.digital_address
      if (updateData.notes !== undefined) dbUpdateData.notes = updateData.notes
      // Handle groups, departments, and roles - empty arrays should be set to empty arrays, not null
      if (updateData.groups !== undefined) {
        dbUpdateData.groups = Array.isArray(updateData.groups) && updateData.groups.length > 0 ? updateData.groups : []
      }
      if (updateData.departments !== undefined) {
        dbUpdateData.departments = Array.isArray(updateData.departments) && updateData.departments.length > 0 ? updateData.departments : []
      }
      if (updateData.roles !== undefined) {
        dbUpdateData.roles = Array.isArray(updateData.roles) && updateData.roles.length > 0 ? updateData.roles : []
      }

      const { data, error } = await (supabase
        .from("members") as any)
        .update(dbUpdateData)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating member:", error)
        throw error
      }

      return convertMember(data)
    },
    onSuccess: async (updatedMember) => {
      // Optimize cache updates - update cache directly instead of invalidating when possible
      const orgId = organization?.id
      if (orgId && updatedMember) {
        // Update individual member cache
        queryClient.setQueryData(["members", orgId, updatedMember.uuid], updatedMember)
        
        // Update paginated cache if member is in current page
        queryClient.setQueriesData(
          { queryKey: ["members", "paginated", orgId] },
          (oldData: any) => {
            if (!oldData?.data) return oldData
            const updated = oldData.data.map((m: Member) => 
              m.uuid === updatedMember.uuid ? updatedMember : m
            )
            return { ...oldData, data: updated }
          }
        )
      }
      
      // Invalidate statistics queries (these need recalculation)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["member_statistics", orgId] }),
        queryClient.invalidateQueries({ queryKey: ["upcoming_birthdays", orgId] }),
        queryClient.invalidateQueries({ queryKey: ["member_growth", orgId] }),
      ])
      toast.success("Member updated successfully")
      return updatedMember
    },
    onError: (error: Error) => {
      console.error("Failed to update member:", error)
      toast.error(error.message || "Failed to update member")
    },
  })
}

/**
 * Hook to delete a member
 */
export function useDeleteMember() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (memberId: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      // Get member data first to delete photo
      const { data: memberData } = await (supabase
        .from("members") as any)
        .select("photo")
        .eq("id", memberId)
        .eq("organization_id", organization.id)
        .single()

      // Delete the member record
      const { error } = await (supabase
        .from("members") as any)
        .delete()
        .eq("id", memberId)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting member:", error)
        throw error
      }

      // Delete photo from storage if it exists
      // Use retry logic for transient failures
      if (memberData?.photo && typeof memberData.photo === 'string' && !memberData.photo.startsWith('data:')) {
        const { retry } = await import('@/lib/utils/retry')
        
        try {
          await retry(
            async () => {
              const response = await fetch('/api/members/delete-photo', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photoUrl: memberData.photo }),
              })
              
              if (!response.ok) {
                throw new Error(`Failed to delete photo: ${response.statusText}`)
              }
              
              return response
            },
            {
              maxAttempts: 3,
              initialDelay: 1000,
              retryable: (error) => {
                // Retry on network errors or 5xx server errors
                if (error instanceof Error) {
                  const message = error.message.toLowerCase()
                  return message.includes('network') || message.includes('failed')
                }
                return false
              }
            }
          )
        } catch (photoError) {
          // Log but don't fail the deletion if photo deletion fails after retries
          console.error("Error deleting member photo from storage after retries:", photoError)
          // Optionally: Queue for background cleanup job
        }
      }
    },
    onSuccess: async () => {
      // Invalidate both main and paginated queries, plus statistics
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["members", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["members", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["member_statistics", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["upcoming_birthdays", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["member_growth", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["recent_members", organization?.id] }),
      ])
      toast.success("Member deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete member:", error)
      toast.error(error.message || "Failed to delete member")
    },
  })
}

/**
 * Hook to get a single member by ID
 */
export function useMember(memberId: string | null) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["members", organization?.id, memberId],
    queryFn: async () => {
      if (!organization?.id || !memberId) return null

      // Use full fields for single member detail view
      const { data, error } = await (supabase
        .from("members") as any)
        .select(MEMBER_FULL_SELECT_FIELDS)
        .eq("id", memberId)
        .eq("organization_id", organization.id)
        .single()

      if (error) {
        console.error("Error fetching member:", error)
        throw error
      }

      return data ? convertMember(data) : null
    },
    enabled: !!organization?.id && !!memberId && !orgLoading,
    staleTime: 5 * 60 * 1000,
  })
}
