"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Optimized for multi-user scenarios
            staleTime: 10 * 60 * 1000, // 10 minutes - increased for better caching
            gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
            refetchOnWindowFocus: false, // Don't refetch on window focus (reduces load)
            refetchOnReconnect: true, // Refetch on reconnect (important for mobile)
            refetchOnMount: false, // Don't refetch if data exists in cache
            retry: 1,
            // Enable structural sharing to prevent unnecessary re-renders
            structuralSharing: true,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
