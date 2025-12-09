"use client"

import * as React from "react"
import { useEffect } from "react"
import { useTheme } from "next-themes"

export function ThemeScript() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !resolvedTheme) return
    
    const root = document.documentElement
    
    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
      const shouldBeDark = resolvedTheme === "dark"
      const hasDarkClass = root.classList.contains("dark")
      
      // Only update if there's a mismatch to avoid unnecessary DOM operations
      if (shouldBeDark !== hasDarkClass) {
        if (shouldBeDark) {
          root.classList.add("dark")
        } else {
          root.classList.remove("dark")
        }
      }
      
      // Set color-scheme for browser UI
      root.style.colorScheme = shouldBeDark ? "dark" : "light"
    })
  }, [resolvedTheme, mounted])

  return null
}
