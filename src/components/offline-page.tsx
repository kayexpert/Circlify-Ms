"use client"

import { useNetworkStatus } from "@/hooks/use-network-status"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WifiOff, RefreshCw, AlertCircle, Wifi, CheckCircle2 } from "lucide-react"
import { useEffect, useState } from "react"

interface OfflinePageProps {
  onRetry?: () => void
  error?: Error | null
  isNetworkError?: boolean
}

/**
 * Beautiful offline/network error page component
 * Shows when there's no internet connection or network errors
 */
export function OfflinePage({ onRetry, error, isNetworkError = false }: OfflinePageProps) {
  const { isOnline, wasOffline } = useNetworkStatus()
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  // Auto-retry when connection is restored
  useEffect(() => {
    if (wasOffline && isOnline) {
      // Small delay to ensure connection is stable
      const timer = setTimeout(() => {
        if (onRetry) {
          onRetry()
        } else {
          window.location.reload()
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline, onRetry])

  const handleRetry = async () => {
    setIsRetrying(true)
    setRetryCount((prev) => prev + 1)
    
    // Wait a moment before retrying
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    if (onRetry) {
      onRetry()
    } else {
      window.location.reload()
    }
    
    setIsRetrying(false)
  }

  const isOffline = !isOnline || isNetworkError
  const showReconnecting = wasOffline && isOnline

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4 animate-fade-in">
      <div className="w-full max-w-md animate-slide-up">
        <Card className="border-2 shadow-xl">
          <CardHeader className="text-center space-y-4 pb-4">
            <div className="mx-auto mb-4">
              {showReconnecting ? (
                <div className="relative">
                  <Wifi className={`h-20 w-20 text-green-500 mx-auto ${showReconnecting ? 'animate-pulse-scale' : ''}`} />
                  <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                </div>
              ) : isOffline ? (
                <WifiOff className="h-20 w-20 text-destructive mx-auto animate-bounce" />
              ) : (
                <AlertCircle className="h-20 w-20 text-yellow-500 mx-auto" />
              )}
            </div>

            <CardTitle className="text-2xl">
              {showReconnecting
                ? "Connection Restored!"
                : isOffline
                ? "No Internet Connection"
                : "Network Error"}
            </CardTitle>

            <CardDescription className="text-base">
              {showReconnecting ? (
                <span className="text-green-600 dark:text-green-400">
                  We're reconnecting you to the server. Please wait...
                </span>
              ) : isOffline ? (
                <>
                  It looks like you're offline. Please check your internet connection and try again.
                </>
              ) : (
                <>
                  We're having trouble connecting to our servers. This might be a temporary issue.
                </>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {!showReconnecting && (
              <>
                {/* Error details in development */}
                {process.env.NODE_ENV === "development" && error && (
                  <div className="rounded-lg bg-muted p-4 border border-destructive/20">
                    <p className="text-xs font-mono text-muted-foreground break-all">
                      {error.message || "Network request failed"}
                    </p>
                  </div>
                )}

                {/* Troubleshooting tips */}
                <div className="space-y-3 rounded-lg bg-muted/50 p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Try these steps:
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                    <li>Check your Wi-Fi or mobile data connection</li>
                    <li>Make sure you're connected to the internet</li>
                    <li>Try refreshing the page</li>
                    <li>Check if other websites are working</li>
                  </ul>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="w-full"
                    size="lg"
                  >
                    {isRetrying ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                        {retryCount > 0 && ` (${retryCount})`}
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      // Try to go back or to dashboard
                      if (window.history.length > 1) {
                        window.history.back()
                      } else {
                        window.location.href = "/dashboard"
                      }
                    }}
                    className="w-full"
                  >
                    Go Back
                  </Button>
                </div>

                {/* Connection status indicator */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                  <div
                    className={`h-2 w-2 rounded-full animate-pulse ${
                      isOnline ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span>
                    {isOnline ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </>
            )}

            {showReconnecting && (
              <div className="text-center space-y-2 animate-fade-in">
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">Syncing your data...</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

