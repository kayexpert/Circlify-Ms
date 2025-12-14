"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type { Visitor as DBVisitor, VisitorInsert, VisitorUpdate } from "@/types/database-extension"
import type { Visitor } from "@/app/(dashboard)/dashboard/members/types"

// Helper to convert database Visitor to component Visitor format
function convertVisitor(visitor: DBVisitor): Visitor {
  return {
    id: parseInt(visitor.id.replace(/-/g, "").substring(0, 8), 16) || 0,
    first_name: visitor.first_name,
    last_name: visitor.last_name,
    middle_name: (visitor as any).middle_name || undefined,
    email: visitor.email || "",
    phone_number: visitor.phone_number || "",
    secondary_phone: (visitor as any).secondary_phone || undefined,
    photo: visitor.photo || undefined,
    status: visitor.status,
    visit_date: visitor.visit_date,
    source: visitor.source || "Walk-in",
    follow_up_required: visitor.follow_up_required || false,
    gender: visitor.gender || undefined,
    date_of_birth: (visitor as any).date_of_birth || undefined,
    marital_status: (visitor as any).marital_status || undefined,
    spouse_name: (visitor as any).spouse_name || undefined,
    number_of_children: (visitor as any).number_of_children || undefined,
    occupation: (visitor as any).occupation || undefined,
    address: visitor.address || undefined,
    city: (visitor as any).city || undefined,
    town: (visitor as any).town || undefined,
    region: (visitor as any).region || undefined,
    digital_address: (visitor as any).digital_address || undefined,
    invited_by: visitor.invited_by || undefined,
    interests: visitor.interests || undefined,
    notes: visitor.notes || undefined,
    follow_up_date: visitor.follow_up_date || undefined,
  }
}

/**
 * Hook to fetch all visitors for the current organization
 * @deprecated Use useVisitorsPaginated for better performance with large datasets
 */
export function useVisitors() {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["visitors", orgId],
    queryFn: async () => {
      if (!orgId) return []

      const { data, error } = await (supabase
        .from("visitors") as any)
        .select("id, first_name, last_name, middle_name, email, phone_number, secondary_phone, photo, status, visit_date, source, follow_up_required, gender, date_of_birth, marital_status, spouse_name, number_of_children, occupation, address, city, town, region, digital_address, invited_by, interests, notes, follow_up_date")
        .eq("organization_id", orgId)
        .order("visit_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500) // Limit to prevent slow queries - use pagination for larger datasets

      if (error) {
        console.error("Error fetching visitors:", error)
        throw error
      }

      return (data || []).map(convertVisitor)
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchOnReconnect: true,
  })
}

/**
 * Hook to fetch paginated visitors for the current organization
 */
export function useVisitorsPaginated(page: number = 1, pageSize: number = 20) {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["visitors", "paginated", orgId, page, pageSize],
    queryFn: async () => {
      if (!orgId) return { data: [], total: 0, page, pageSize, totalPages: 0 }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Fetch data and count in parallel
      const [dataResult, countResult] = await Promise.all([
        (supabase
          .from("visitors") as any)
          .select("id, first_name, last_name, middle_name, email, phone_number, secondary_phone, photo, status, visit_date, source, follow_up_required, gender, date_of_birth, marital_status, spouse_name, number_of_children, occupation, address, city, town, region, digital_address, invited_by, interests, notes, follow_up_date")
          .eq("organization_id", orgId)
          .order("visit_date", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, to),
        (supabase
          .from("visitors") as any)
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgId)
      ])

      if (dataResult.error) {
        console.error("Error fetching visitors:", dataResult.error)
        throw dataResult.error
      }

      const total = countResult.count || 0
      const totalPages = Math.ceil(total / pageSize)

      return {
        data: (dataResult.data || []).map(convertVisitor),
        total,
        page,
        pageSize,
        totalPages,
      }
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

/**
 * Hook to create a new visitor
 */
export function useCreateVisitor() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (visitorData: Omit<Visitor, "id">) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { data, error } = await (supabase
        .from("visitors") as any)
        .insert({
          organization_id: organization.id,
          first_name: visitorData.first_name,
          last_name: visitorData.last_name,
          middle_name: visitorData.middle_name || null,
          email: visitorData.email || null,
          phone_number: visitorData.phone_number || null,
          secondary_phone: visitorData.secondary_phone || null,
          photo: visitorData.photo || null,
          status: visitorData.status,
          visit_date: visitorData.visit_date,
          source: visitorData.source || null,
          follow_up_required: visitorData.follow_up_required || false,
          gender: visitorData.gender || null,
          date_of_birth: visitorData.date_of_birth || null,
          marital_status: visitorData.marital_status || null,
          spouse_name: visitorData.spouse_name || null,
          number_of_children: visitorData.number_of_children || null,
          occupation: visitorData.occupation || null,
          address: visitorData.address || null,
          city: visitorData.city || null,
          town: visitorData.town || null,
          region: visitorData.region || null,
          digital_address: visitorData.digital_address || null,
          invited_by: visitorData.invited_by || null,
          interests: visitorData.interests || null,
          notes: visitorData.notes || null,
          follow_up_date: visitorData.follow_up_date || null,
        } as VisitorInsert)
        .select()
        .single()

      if (error) {
        console.error("Error creating visitor:", error)
        throw error
      }

      return convertVisitor(data)
    },
    onSuccess: async () => {
      // Invalidate both main and paginated queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["visitors", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["visitors", "paginated", organization?.id] }),
      ])
      toast.success("Visitor created successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create visitor:", error)
      toast.error(error.message || "Failed to create visitor")
    },
  })
}

/**
 * Hook to update a visitor
 */
export function useUpdateVisitor() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Visitor> & { id: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const dbUpdateData: any = {}

      if (updateData.first_name) dbUpdateData.first_name = updateData.first_name
      if (updateData.last_name) dbUpdateData.last_name = updateData.last_name
      if (updateData.middle_name !== undefined) dbUpdateData.middle_name = updateData.middle_name || null
      if (updateData.email !== undefined) dbUpdateData.email = updateData.email || null
      if (updateData.phone_number !== undefined) dbUpdateData.phone_number = updateData.phone_number || null
      if (updateData.secondary_phone !== undefined) dbUpdateData.secondary_phone = updateData.secondary_phone || null
      if (updateData.photo !== undefined) dbUpdateData.photo = updateData.photo || null
      if (updateData.status) dbUpdateData.status = updateData.status
      if (updateData.visit_date) dbUpdateData.visit_date = updateData.visit_date
      if (updateData.source !== undefined) dbUpdateData.source = updateData.source || null
      if (updateData.follow_up_required !== undefined) dbUpdateData.follow_up_required = updateData.follow_up_required
      if (updateData.gender !== undefined) dbUpdateData.gender = updateData.gender || null
      if (updateData.date_of_birth !== undefined) dbUpdateData.date_of_birth = updateData.date_of_birth || null
      if (updateData.marital_status !== undefined) dbUpdateData.marital_status = updateData.marital_status || null
      if (updateData.spouse_name !== undefined) dbUpdateData.spouse_name = updateData.spouse_name || null
      if (updateData.number_of_children !== undefined) dbUpdateData.number_of_children = updateData.number_of_children || null
      if (updateData.occupation !== undefined) dbUpdateData.occupation = updateData.occupation || null
      if (updateData.address !== undefined) dbUpdateData.address = updateData.address || null
      if (updateData.city !== undefined) dbUpdateData.city = updateData.city || null
      if (updateData.town !== undefined) dbUpdateData.town = updateData.town || null
      if (updateData.region !== undefined) dbUpdateData.region = updateData.region || null
      if (updateData.digital_address !== undefined) dbUpdateData.digital_address = updateData.digital_address || null
      if (updateData.invited_by !== undefined) dbUpdateData.invited_by = updateData.invited_by || null
      if (updateData.interests !== undefined) dbUpdateData.interests = updateData.interests || null
      if (updateData.notes !== undefined) dbUpdateData.notes = updateData.notes || null
      if (updateData.follow_up_date !== undefined) dbUpdateData.follow_up_date = updateData.follow_up_date || null

      const { data, error } = await (supabase
        .from("visitors") as any)
        .update(dbUpdateData)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating visitor:", error)
        throw error
      }

      return convertVisitor(data)
    },
    onSuccess: async () => {
      // Invalidate both main and paginated queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["visitors", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["visitors", "paginated", organization?.id] }),
      ])
      toast.success("Visitor updated successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to update visitor:", error)
      toast.error(error.message || "Failed to update visitor")
    },
  })
}

/**
 * Hook to delete a visitor
 */
export function useDeleteVisitor() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (visitorId: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      // Get visitor data first to delete photo
      const { data: visitorData } = await (supabase
        .from("visitors") as any)
        .select("photo")
        .eq("id", visitorId)
        .eq("organization_id", organization.id)
        .single()

      // Delete the visitor record
      const { error } = await (supabase
        .from("visitors") as any)
        .delete()
        .eq("id", visitorId)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting visitor:", error)
        throw error
      }

      // Delete photo from storage if it exists
      if (visitorData?.photo && typeof visitorData.photo === 'string' && !visitorData.photo.startsWith('data:')) {
        try {
          await fetch('/api/members/delete-photo', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photoUrl: visitorData.photo }),
          })
        } catch (photoError) {
          // Log but don't fail the deletion if photo deletion fails
          console.error("Error deleting visitor photo from storage:", photoError)
        }
      }
    },
    onSuccess: async () => {
      // Invalidate both main and paginated queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["visitors", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["visitors", "paginated", organization?.id] }),
      ])
      toast.success("Visitor deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete visitor:", error)
      toast.error(error.message || "Failed to delete visitor")
    },
  })
}
