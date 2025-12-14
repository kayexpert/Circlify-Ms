"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type { Department as DBDepartment, DepartmentInsert, DepartmentUpdate, Member } from "@/types/database-extension"
import type { Department } from "@/app/(dashboard)/dashboard/members/types"

// Helper to convert database Department to component format
function convertDepartment(department: DBDepartment, memberCount: number = 0): Department {
  return {
    id: department.id,
    name: department.name,
    description: department.description || "",
    leader: department.leader || "",
    members: memberCount,
    status: department.status,
  }
}

/**
 * Hook to fetch all departments for the current organization
 * OPTIMIZED: Uses database function for efficient member counting
 */
export function useDepartments() {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["departments", orgId],
    queryFn: async () => {
      if (!orgId) return []

      // Fetch departments and member counts in parallel using Promise.all
      const [departmentsResult, countsResult] = await Promise.all([
        supabase
          .from("departments")
          .select("id, name, description, leader, status")
          .eq("organization_id", orgId)
          .eq("status", "Active")
          .order("name", { ascending: true }),
        // Use optimized database function instead of fetching all members
        (supabase.rpc as any)("get_department_member_counts", { p_organization_id: orgId })
      ])

      if (departmentsResult.error) {
        console.error("Error fetching departments:", departmentsResult.error)
        throw departmentsResult.error
      }

      // Build a map of department name -> member count from the RPC result
      const departmentCounts = new Map<string, number>()
      if (countsResult.data) {
        (countsResult.data as Array<{ department_name: string; member_count: number }>).forEach((row) => {
          departmentCounts.set(row.department_name, row.member_count)
        })
      }

      return ((departmentsResult.data as Pick<DBDepartment, "id" | "name" | "description" | "leader" | "status">[]) || [])
        .map((dept) => convertDepartment(dept as DBDepartment, departmentCounts.get(dept.name) || 0))
    },
    enabled: !!orgId,
    staleTime: 15 * 60 * 1000, // 15 minutes - departments don't change often
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false, // Departments rarely change
    refetchOnReconnect: true,
  })
}

/**
 * Hook to create a new department
 */
export function useCreateDepartment() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (departmentData: Omit<Department, "id" | "members">) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { data, error } = await (supabase
        .from("departments") as any)
        .insert({
          organization_id: organization.id,
          name: departmentData.name,
          description: departmentData.description || null,
          leader: departmentData.leader || null,
          status: departmentData.status,
        } as DepartmentInsert)
        .select()
        .single()

      if (error) {
        console.error("Error creating department:", error)
        throw error
      }

      return convertDepartment(data, 0)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["members", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["member_statistics", organization?.id] })
      toast.success("Department created successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create department:", error)
      toast.error(error.message || "Failed to create department")
    },
  })
}

/**
 * Hook to update a department
 */
export function useUpdateDepartment() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Department> & { id: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const dbUpdateData: Partial<DepartmentUpdate> = {}

      if (updateData.name) dbUpdateData.name = updateData.name
      if (updateData.description !== undefined) dbUpdateData.description = updateData.description || null
      if (updateData.leader !== undefined) dbUpdateData.leader = updateData.leader || null
      if (updateData.status) dbUpdateData.status = updateData.status

      const { data, error } = await (supabase
        .from("departments") as any)
        .update(dbUpdateData)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating department:", error)
        throw error
      }

      // Get member count
      const { data: members } = await (supabase
        .from("members") as any)
        .select("departments")
        .eq("organization_id", organization.id)
        .contains("departments", [(data as DBDepartment).name])

      const memberCount = members?.length || 0

      return convertDepartment(data, memberCount)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["members", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["member_statistics", organization?.id] })
      toast.success("Department updated successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to update department:", error)
      toast.error(error.message || "Failed to update department")
    },
  })
}

/**
 * Hook to delete a department
 */
export function useDeleteDepartment() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (departmentId: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      // Get department name before deleting
      const { data: department } = await (supabase
        .from("departments") as any)
        .select("name")
        .eq("id", departmentId)
        .eq("organization_id", organization.id)
        .single()

      const { error } = await (supabase
        .from("departments") as any)
        .delete()
        .eq("id", departmentId)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting department:", error)
        throw error
      }

      // Remove department from all members
      if (department) {
        const dept = department as Pick<DBDepartment, "name">
        const { data: members } = await (supabase
          .from("members") as any)
          .select("id, departments")
          .eq("organization_id", organization.id)
          .contains("departments", [dept.name])

        if (members && members.length > 0) {
          const updates = (members as Pick<Member, "id" | "departments">[]).map((member) => {
            const updatedDepartments = (member.departments || []).filter((d: string) => d !== dept.name)
            return (supabase
              .from("members") as any)
              .update({ departments: updatedDepartments })
              .eq("id", member.id)
          })

          await Promise.all(updates)
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["members", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["member_statistics", organization?.id] })
      toast.success("Department deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete department:", error)
      toast.error(error.message || "Failed to delete department")
    },
  })
}
