/**
 * Real-Time Subscription Hook
 * Integrates Supabase real-time subscriptions with React Query
 * Automatically invalidates queries when data changes
 */

"use client"

import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "./use-organization"
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js"

// ============================================
// Types
// ============================================

type TableName =
    | "members"
    | "visitors"
    | "attendance_records"
    | "messages"
    | "message_templates"
    | "events"
    | "groups"
    | "departments"
    | "finance_income_records"
    | "finance_expenditure_records"
    | "children"
    | "child_attendance"
    | "projects"
    | "project_income"
    | "project_expenditure"
    | "project_categories"
    | "assets"
    | "asset_categories"
    | "asset_disposals"

interface UseRealtimeSubscriptionOptions {
    /** Table to subscribe to */
    table: TableName
    /** Query keys to invalidate when data changes */
    queryKeys: string[][]
    /** Optional: Only subscribe when condition is true */
    enabled?: boolean
    /** Optional: Additional filter (e.g., specific status) */
    filter?: {
        column: string
        value: string
    }
    /** Optional: Callback when data changes */
    onDataChange?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
}

// ============================================
// Hook Implementation
// ============================================

/**
 * Subscribe to real-time changes on a Supabase table
 * Automatically invalidates React Query cache when data changes
 * 
 * @example
 * ```tsx
 * // In a component
 * useRealtimeSubscription({
 *   table: "members",
 *   queryKeys: [["members"], ["member_statistics"]],
 * })
 * ```
 */
export function useRealtimeSubscription(options: UseRealtimeSubscriptionOptions) {
    const { table, queryKeys, enabled = true, filter, onDataChange } = options
    const { organization } = useOrganization()
    const queryClient = useQueryClient()
    const supabase = createClient()
    const channelRef = useRef<RealtimeChannel | null>(null)

    useEffect(() => {
        // Don't subscribe if disabled or no organization
        if (!enabled || !organization?.id) {
            return
        }

        // Clean up previous subscription
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current)
        }

        // Create unique channel name
        const channelName = `realtime:${table}:${organization.id}${filter ? `:${filter.column}=${filter.value}` : ""}`

        // Build filter string for organization_id
        let filterString = `organization_id=eq.${organization.id}`
        if (filter) {
            filterString += `,${filter.column}=eq.${filter.value}`
        }

        // Create subscription channel
        const channel = supabase
            .channel(channelName)
            .on(
                "postgres_changes",
                {
                    event: "*", // Listen to INSERT, UPDATE, DELETE
                    schema: "public",
                    table: table,
                    filter: filterString,
                },
                (payload) => {
                    if (process.env.NODE_ENV === "development") {
                        console.log(`[Realtime] ${table} change:`, payload.eventType)
                    }

                    // Invalidate specified query keys
                    queryKeys.forEach((key) => {
                        // Append organization ID to query key if not already included
                        const fullKey = key.includes(organization.id) ? key : [...key, organization.id]
                        queryClient.invalidateQueries({ queryKey: fullKey })
                    })

                    // Call optional callback
                    onDataChange?.(payload)
                }
            )
            .subscribe((status) => {
                if (process.env.NODE_ENV === "development") {
                    console.log(`[Realtime] ${table} subscription status:`, status)
                }
            })

        channelRef.current = channel

        // Cleanup on unmount or when dependencies change
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
                channelRef.current = null
            }
        }
    }, [enabled, organization?.id, table, JSON.stringify(queryKeys), filter?.column, filter?.value])

    return {
        isSubscribed: !!channelRef.current,
    }
}

// ============================================
// Convenience Hooks for Common Tables
// ============================================

/**
 * Subscribe to members table changes
 */
export function useMembersRealtime(enabled = true) {
    return useRealtimeSubscription({
        table: "members",
        queryKeys: [
            ["members"],
            ["members", "paginated"],
            ["member_statistics"],
            ["upcoming_birthdays"],
            ["member_growth"],
            ["recent_members"],
        ],
        enabled,
    })
}

/**
 * Subscribe to attendance records changes
 */
export function useAttendanceRealtime(enabled = true) {
    return useRealtimeSubscription({
        table: "attendance_records",
        queryKeys: [
            ["attendance_records"],
            ["attendance_summary"],
            ["member_attendance"],
        ],
        enabled,
    })
}

/**
 * Subscribe to messages table changes
 */
export function useMessagesRealtime(enabled = true) {
    return useRealtimeSubscription({
        table: "messages",
        queryKeys: [
            ["messages"],
            ["message_templates"],
            ["scheduled_messages"],
        ],
        enabled,
    })
}

/**
 * Subscribe to events table changes
 */
export function useEventsRealtime(enabled = true) {
    return useRealtimeSubscription({
        table: "events",
        queryKeys: [
            ["events"],
            ["upcoming_events"],
        ],
        enabled,
    })
}

/**
 * Subscribe to children table changes
 */
export function useChildrenRealtime(enabled = true) {
    return useRealtimeSubscription({
        table: "children",
        queryKeys: [
            ["children"],
            ["children", "paginated"],
            ["child_statistics"],
        ],
        enabled,
    })
}

/**
 * Subscribe to finance tables changes
 */
export function useFinanceRealtime(enabled = true) {
    const income = useRealtimeSubscription({
        table: "finance_income_records",
        queryKeys: [
            ["finance_income_records"],
            ["finance_summary"],
            ["finance_dashboard"],
        ],
        enabled,
    })

    const expenses = useRealtimeSubscription({
        table: "finance_expenditure_records",
        queryKeys: [
            ["finance_expenditure_records"],
            ["finance_summary"],
            ["finance_dashboard"],
        ],
        enabled,
    })

    return {
        isSubscribed: income.isSubscribed && expenses.isSubscribed,
    }
}

/**
 * Subscribe to projects table changes
 */
export function useProjectsRealtime(enabled = true) {
    const projects = useRealtimeSubscription({
        table: "projects",
        queryKeys: [
            ["projects"],
            ["project_totals"],
        ],
        enabled,
    })

    const income = useRealtimeSubscription({
        table: "project_income",
        queryKeys: [
            ["project_income"],
            ["project_totals"],
        ],
        enabled,
    })

    const expenditure = useRealtimeSubscription({
        table: "project_expenditure",
        queryKeys: [
            ["project_expenditure"],
            ["project_totals"],
        ],
        enabled,
    })

    return {
        isSubscribed: projects.isSubscribed && income.isSubscribed && expenditure.isSubscribed,
    }
}

/**
 * Subscribe to assets table changes
 */
export function useAssetsRealtime(enabled = true) {
    const assets = useRealtimeSubscription({
        table: "assets",
        queryKeys: [
            ["assets"],
            ["asset_statistics"],
        ],
        enabled,
    })

    const categories = useRealtimeSubscription({
        table: "asset_categories",
        queryKeys: [
            ["asset_categories"],
        ],
        enabled,
    })

    const disposals = useRealtimeSubscription({
        table: "asset_disposals",
        queryKeys: [
            ["asset_disposals"],
            ["assets"],
        ],
        enabled,
    })

    return {
        isSubscribed: assets.isSubscribed && categories.isSubscribed && disposals.isSubscribed,
    }
}
