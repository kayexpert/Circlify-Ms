"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type { Group as DBGroup, GroupInsert, GroupUpdate, Member } from "@/types/database-extension"
import type { Group } from "@/app/(dashboard)/dashboard/members/types"

// Helper to convert database Group to component format
function convertGroup(group: DBGroup, memberCount: number = 0): Group {
  return {
    id: group.id,
    name: group.name,
    description: group.description || "",
    leader: group.leader || "",
    members: memberCount,
    status: group.status,
  }
}

/**
 * Hook to fetch all groups for the current organization
 * OPTIMIZED: Uses database function for efficient member counting
 */
export function useGroups() {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["groups", orgId],
    queryFn: async () => {
      if (!orgId) return []

      // Fetch groups and member counts in parallel using Promise.all
      const [groupsResult, countsResult] = await Promise.all([
        supabase
          .from("groups")
          .select("id, name, description, leader, status")
          .eq("organization_id", orgId)
          .eq("status", "Active")
          .order("name", { ascending: true }),
        // Use optimized database function instead of fetching all members
        (supabase.rpc as any)("get_group_member_counts", { p_organization_id: orgId })
      ])

      if (groupsResult.error) {
        console.error("Error fetching groups:", groupsResult.error)
        throw groupsResult.error
      }

      // Build a map of group name -> member count from the RPC result
      const groupCounts = new Map<string, number>()
      if (countsResult.data) {
        (countsResult.data as Array<{ group_name: string; member_count: number }>).forEach((row) => {
          groupCounts.set(row.group_name, row.member_count)
        })
      }

      return ((groupsResult.data as Pick<DBGroup, "id" | "name" | "description" | "leader" | "status">[]) || [])
        .map((group) => convertGroup(group as DBGroup, groupCounts.get(group.name) || 0))
    },
    enabled: !!orgId,
    staleTime: 60 * 1000, // 1 minute - groups change less often
    gcTime: 30 * 60 * 1000,
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds for groups
    refetchOnWindowFocus: true, // Refetch on window focus
    refetchOnReconnect: true,
  })
}

/**
 * Hook to create a new group
 */
export function useCreateGroup() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (groupData: Omit<Group, "id" | "members">) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { data, error } = await (supabase
        .from("groups") as any)
        .insert({
          organization_id: organization.id,
          name: groupData.name,
          description: groupData.description || null,
          leader: groupData.leader || null,
          status: groupData.status,
        } as GroupInsert)
        .select()
        .single()

      if (error) {
        console.error("Error creating group:", error)
        throw error
      }

      return convertGroup(data, 0)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["members", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["member_statistics", organization?.id] })
      toast.success("Group created successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create group:", error)
      toast.error(error.message || "Failed to create group")
    },
  })
}

/**
 * Hook to update a group
 */
export function useUpdateGroup() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Group> & { id: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      // Get current group data to check for name change
      const { data: currentGroup } = await (supabase
        .from("groups") as any)
        .select("name")
        .eq("id", id)
        .eq("organization_id", organization.id)
        .single()

      const dbUpdateData: Partial<GroupUpdate> = {}

      if (updateData.name) dbUpdateData.name = updateData.name
      if (updateData.description !== undefined) dbUpdateData.description = updateData.description || null
      if (updateData.leader !== undefined) dbUpdateData.leader = updateData.leader || null
      if (updateData.status) dbUpdateData.status = updateData.status

      const { data, error } = await (supabase
        .from("groups") as any)
        .update(dbUpdateData)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating group:", error)
        throw error
      }

      // If name changed, update all members that have this group
      if (currentGroup && updateData.name && currentGroup.name !== updateData.name) {
        const oldName = (currentGroup as DBGroup).name
        const newName = updateData.name

        // Find members with old group name
        const { data: membersToUpdate } = await (supabase
          .from("members") as any)
          .select("id, groups")
          .eq("organization_id", organization.id)
          .contains("groups", [oldName])

        if (membersToUpdate && membersToUpdate.length > 0) {
          const updates = (membersToUpdate as Pick<Member, "id" | "groups">[]).map((member) => {
            const updatedGroups = (member.groups || [])
              .map((g: string) => g === oldName ? newName : g)

            return (supabase
              .from("members") as any)
              .update({ groups: updatedGroups })
              .eq("id", member.id)
          })

          await Promise.all(updates)
        }
      }

      // Get member count
      const { data: members } = await (supabase
        .from("members") as any)
        .select("groups")
        .eq("organization_id", organization.id)
        .contains("groups", [(data as DBGroup).name])

      const memberCount = members?.length || 0

      return convertGroup(data, memberCount)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["members", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["member_statistics", organization?.id] })
      toast.success("Group updated successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to update group:", error)
      toast.error(error.message || "Failed to update group")
    },
  })
}

/**
 * Hook to delete a group
 */
export function useDeleteGroup() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      // Get group name before deleting
      const { data: group } = await (supabase
        .from("groups") as any)
        .select("name")
        .eq("id", groupId)
        .eq("organization_id", organization.id)
        .single()

      const { error } = await (supabase
        .from("groups") as any)
        .delete()
        .eq("id", groupId)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting group:", error)
        throw error
      }

      // Remove group from all members
      if (group) {
        const grp = group as Pick<DBGroup, "name">
        const { data: members } = await (supabase
          .from("members") as any)
          .select("id, groups")
          .eq("organization_id", organization.id)
          .contains("groups", [grp.name])

        if (members && members.length > 0) {
          const updates = (members as Pick<Member, "id" | "groups">[]).map((member) => {
            const updatedGroups = (member.groups || []).filter((g: string) => g !== grp.name)
            return (supabase
              .from("members") as any)
              .update({ groups: updatedGroups })
              .eq("id", member.id)
          })

          await Promise.all(updates)
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["members", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["member_statistics", organization?.id] })
      toast.success("Group deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete group:", error)
      toast.error(error.message || "Failed to delete group")
    },
  })
}
