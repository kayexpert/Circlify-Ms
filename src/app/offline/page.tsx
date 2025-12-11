"use client"

import { OfflinePage } from "@/components/offline-page"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function OfflineRoute() {
  const router = useRouter()
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      // Redirect to dashboard when connection is restored
      setTimeout(() => {
        router.push("/dashboard")
        router.refresh()
      }, 1500)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [router])

  return (
    <OfflinePage 
      onRetry={() => {
        if (isOnline) {
          router.push("/dashboard")
          router.refresh()
        } else {
          window.location.reload()
        }
      }}
      isNetworkError={!isOnline}
    />
  )
}

