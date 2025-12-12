"use client"

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react"
import { usePathname } from "next/navigation"

interface PageLoadingContextType {
  isPageLoading: boolean
  setPageLoading: (loading: boolean) => void
}

const PageLoadingContext = createContext<PageLoadingContextType | undefined>(undefined)

export function PageLoadingProvider({ children }: { children: React.ReactNode }) {
  // Start as false - let pages set it to true if they need to load
  // This prevents infinite loading if page component doesn't mount
  const [isPageLoading, setIsPageLoading] = useState(false)
  const pathname = usePathname()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const prevPathnameRef = useRef(pathname)

  // Memoize setPageLoading to prevent it from changing on every render
  const setPageLoading = useCallback((loading: boolean) => {
    setIsPageLoading(prev => {
      // Only update if value actually changed
      if (prev === loading) return prev
      if (process.env.NODE_ENV === 'development') {
        console.log('[PageLoadingContext] Setting loading:', loading)
      }
      return loading
    })
  }, [])

  // Reset loading state when route changes
  useEffect(() => {
    // Only reset if pathname actually changed
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname
      // Don't set to true automatically - let page component set it
      setIsPageLoading(false)
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Safety: auto-disable after 10 seconds to prevent infinite loading
      timeoutRef.current = setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PageLoadingContext] Safety timeout reached after 10s - forcing page to show')
        }
        setIsPageLoading(false)
      }, 10000)
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [pathname])

  return (
    <PageLoadingContext.Provider value={{ isPageLoading, setPageLoading }}>
      {children}
    </PageLoadingContext.Provider>
  )
}

export function usePageLoading() {
  const context = useContext(PageLoadingContext)
  if (context === undefined) {
    throw new Error("usePageLoading must be used within a PageLoadingProvider")
  }
  return context
}

