"use client"

import React, { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface LoaderProps {
  className?: string
  size?: "sm" | "md" | "lg"
  text?: string
  fullScreen?: boolean
}

const sizeClasses = {
  sm: "w-[20px]",
  md: "w-[35px]",
  lg: "w-[50px]",
}

// Singleton pattern for fullScreen loaders - only one can exist at a time
let activeFullScreenLoader: string | null = null
const fullScreenLoaderRefs = new Map<string, () => void>()

export function Loader({ 
  className, 
  size = "md", 
  text, 
  fullScreen = false
}: LoaderProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(true)
  const instanceId = useRef(`loader-${Math.random().toString(36).substr(2, 9)}`).current
  const isMountedRef = useRef(true)
  const fadeOutTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Handle fullScreen loader singleton and visibility
  useEffect(() => {
    if (fullScreen) {
      // If another fullScreen loader is active, don't render this one
      if (activeFullScreenLoader && activeFullScreenLoader !== instanceId) {
        setShouldRender(false)
        return
      }

      // This is the active fullScreen loader
      activeFullScreenLoader = instanceId
      setIsVisible(true)
      setShouldRender(true)
      
      return () => {
        // Cleanup: fade out before removing
        if (fadeOutTimerRef.current) {
          clearTimeout(fadeOutTimerRef.current)
        }
        
        setIsVisible(false)
        fadeOutTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setShouldRender(false)
          }
          if (activeFullScreenLoader === instanceId) {
            activeFullScreenLoader = null
          }
        }, 300) // Match CSS transition duration
        
        if (activeFullScreenLoader === instanceId) {
          activeFullScreenLoader = null
        }
        fullScreenLoaderRefs.delete(instanceId)
      }
    } else {
      // Non-fullScreen loader - always visible
      setIsVisible(true)
      setShouldRender(true)
    }
  }, [fullScreen, instanceId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (fadeOutTimerRef.current) {
        clearTimeout(fadeOutTimerRef.current)
      }
      if (activeFullScreenLoader === instanceId) {
        activeFullScreenLoader = null
      }
      fullScreenLoaderRefs.delete(instanceId)
    }
  }, [instanceId])

  // Don't render if shouldRender is false
  if (!shouldRender) {
    return null
  }

  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        fullScreen && "fixed inset-0 z-50 bg-background",
        !fullScreen && "min-h-[400px] w-full",
        // Smooth fade transitions
        "transition-opacity duration-300 ease-in-out",
        isVisible ? "opacity-100" : "opacity-0",
        className
      )}
      style={{
        pointerEvents: isVisible ? 'auto' : 'none',
        // Ensure smooth animation and prevent layout shift
        willChange: 'opacity',
        // Ensure proper centering from start
        ...(fullScreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        })
      }}
    >
      <div 
        className={cn(
          "loader",
          sizeClasses[size]
        )}
      />
      {text && (
        <p className={cn(
          "text-sm font-medium text-muted-foreground",
          "transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0"
        )}>
          {text}
        </p>
      )}
    </div>
  )
}

// Spinner variant for inline use (buttons, etc.)
export function Spinner({ 
  className, 
  size = "sm" 
}: Omit<LoaderProps, "text" | "fullScreen">) {
  return (
    <div className={cn("inline-flex items-center justify-center", className)}>
      <div 
        className={cn(
          "loader",
          sizeClasses[size]
        )}
      />
    </div>
  )
}

// Compact loader for table cells and small spaces
export function CompactLoader({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        "loader-container",
        className
      )}
    >
      <div className="loader" />
    </div>
  )
}
