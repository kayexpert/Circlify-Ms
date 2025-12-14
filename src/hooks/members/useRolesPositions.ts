"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type { RolePosition as DBRolePosition, RolePositionInsert, RolePositionUpdate } from "@/types/database-extension"
import type { RolePosition } from "@/app/(dashboard)/dashboard/members/types"

// Helper to convert database RolePosition to component format
function convertRolePosition(role: DBRolePosition): RolePosition {
  return {
    id: role.id,
    name: role.name,
    description: role.description || "",
    status: role.status,
  }
}

/**
 * Hook to fetch all roles/positions for the current organization
 */
export function useRolesPositions() {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["roles-positions", orgId],
    queryFn: async () => {
      if (!orgId) return []

      const { data, error } = await (supabase
        .from("roles_positions") as any)
        .select("id, name, description, status")
        .eq("organization_id", orgId)
        .order("name", { ascending: true })

      if (error) {
        console.error("Error fetching roles/positions:", error)
        throw error
      }

      return ((data as Pick<DBRolePosition, "id" | "name" | "description" | "status">[]) || [])
        .map((role) => convertRolePosition(role as DBRolePosition))
    },
    enabled: !!orgId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

/**
 * Hook to create a new role/position
 */
export function useCreateRolePosition() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (roleData: Omit<RolePosition, "id">) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { data, error } = await (supabase
        .from("roles_positions") as any)
        .insert({
          organization_id: organization.id,
          name: roleData.name,
          description: roleData.description || null,
          status: roleData.status,
        } as RolePositionInsert)
        .select()
        .single()

      if (error) {
        console.error("Error creating role/position:", error)
        throw error
      }

      return convertRolePosition(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles-positions", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["members", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["member_statistics", organization?.id] })
      toast.success("Role/Position created successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create role/position:", error)
      toast.error(error.message || "Failed to create role/position")
    },
  })
}

/**
 * Hook to update a role/position
 */
export function useUpdateRolePosition() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<RolePosition> & { id: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const dbUpdateData: Partial<RolePositionUpdate> = {}

      if (updateData.name) dbUpdateData.name = updateData.name
      if (updateData.description !== undefined) dbUpdateData.description = updateData.description || null
      if (updateData.status) dbUpdateData.status = updateData.status

      const { data, error } = await (supabase
        .from("roles_positions") as any)
        .update(dbUpdateData)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating role/position:", error)
        throw error
      }

      return convertRolePosition(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles-positions", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["members", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["member_statistics", organization?.id] })
      toast.success("Role/Position updated successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to update role/position:", error)
      toast.error(error.message || "Failed to update role/position")
    },
  })
}

/**
 * Hook to delete a role/position
 */
export function useDeleteRolePosition() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (roleId: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      // Get role name before deleting
      const { data: role } = await (supabase
        .from("roles_positions") as any)
        .select("name")
        .eq("id", roleId)
        .eq("organization_id", organization.id)
        .single()

      const { error } = await (supabase
        .from("roles_positions") as any)
        .delete()
        .eq("id", roleId)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting role/position:", error)
        throw error
      }

      // Remove role from all members
      if (role) {
        const roleName = (role as Pick<DBRolePosition, "name">).name
        const { data: members } = await (supabase
          .from("members") as any)
          .select("id, roles")
          .eq("organization_id", organization.id)
          .contains("roles", [roleName])

        if (members && members.length > 0) {
          const updates = members.map((member: any) => {
            const updatedRoles = (member.roles || []).filter((r: string) => r !== roleName)
            return (supabase
              .from("members") as any)
              .update({ roles: updatedRoles })
              .eq("id", member.id)
          })

          await Promise.all(updates)
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles-positions", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["members", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["member_statistics", organization?.id] })
      toast.success("Role/Position deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete role/position:", error)
      toast.error(error.message || "Failed to delete role/position")
    },
  })
}

