"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface LoaderProps {
  className?: string
  size?: "sm" | "md" | "lg"
  text?: string
  fullScreen?: boolean
}

const sizeClasses = {
  sm: "w-6",
  md: "w-12",
  lg: "w-16",
}

export function Loader({ 
  className, 
  size = "md", 
  text, 
  fullScreen = false 
}: LoaderProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-3",
      fullScreen && "min-h-screen",
      !fullScreen && "min-h-[400px]",
      className
    )}>
      <div 
        className={cn(
          "loader",
          sizeClasses[size],
          "aspect-[0.75]"
        )}
      />
      {text && (
        <p className="text-sm font-medium text-muted-foreground">
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
          sizeClasses[size],
          "aspect-[0.75]"
        )}
      />
    </div>
  )
}

// Compact loader for table cells and small spaces
export function CompactLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-4", className)}>
      <div className="loader w-8 aspect-[0.75]" />
    </div>
  )
}
