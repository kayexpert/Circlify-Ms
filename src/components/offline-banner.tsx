"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

/**
 * Component that shows network status notifications via toaster
 * Shows toast notifications when user goes offline or comes back online
 */
export function OfflineBanner() {
  const [isMounted, setIsMounted] = useState(false)
  const currentStatusRef = useRef<boolean | null>(null)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Ensure component is mounted and Toaster is ready
  useEffect(() => {
    const mountTimeout = setTimeout(() => {
      setIsMounted(true)
      // Initialize with current status
      currentStatusRef.current = navigator.onLine
    }, 1000)

    return () => {
      clearTimeout(mountTimeout)
    }
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const showOfflineNotification = () => {
      // Only show if we're actually offline and haven't shown it yet
      if (!navigator.onLine && currentStatusRef.current !== false) {
        toast.error("You're offline. Please check your internet connection.", {
          duration: Infinity,
          id: "offline-notification",
        })
        currentStatusRef.current = false
        console.log("[OfflineBanner] Showing offline notification")
      }
    }

    const showOnlineNotification = () => {
      // Only show if we're actually online and were previously offline
      if (navigator.onLine && currentStatusRef.current === false) {
        toast.dismiss("offline-notification")
        toast.success("Connection restored! Syncing your data...", {
          duration: 3000,
          id: "online-notification",
        })
        currentStatusRef.current = true
        console.log("[OfflineBanner] Showing online notification")
      }
    }

    const handleOffline = () => {
      console.log("[OfflineBanner] Browser offline event fired")
      // Clear any debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      // Show immediately
      showOfflineNotification()
    }

    const handleOnline = () => {
      console.log("[OfflineBanner] Browser online event fired")
      // Clear any debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      // Debounce online notification to avoid false positives
      debounceTimeoutRef.current = setTimeout(() => {
        if (navigator.onLine) {
          showOnlineNotification()
        }
      }, 500)
    }

    // Periodic check for network status (every 2 seconds)
    const checkNetworkStatus = () => {
      const isOnline = navigator.onLine
      const previousStatus = currentStatusRef.current

      // Only act on actual status changes
      if (previousStatus !== null && previousStatus !== isOnline) {
        if (!isOnline) {
          showOfflineNotification()
        } else {
          // For online, use a small delay to verify it's stable
          if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current)
          }
          debounceTimeoutRef.current = setTimeout(() => {
            if (navigator.onLine) {
              showOnlineNotification()
            }
          }, 500)
        }
      } else if (previousStatus === null) {
        // First check - just set the status
        currentStatusRef.current = isOnline
      }
    }

    // Initial check
    checkNetworkStatus()

    // Set up periodic checking
    checkIntervalRef.current = setInterval(checkNetworkStatus, 2000)

    // Add event listeners for immediate detection
    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
      toast.dismiss("offline-notification")
    }
  }, [isMounted])

  return null // This component doesn't render anything, it just shows toasts
}

