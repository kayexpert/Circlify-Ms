"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [isToggling, setIsToggling] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Define toggleTheme before conditional return to maintain hook order
  const toggleTheme = React.useCallback(() => {
    // Immediate visual feedback
    setIsToggling(true)
    
    // Apply theme change immediately
    const currentResolvedTheme = resolvedTheme || theme
    const newTheme = currentResolvedTheme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    
    // Reset toggle state after transition
    setTimeout(() => {
      setIsToggling(false)
    }, 200)
  }, [resolvedTheme, theme, setTheme])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const currentTheme = resolvedTheme || theme
  const isDark = currentTheme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      disabled={isToggling}
      className="transition-transform duration-150 hover:scale-110 active:scale-95"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <Sun className="h-[1.2rem] w-[1.2rem] transition-opacity duration-150" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] transition-opacity duration-150" />
      )}
          <span className="sr-only">Toggle theme</span>
        </Button>
  )
}

