"use client"

import { useEffect, useState } from "react"

interface NetworkStatus {
  isOnline: boolean
  wasOffline: boolean
  isSlowConnection: boolean
}

/**
 * Hook to detect network status and connection quality
 */
export function useNetworkStatus(): NetworkStatus {
  // Initialize with actual navigator.onLine value if available, otherwise default to true
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== "undefined") {
      return navigator.onLine
    }
    return true
  })
  const [wasOffline, setWasOffline] = useState(() => {
    if (typeof window !== "undefined") {
      return !navigator.onLine
    }
    return false
  })
  const [isSlowConnection, setIsSlowConnection] = useState(false)

  useEffect(() => {
    // Set initial state (double-check on mount)
    const initialOnline = navigator.onLine
    setIsOnline(initialOnline)
    setWasOffline(!initialOnline)

    // Detect connection speed
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection

    if (connection) {
      const updateConnectionStatus = () => {
        // Check if connection is slow (2G or slow 3G)
        const effectiveType = connection.effectiveType
        const downlink = connection.downlink
        
        setIsSlowConnection(
          effectiveType === "slow-2g" || 
          effectiveType === "2g" ||
          (effectiveType === "3g" && downlink < 1.5)
        )
      }

      updateConnectionStatus()
      connection.addEventListener("change", updateConnectionStatus)

      return () => {
        connection.removeEventListener("change", updateConnectionStatus)
      }
    }

    // Handle online/offline events
    const handleOnline = () => {
      // Double-check with navigator.onLine
      const actuallyOnline = navigator.onLine
      setIsOnline(actuallyOnline)
      // Keep wasOffline true briefly to trigger reconnection notification
      // Then reset it after a short delay
      setTimeout(() => {
        setWasOffline(false)
      }, 100)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return { isOnline, wasOffline, isSlowConnection }
}

