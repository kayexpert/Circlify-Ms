"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type { Child } from "@/app/(dashboard)/dashboard/children/types"

// Helper function to convert database row to Child type
function convertChild(data: any): Child {
    return {
        id: typeof data.id === 'string' ? parseInt(data.id.replace(/-/g, '').slice(0, 8), 16) : data.id,
        uuid: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        photo: data.photo,
        // Parent relationships (text fields)
        mother_name: data.mother_name,
        father_name: data.father_name,
        guardian_name: data.guardian_name,
        guardian_relationship: data.guardian_relationship,
        // Medical & Emergency
        medical_info: data.medical_info,
        allergies: data.allergies,
        special_needs: data.special_needs,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_phone: data.emergency_contact_phone,
        // Ministry
        enrolled_date: data.enrolled_date,
        status: data.status || 'active',
        class_group: data.class_group,
        notes: data.notes,
        created_at: data.created_at,
        updated_at: data.updated_at,
    }
}

// Define field selections for optimized queries
const CHILD_LIST_SELECT_FIELDS = "id, first_name, last_name, phone_number, date_of_birth, gender, photo, status, class_group, mother_name, father_name, guardian_name, enrolled_date, created_at, updated_at"
const CHILD_FULL_SELECT_FIELDS = "id, first_name, last_name, phone_number, date_of_birth, gender, photo, mother_name, father_name, guardian_name, guardian_relationship, medical_info, allergies, special_needs, emergency_contact_name, emergency_contact_phone, enrolled_date, status, class_group, notes, created_at, updated_at"

// Helper to get typed table reference (bypasses TypeScript since table not in generated types yet)
function getChildrenTable(supabase: ReturnType<typeof createClient>) {
    return supabase.from("children" as any) as any
}

/**
 * Hook to fetch all children for the current organization
 */
export function useChildren() {
    const { organization } = useOrganization()
    const supabase = createClient()
    const orgId = organization?.id

    return useQuery({
        queryKey: ["children", orgId],
        queryFn: async () => {
            if (!orgId) return []

            const { data, error } = await getChildrenTable(supabase)
                .select(CHILD_LIST_SELECT_FIELDS)
                .eq("organization_id", orgId)
                .order("last_name", { ascending: true })
                .order("first_name", { ascending: true })
                .limit(1000)

            if (error) {
                console.error("Error fetching children:", error)
                throw error
            }

            return (data || []).map(convertChild)
        },
        enabled: !!orgId,
        staleTime: 10 * 1000, // 10 seconds for faster updates
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    })
}

/**
 * Hook to fetch paginated children for the current organization
 */
export function useChildrenPaginated(page: number = 1, pageSize: number = 24) {
    const { organization } = useOrganization()
    const supabase = createClient()
    const orgId = organization?.id

    return useQuery({
        queryKey: ["children", "paginated", orgId, page, pageSize],
        queryFn: async () => {
            if (!orgId) return { data: [], total: 0, page, pageSize, totalPages: 0 }

            const from = (page - 1) * pageSize
            const to = from + pageSize - 1

            const [dataResult, countResult] = await Promise.all([
                getChildrenTable(supabase)
                    .select(CHILD_LIST_SELECT_FIELDS)
                    .eq("organization_id", orgId)
                    .order("last_name", { ascending: true })
                    .order("first_name", { ascending: true })
                    .range(from, to),
                getChildrenTable(supabase)
                    .select("*", { count: "exact", head: true })
                    .eq("organization_id", orgId)
            ])

            if (dataResult.error) {
                console.error("Error fetching children:", dataResult.error)
                throw dataResult.error
            }

            const total = countResult.count || 0
            const totalPages = Math.ceil(total / pageSize)

            return {
                data: (dataResult.data || []).map(convertChild),
                total,
                page,
                pageSize,
                totalPages,
            }
        },
        enabled: !!orgId,
        staleTime: 10 * 1000, // 10 seconds for faster updates
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    })
}

/**
 * Hook to fetch children by status
 */
export function useChildrenByStatus(status: "active" | "inactive" | "graduated") {
    const { organization, isLoading: orgLoading } = useOrganization()
    const supabase = createClient()

    return useQuery({
        queryKey: ["children", organization?.id, status],
        queryFn: async () => {
            if (!organization?.id) return []

            const { data, error } = await getChildrenTable(supabase)
                .select(CHILD_LIST_SELECT_FIELDS)
                .eq("organization_id", organization.id)
                .eq("status", status)
                .order("last_name", { ascending: true })
                .order("first_name", { ascending: true })
                .limit(1000)

            if (error) {
                console.error("Error fetching children by status:", error)
                throw error
            }

            return (data || []).map(convertChild)
        },
        enabled: !!organization?.id && !orgLoading,
        staleTime: 10 * 1000, // 10 seconds for faster updates
        refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    })
}

/**
 * Hook to create a new child
 */
// ... (useCreateChild)
export function useCreateChild() {
    const queryClient = useQueryClient()
    const { organization } = useOrganization()
    const supabase = createClient()

    return useMutation({
        mutationFn: async (childData: Omit<Child, "id" | "uuid">) => {
            if (!organization?.id) throw new Error("No organization selected")

            const { data, error } = await getChildrenTable(supabase)
                .insert({
                    organization_id: organization.id,
                    first_name: childData.first_name,
                    last_name: childData.last_name,
                    phone_number: childData.phone_number ?? null,
                    date_of_birth: childData.date_of_birth ?? null,
                    gender: childData.gender ?? null,
                    photo: childData.photo ?? null,
                    mother_name: childData.mother_name ?? null,
                    father_name: childData.father_name ?? null,
                    guardian_name: childData.guardian_name ?? null,
                    guardian_relationship: childData.guardian_relationship ?? null,
                    medical_info: childData.medical_info ?? null,
                    allergies: childData.allergies ?? null,
                    special_needs: childData.special_needs ?? null,
                    emergency_contact_name: childData.emergency_contact_name ?? null,
                    emergency_contact_phone: childData.emergency_contact_phone ?? null,
                    enrolled_date: childData.enrolled_date ?? null,
                    status: childData.status || 'active',
                    class_group: childData.class_group ?? null,
                    notes: childData.notes ?? null,
                })
                .select()
                .single()

            if (error) {
                console.error("Error creating child:", error)
                throw error
            }

            return convertChild(data)
        },
        onSuccess: async (newChild) => {
            const orgId = organization?.id
            if (orgId && newChild) {
                // Manually update the list cache to show new child immediately
                queryClient.setQueryData(["children", orgId], (oldData: Child[] | undefined) => {
                    if (!oldData) return [newChild]
                    // Append and sort (simple sort by name)
                    return [...oldData, newChild].sort((a, b) =>
                        a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)
                    )
                })

                // Update paginated cache if possible (complex due to pages, so we at least try)
                queryClient.invalidateQueries({ queryKey: ["children", "paginated", orgId] })
            }

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["children", orgId] }),
                queryClient.invalidateQueries({ queryKey: ["child_statistics", organization?.id] }),
                queryClient.invalidateQueries({ queryKey: ["child_class_groups", organization?.id] }),
            ])
            toast.success("Child added successfully")
        },
        onError: (error: Error) => {
            console.error("Failed to create child:", error)
            toast.error(error.message || "Failed to add child")
        },
    })
}

/**
 * Hook to update a child
 */
export function useUpdateChild() {
    const queryClient = useQueryClient()
    const { organization } = useOrganization()
    const supabase = createClient()

    return useMutation({
        mutationFn: async ({ id, ...updateData }: Partial<Child> & { id: string }) => {
            if (!organization?.id) throw new Error("No organization selected")

            const dbUpdateData: Record<string, any> = {}

            if (updateData.first_name !== undefined) dbUpdateData.first_name = updateData.first_name
            if (updateData.last_name !== undefined) dbUpdateData.last_name = updateData.last_name
            if (updateData.phone_number !== undefined) dbUpdateData.phone_number = updateData.phone_number
            if (updateData.date_of_birth !== undefined) dbUpdateData.date_of_birth = updateData.date_of_birth
            if (updateData.gender !== undefined) dbUpdateData.gender = updateData.gender
            if (updateData.photo !== undefined) dbUpdateData.photo = updateData.photo
            if (updateData.mother_name !== undefined) dbUpdateData.mother_name = updateData.mother_name
            if (updateData.father_name !== undefined) dbUpdateData.father_name = updateData.father_name
            if (updateData.guardian_name !== undefined) dbUpdateData.guardian_name = updateData.guardian_name
            if (updateData.guardian_relationship !== undefined) dbUpdateData.guardian_relationship = updateData.guardian_relationship
            if (updateData.medical_info !== undefined) dbUpdateData.medical_info = updateData.medical_info
            if (updateData.allergies !== undefined) dbUpdateData.allergies = updateData.allergies
            if (updateData.special_needs !== undefined) dbUpdateData.special_needs = updateData.special_needs
            if (updateData.emergency_contact_name !== undefined) dbUpdateData.emergency_contact_name = updateData.emergency_contact_name
            if (updateData.emergency_contact_phone !== undefined) dbUpdateData.emergency_contact_phone = updateData.emergency_contact_phone
            if (updateData.enrolled_date !== undefined) dbUpdateData.enrolled_date = updateData.enrolled_date
            if (updateData.status !== undefined) dbUpdateData.status = updateData.status
            if (updateData.class_group !== undefined) dbUpdateData.class_group = updateData.class_group
            if (updateData.notes !== undefined) dbUpdateData.notes = updateData.notes

            const { data, error } = await getChildrenTable(supabase)
                .update(dbUpdateData)
                .eq("id", id)
                .eq("organization_id", organization.id)
                .select()
                .single()

            if (error) {
                console.error("Error updating child:", error)
                throw error
            }

            return convertChild(data)
        },
        onSuccess: async (updatedChild) => {
            const orgId = organization?.id
            if (orgId && updatedChild) {
                queryClient.setQueryData(["children", orgId, updatedChild.uuid], updatedChild)

                // Manually update the main children list
                queryClient.setQueryData(["children", orgId], (oldData: Child[] | undefined) => {
                    if (!oldData) return oldData
                    return oldData.map((c: Child) =>
                        c.uuid === updatedChild.uuid ? updatedChild : c
                    )
                })

                queryClient.setQueriesData(
                    { queryKey: ["children", "paginated", orgId] },
                    (oldData: any) => {
                        if (!oldData?.data) return oldData
                        const updated = oldData.data.map((c: Child) =>
                            c.uuid === updatedChild.uuid ? updatedChild : c
                        )
                        return { ...oldData, data: updated }
                    }
                )
            }

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["children", orgId] }),
                queryClient.invalidateQueries({ queryKey: ["child_statistics", orgId] }),
                queryClient.invalidateQueries({ queryKey: ["child_class_groups", orgId] }),
            ])
            toast.success("Child updated successfully")
            return updatedChild
        },
        onError: (error: Error) => {
            console.error("Failed to update child:", error)
            toast.error(error.message || "Failed to update child")
        },
    })
}

/**
 * Hook to delete a child
 */
export function useDeleteChild() {
    const queryClient = useQueryClient()
    const { organization } = useOrganization()
    const supabase = createClient()

    return useMutation({
        mutationFn: async (childId: string) => {
            if (!organization?.id) throw new Error("No organization selected")

            const { error } = await getChildrenTable(supabase)
                .delete()
                .eq("id", childId)
                .eq("organization_id", organization.id)

            if (error) {
                console.error("Error deleting child:", error)
                throw error
            }

            return childId // Return the ID so we can use it in onSuccess
        },
        onSuccess: async (deletedChildId) => {
            const orgId = organization?.id

            if (orgId && deletedChildId) {
                // Manually remove from list
                queryClient.setQueryData(["children", orgId], (oldData: Child[] | undefined) => {
                    if (!oldData) return oldData
                    return oldData.filter((c: Child) => c.uuid !== deletedChildId)
                })
            }

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["children", organization?.id] }),
                queryClient.invalidateQueries({ queryKey: ["children", "paginated", organization?.id] }),
                queryClient.invalidateQueries({ queryKey: ["child_statistics", organization?.id] }),
                queryClient.invalidateQueries({ queryKey: ["child_class_groups", organization?.id] }),
            ])
            toast.success("Child removed successfully")
        },
        onError: (error: Error) => {
            console.error("Failed to delete child:", error)
            toast.error(error.message || "Failed to remove child")
        },
    })
}

/**
 * Hook to get a single child by ID
 */
export function useChild(childId: string | null) {
    const { organization, isLoading: orgLoading } = useOrganization()
    const supabase = createClient()

    return useQuery({
        queryKey: ["children", organization?.id, childId],
        queryFn: async () => {
            if (!organization?.id || !childId) return null

            const { data, error } = await getChildrenTable(supabase)
                .select(CHILD_FULL_SELECT_FIELDS)
                .eq("id", childId)
                .eq("organization_id", organization.id)
                .single()

            if (error) {
                console.error("Error fetching child:", error)
                throw error
            }

            return data ? convertChild(data) : null
        },
        enabled: !!organization?.id && !!childId && !orgLoading,
        staleTime: 10 * 1000, // 10 seconds for faster updates
        refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    })
}

/**
 * Hook to get children statistics
 */
export function useChildStatistics() {
    const { organization } = useOrganization()
    const supabase = createClient()

    return useQuery({
        queryKey: ["child_statistics", organization?.id],
        queryFn: async () => {
            if (!organization?.id) return null

            // Get counts by status
            const [activeResult, inactiveResult, graduatedResult, totalResult] = await Promise.all([
                getChildrenTable(supabase)
                    .select("*", { count: "exact", head: true })
                    .eq("organization_id", organization.id)
                    .eq("status", "active"),
                getChildrenTable(supabase)
                    .select("*", { count: "exact", head: true })
                    .eq("organization_id", organization.id)
                    .eq("status", "inactive"),
                getChildrenTable(supabase)
                    .select("*", { count: "exact", head: true })
                    .eq("organization_id", organization.id)
                    .eq("status", "graduated"),
                getChildrenTable(supabase)
                    .select("*", { count: "exact", head: true })
                    .eq("organization_id", organization.id),
            ])

            return {
                total_children: totalResult.count || 0,
                active_children: activeResult.count || 0,
                inactive_children: inactiveResult.count || 0,
                graduated_children: graduatedResult.count || 0,
            }
        },
        enabled: !!organization?.id,
        staleTime: 10 * 1000, // 10 seconds for faster updates
        refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    })
}
