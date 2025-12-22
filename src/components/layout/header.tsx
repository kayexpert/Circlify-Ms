"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { usePathname } from "next/navigation"
import { ThemeToggleButton } from "./ThemeToggleButton"
import NotificationDropdown from "./NotificationDropdown"
import UserDropdown from "./UserDropdown"
import { useSidebarStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { useOrganization } from "@/hooks/use-organization"
import { getOrganizationTypeLabelLowercase } from "@/lib/utils/organization"

// Map paths to page titles and descriptions
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

// Map paths to page titles and descriptions
const getPageInfo = (pathname: string, orgType?: string | null, userName?: string): { title: string; description: string } => {
  const orgTypeLower = getOrganizationTypeLabelLowercase(orgType)
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return {
      title: "Dashboard",
      description: userName
        ? `Welcome back, ${userName}! Here's what's happening with your ${orgTypeLower}.`
        : `Overview of your ${orgTypeLower}`
    }
  }
  if (pathname.startsWith("/dashboard/members")) {
    return { title: "Members", description: `Manage ${orgTypeLower} members, attendance, and groups` }
  }
  if (pathname.startsWith("/dashboard/finance")) {
    return { title: "Finance", description: `Manage ${orgTypeLower} finances, budgets, and accounts` }
  }
  if (pathname.startsWith("/dashboard/asset-management")) {
    return { title: "Asset Management", description: `Manage ${orgTypeLower} assets, disposals, and categories` }
  }
  if (pathname.startsWith("/dashboard/events")) {
    return { title: "Events", description: `Manage ${orgTypeLower} events and activities` }
  }
  if (pathname.startsWith("/dashboard/projects")) {
    return { title: "Projects", description: "Manage projects, track income and expenditure" }
  }
  if (pathname.startsWith("/dashboard/messaging")) {
    return { title: "Messaging", description: "Send messages and manage communications" }
  }
  if (pathname.startsWith("/dashboard/reports")) {
    return { title: "Reports", description: "View and generate reports" }
  }
  if (pathname.startsWith("/dashboard/settings")) {
    return { title: "Settings", description: `Configure your ${orgTypeLower} settings` }
  }
  return { title: "Dashboard", description: `Overview of your ${orgTypeLower}` }
}

export function Header() {
  const { organization } = useOrganization()
  const { toggle, isOpen } = useSidebarStore()
  const pathname = usePathname()
  const [userName, setUserName] = useState<string>("")
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', user.id)
          .single()

        if (userData) {
          setUserName(userData.full_name || userData.email?.split('@')[0] || "")
        }
      }
    }
    getUser()
  }, [supabase])

  const pageInfo = getPageInfo(pathname, organization?.type, userName)

  return (
    <header className="flex-shrink-0 flex h-16 w-full items-center bg-white border-gray-200 z-40 dark:border-gray-800 dark:bg-gray-900 lg:border-b">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
        <div className="flex items-center justify-between w-full gap-2 px-3 h-16 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="cursor-pointer bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 rounded-lg p-2"
            >
              {isOpen ? (
                <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300 stroke-[2.5]" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-300 stroke-[2.5]" />
              )}
            </Button>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-xl truncate">
                {pageInfo.title}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {pageInfo.description}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between w-full gap-4 px-5 h-16 lg:flex lg:justify-end lg:px-0 lg:shadow-none">
          <div className="flex items-center gap-2 2xsm:gap-3">
            {/* <!-- Dark Mode Toggler --> */}
            <ThemeToggleButton />
            {/* <!-- Dark Mode Toggler --> */}

            <NotificationDropdown />
            {/* <!-- Notification Menu Area --> */}
          </div>
          {/* <!-- User Area --> */}
          <UserDropdown />
        </div>
      </div>
    </header>
  )
}

