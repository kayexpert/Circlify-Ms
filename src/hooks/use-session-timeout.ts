/**
 * Session Timeout Hook
 * Provides session timeout and refresh functionality to prevent
 * unauthorized access from dormant sessions
 */

"use client"

import { useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

// Session timeout configuration
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes of inactivity
const SESSION_WARNING_MS = 5 * 60 * 1000 // Show warning 5 minutes before timeout
const SESSION_CHECK_INTERVAL_MS = 60 * 1000 // Check every minute
const TOKEN_REFRESH_INTERVAL_MS = 10 * 60 * 1000 // Refresh token every 10 minutes

interface UseSessionTimeoutOptions {
    /**
     * Time in milliseconds before session times out due to inactivity
     * @default 30 minutes
     */
    timeoutMs?: number

    /**
     * Time in milliseconds before timeout to show warning
     * @default 5 minutes
     */
    warningMs?: number

    /**
     * Callback when session is about to expire
     */
    onWarning?: (secondsRemaining: number) => void

    /**
     * Callback when session expires
     */
    onExpire?: () => void

    /**
     * Callback when session is refreshed
     */
    onRefresh?: () => void

    /**
     * Whether to automatically sign out on expiry
     * @default true
     */
    autoSignOut?: boolean
}

/**
 * Hook to manage session timeout and token refresh
 * 
 * Usage:
 * ```tsx
 * useSessionTimeout({
 *   onWarning: (seconds) => toast.warning(`Session expires in ${seconds} seconds`),
 *   onExpire: () => toast.error('Session expired'),
 * })
 * ```
 */
export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
    const {
        timeoutMs = SESSION_TIMEOUT_MS,
        warningMs = SESSION_WARNING_MS,
        onWarning,
        onExpire,
        onRefresh,
        autoSignOut = true,
    } = options

    const router = useRouter()
    const supabase = createClient()
    const lastActivityRef = useRef<number>(Date.now())
    const warningShownRef = useRef<boolean>(false)
    const timeoutIdRef = useRef<NodeJS.Timeout | null>(null)
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Update last activity time
    const updateActivity = useCallback(() => {
        lastActivityRef.current = Date.now()
        warningShownRef.current = false
    }, [])

    // Refresh the session token
    const refreshSession = useCallback(async () => {
        try {
            const { data, error } = await supabase.auth.refreshSession()
            if (error) {
                console.error("Session refresh failed:", error)
                return false
            }
            if (data.session) {
                onRefresh?.()
                return true
            }
            return false
        } catch (error) {
            console.error("Session refresh error:", error)
            return false
        }
    }, [supabase, onRefresh])

    // Handle session expiry
    const handleExpiry = useCallback(async () => {
        onExpire?.()

        if (autoSignOut) {
            await supabase.auth.signOut()
            router.push("/signin?reason=session_expired")
        }
    }, [supabase, router, autoSignOut, onExpire])

    // Check session status
    const checkSession = useCallback(() => {
        const now = Date.now()
        const timeSinceActivity = now - lastActivityRef.current
        const timeUntilExpiry = timeoutMs - timeSinceActivity

        // Check if expired
        if (timeSinceActivity >= timeoutMs) {
            handleExpiry()
            return
        }

        // Check if warning should be shown
        if (timeUntilExpiry <= warningMs && !warningShownRef.current) {
            warningShownRef.current = true
            const secondsRemaining = Math.ceil(timeUntilExpiry / 1000)
            onWarning?.(secondsRemaining)
        }
    }, [timeoutMs, warningMs, handleExpiry, onWarning])

    // Extend session (call this when user clicks "Stay logged in")
    const extendSession = useCallback(async () => {
        updateActivity()
        await refreshSession()
    }, [updateActivity, refreshSession])

    // Set up event listeners for user activity
    useEffect(() => {
        const activityEvents = [
            "mousedown",
            "mousemove",
            "keydown",
            "scroll",
            "touchstart",
            "click",
        ]

        // Throttle activity updates
        let throttleTimeout: NodeJS.Timeout | null = null
        const throttledUpdate = () => {
            if (throttleTimeout) return
            throttleTimeout = setTimeout(() => {
                updateActivity()
                throttleTimeout = null
            }, 1000)
        }

        // Add event listeners
        activityEvents.forEach((event) => {
            window.addEventListener(event, throttledUpdate, { passive: true })
        })

        // Set up session check interval
        timeoutIdRef.current = setInterval(checkSession, SESSION_CHECK_INTERVAL_MS)

        // Set up token refresh interval
        refreshIntervalRef.current = setInterval(
            refreshSession,
            TOKEN_REFRESH_INTERVAL_MS
        )

        // Cleanup
        return () => {
            activityEvents.forEach((event) => {
                window.removeEventListener(event, throttledUpdate)
            })

            if (timeoutIdRef.current) {
                clearInterval(timeoutIdRef.current)
            }

            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current)
            }

            if (throttleTimeout) {
                clearTimeout(throttleTimeout)
            }
        }
    }, [updateActivity, checkSession, refreshSession])

    return {
        /** Manually update last activity time */
        updateActivity,
        /** Manually refresh session and update activity */
        extendSession,
        /** Manually refresh session token */
        refreshSession,
        /** Get seconds until session expires */
        getTimeRemaining: () => {
            const elapsed = Date.now() - lastActivityRef.current
            return Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000))
        },
    }
}

/**
 * Session timeout warning component
 * Shows a modal when session is about to expire
 */
export { useSessionTimeout as default }
