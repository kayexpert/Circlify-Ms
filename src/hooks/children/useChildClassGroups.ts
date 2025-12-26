"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type { ChildClassGroup } from "@/app/(dashboard)/dashboard/children/types"

// Helper to get typed table reference (bypasses TypeScript since table not in generated types yet)
function getClassGroupsTable(supabase: ReturnType<typeof createClient>) {
    return supabase.from("child_class_groups" as any) as any
}

// Helper function to convert database row to ChildClassGroup type
function convertClassGroup(data: any): ChildClassGroup {
    return {
        id: data.id,
        name: data.name,
        description: data.description,
        min_age: data.min_age,
        max_age: data.max_age,
        leader: data.leader,
        leader_id: data.leader_id,
        status: data.status || 'Active',
        children_count: data.children_count,
    } as any
}

/**
 * Hook to fetch all child class groups for the current organization
 */
export function useChildClassGroups() {
    const { organization } = useOrganization()
    const supabase = createClient()

    return useQuery({
        queryKey: ["child_class_groups", organization?.id],
        queryFn: async () => {
            if (!organization?.id) return []

            const { data, error } = await getClassGroupsTable(supabase)
                .select("*")
                .eq("organization_id", organization.id)
                .order("name", { ascending: true })

            if (error) {
                console.error("Error fetching child class groups:", error)
                throw error
            }

            return (data || []).map(convertClassGroup)
        },
        enabled: !!organization?.id,
        staleTime: 10 * 1000, // 10 seconds for faster updates
        refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
        refetchOnWindowFocus: true,
    })
}

/**
 * Hook to create a new child class group
 */
export function useCreateChildClassGroup() {
    const queryClient = useQueryClient()
    const { organization } = useOrganization()
    const supabase = createClient()

    return useMutation({
        mutationFn: async (groupData: Omit<ChildClassGroup, "id" | "children_count"> & { leader_id?: string }) => {
            if (!organization?.id) throw new Error("No organization selected")

            const { data, error } = await getClassGroupsTable(supabase)
                .insert({
                    organization_id: organization.id,
                    name: groupData.name,
                    description: groupData.description ?? null,
                    min_age: groupData.min_age ?? null,
                    max_age: groupData.max_age ?? null,
                    leader: groupData.leader ?? null,
                    leader_id: (groupData as any).leader_id ?? null,
                    status: groupData.status || 'Active',
                })
                .select()
                .single()

            if (error) {
                console.error("Error creating child class group:", error)
                throw error
            }

            return convertClassGroup(data)
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["child_class_groups", organization?.id] }),
                queryClient.invalidateQueries({ queryKey: ["children", organization?.id] }),
            ])
            toast.success("Class group created successfully")
        },
        onError: (error: Error) => {
            console.error("Failed to create class group:", error)
            toast.error(error.message || "Failed to create class group")
        },
    })
}

/**
 * Hook to update a child class group
 */
export function useUpdateChildClassGroup() {
    const queryClient = useQueryClient()
    const { organization } = useOrganization()
    const supabase = createClient()

    return useMutation({
        mutationFn: async ({ id, ...updateData }: Partial<ChildClassGroup> & { id: string; leader_id?: string }) => {
            if (!organization?.id) throw new Error("No organization selected")

            const dbUpdateData: Record<string, any> = {}

            if (updateData.name !== undefined) dbUpdateData.name = updateData.name
            if (updateData.description !== undefined) dbUpdateData.description = updateData.description
            if (updateData.min_age !== undefined) dbUpdateData.min_age = updateData.min_age
            if (updateData.max_age !== undefined) dbUpdateData.max_age = updateData.max_age
            if (updateData.leader !== undefined) dbUpdateData.leader = updateData.leader
            if ((updateData as any).leader_id !== undefined) dbUpdateData.leader_id = (updateData as any).leader_id
            if (updateData.status !== undefined) dbUpdateData.status = updateData.status

            const { data, error } = await getClassGroupsTable(supabase)
                .update(dbUpdateData)
                .eq("id", id)
                .eq("organization_id", organization.id)
                .select()
                .single()

            if (error) {
                console.error("Error updating child class group:", error)
                throw error
            }

            return convertClassGroup(data)
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["child_class_groups", organization?.id] }),
                queryClient.invalidateQueries({ queryKey: ["children", organization?.id] }),
            ])
            toast.success("Class group updated successfully")
        },
        onError: (error: Error) => {
            console.error("Failed to update class group:", error)
            toast.error(error.message || "Failed to update class group")
        },
    })
}

/**
 * Hook to delete a child class group
 */
export function useDeleteChildClassGroup() {
    const queryClient = useQueryClient()
    const { organization } = useOrganization()
    const supabase = createClient()

    return useMutation({
        mutationFn: async (groupId: string) => {
            if (!organization?.id) throw new Error("No organization selected")

            const { error } = await getClassGroupsTable(supabase)
                .delete()
                .eq("id", groupId)
                .eq("organization_id", organization.id)

            if (error) {
                console.error("Error deleting child class group:", error)
                throw error
            }
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["child_class_groups", organization?.id] }),
                queryClient.invalidateQueries({ queryKey: ["children", organization?.id] }),
            ])
            toast.success("Class group deleted successfully")
        },
        onError: (error: Error) => {
            console.error("Failed to delete class group:", error)
            toast.error(error.message || "Failed to delete class group")
        },
    })
}

/**
 * Hook to get class group options for select dropdowns
 */
export function useClassGroupOptions() {
    const { data: classGroups = [], isLoading } = useChildClassGroups()

    const options = classGroups
        .filter((group: ChildClassGroup) => group.status === 'Active')
        .map((group: ChildClassGroup) => ({
            value: group.name,
            label: group.name,
        }))

    return { options, isLoading }
}
