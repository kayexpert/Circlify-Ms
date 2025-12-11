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

export interface MemberGrowthData {
  period: string
  members: number
  active: number
}

/**
 * Hook to fetch member growth data by month
 * OPTIMIZED: Only fetches join_date and membership_status for performance
 */
export function useMemberGrowthData(timeFilter: "all" | "month" | "quarter" | "year" = "all") {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["member_growth", orgId, timeFilter],
    queryFn: async (): Promise<MemberGrowthData[]> => {
      if (!orgId) return []

      // Fetch only join_date and membership_status for performance
      // Note: We only include members with join_date for growth tracking
      const { data: members, error } = await supabase
        .from("members")
        .select("join_date, membership_status")
        .eq("organization_id", orgId)
        .not("join_date", "is", null)
        .order("join_date", { ascending: true })
        
      // Debug: Log member data for troubleshooting
      if (process.env.NODE_ENV === 'development') {
        console.log('Member growth data - Total members with join_date:', members?.length)
        console.log('Member growth data - Sample:', members?.slice(0, 5))
      }

      if (error) {
        console.error("Error fetching member growth data:", error)
        throw error
      }

      if (!members || members.length === 0) return []

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      let periods: Array<{ start: Date; end: Date; label: string }> = []

      // Determine periods based on time filter
      if (timeFilter === "all") {
        // Show all 12 months of the current year
        for (let i = 0; i < 12; i++) {
          const monthDate = new Date(now.getFullYear(), i, 1)
          // Last day of the month
          const monthEnd = new Date(now.getFullYear(), i + 1, 0, 23, 59, 59, 999)
          const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' })
          periods.push({ start: monthDate, end: monthEnd, label: monthName })
        }
      } else if (timeFilter === "year") {
        // Show monthly for current year
        for (let i = 0; i < 12; i++) {
          const monthDate = new Date(now.getFullYear(), i, 1)
          const monthEnd = new Date(now.getFullYear(), i + 1, 0, 23, 59, 59, 999)
          const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' })
          periods.push({ start: monthDate, end: monthEnd, label: monthName })
        }
      } else if (timeFilter === "quarter") {
        // Show monthly for current quarter
        const quarter = Math.floor(now.getMonth() / 3)
        for (let i = 0; i < 3; i++) {
          const monthIndex = quarter * 3 + i
          const monthDate = new Date(now.getFullYear(), monthIndex, 1)
          const monthEnd = new Date(now.getFullYear(), monthIndex + 1, 0, 23, 59, 59, 999)
          const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' })
          periods.push({ start: monthDate, end: monthEnd, label: monthName })
        }
      } else if (timeFilter === "month") {
        // Show daily for current month
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        for (let i = 1; i <= daysInMonth; i++) {
          const dayDate = new Date(now.getFullYear(), now.getMonth(), i, 0, 0, 0, 0)
          const dayEnd = new Date(now.getFullYear(), now.getMonth(), i, 23, 59, 59, 999)
          periods.push({ start: dayDate, end: dayEnd, label: i.toString() })
        }
      }

      // Helper function to parse join_date safely
      const parseJoinDate = (joinDate: any): Date | null => {
        if (!joinDate) return null
        
        try {
          // If it's already a Date object
          if (joinDate instanceof Date) {
            return joinDate
          }
          
          // If it's a string, parse it
          if (typeof joinDate === 'string') {
            // Handle YYYY-MM-DD format
            if (joinDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const [year, month, day] = joinDate.split('-').map(Number)
              if (isNaN(year) || isNaN(month) || isNaN(day)) return null
              return new Date(year, month - 1, day) // month is 0-indexed
            }
            
            // Try parsing as ISO string
            const parsed = new Date(joinDate)
            if (!isNaN(parsed.getTime())) {
              return parsed
            }
          }
          
          return null
        } catch (error) {
          console.error('Error parsing join_date:', joinDate, error)
          return null
        }
      }

      // Calculate cumulative counts for each period
      // This shows how many members existed at the END of each period
      const result = periods.map((period) => {
        // Normalize period end to end of day for comparison
        const periodEndDate = new Date(period.end.getFullYear(), period.end.getMonth(), period.end.getDate(), 23, 59, 59, 999)
        
        const membersByPeriod = members.filter((m: any) => {
          const joinDate = parseJoinDate(m.join_date)
          if (!joinDate) return false
          
          // Include members who joined on or before the end of this period
          // Compare dates at start of day to avoid timezone issues
          const joinDateNormalized = new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate())
          const periodEndNormalized = new Date(periodEndDate.getFullYear(), periodEndDate.getMonth(), periodEndDate.getDate())
          
          return joinDateNormalized <= periodEndNormalized
        })

        const activeByPeriod = membersByPeriod.filter((m: any) => m.membership_status === "active")

        return {
          period: period.label,
          members: membersByPeriod.length,
          active: activeByPeriod.length,
        }
      })
      
      // Debug: Log result for troubleshooting (only in development)
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('[Member Growth] Total members with join_date:', members.length)
        console.log('[Member Growth] Periods:', result.length)
        console.log('[Member Growth] Final period data:', result[result.length - 1])
        console.log('[Member Growth] All periods:', result)
      }
      
      return result
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

