"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"

export interface MemberStatistics {
  totalMembers: number
  activeMembers: number
  inactiveMembers: number
  maleMembers: number
  femaleMembers: number
  totalGroups: number
  totalDepartments: number
  birthdaysThisMonth: number
  birthdaysThisWeek: number
  birthdaysToday: number
}

export interface UpcomingBirthday {
  id: string
  first_name: string
  last_name: string
  photo: string | null
  date_of_birth: string
  age: number
  days_until: number
}

export interface RecentMember {
  id: string
  first_name: string
  last_name: string
  join_date: string
}

/**
 * Hook to fetch member statistics from the database
 * OPTIMIZED: Uses server-side aggregation instead of client-side calculations
 */
export function useMemberStatistics() {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["member_statistics", orgId],
    queryFn: async (): Promise<MemberStatistics> => {
      if (!orgId) {
        return {
          totalMembers: 0,
          activeMembers: 0,
          inactiveMembers: 0,
          maleMembers: 0,
          femaleMembers: 0,
          totalGroups: 0,
          totalDepartments: 0,
          birthdaysThisMonth: 0,
          birthdaysThisWeek: 0,
          birthdaysToday: 0,
        }
      }

      const { data, error } = await (supabase.rpc as any)("get_member_statistics", {
        p_organization_id: orgId,
      })

      if (error) {
        console.error("Error fetching member statistics:", error)
        throw error
      }

      const stats = data?.[0] || {}

      return {
        totalMembers: Number(stats.total_members) || 0,
        activeMembers: Number(stats.active_members) || 0,
        inactiveMembers: Number(stats.inactive_members) || 0,
        maleMembers: Number(stats.male_members) || 0,
        femaleMembers: Number(stats.female_members) || 0,
        totalGroups: Number(stats.total_groups) || 0,
        totalDepartments: Number(stats.total_departments) || 0,
        birthdaysThisMonth: Number(stats.birthdays_this_month) || 0,
        birthdaysThisWeek: Number(stats.birthdays_this_week) || 0,
        birthdaysToday: Number(stats.birthdays_today) || 0,
      }
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

/**
 * Hook to fetch upcoming birthdays from the database
 * OPTIMIZED: Uses server-side calculation instead of client-side iteration
 */
export function useUpcomingBirthdays(daysAhead: number = 365) {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["upcoming_birthdays", orgId, daysAhead],
    queryFn: async (): Promise<UpcomingBirthday[]> => {
      if (!orgId) return []

      const { data, error } = await (supabase.rpc as any)("get_upcoming_birthdays", {
        p_organization_id: orgId,
        p_days_ahead: daysAhead,
      })

      if (error) {
        console.error("Error fetching upcoming birthdays:", error)
        throw error
      }

      return (data || []) as UpcomingBirthday[]
    },
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000, // 10 minutes - birthdays don't change frequently
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to fetch recent new members from the database
 * OPTIMIZED: Uses server-side sorting and limiting
 */
export function useRecentMembers(limit: number = 10) {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["recent_members", orgId, limit],
    queryFn: async (): Promise<RecentMember[]> => {
      if (!orgId) return []

      const { data, error } = await (supabase.rpc as any)("get_recent_members", {
        p_organization_id: orgId,
        p_limit: limit,
      })

      if (error) {
        console.error("Error fetching recent members:", error)
        throw error
      }

      return (data || []) as RecentMember[]
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

