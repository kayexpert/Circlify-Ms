"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, CalendarDays, DollarSign, MessageSquare, Package, BarChart3, Settings, FolderKanban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSidebarStore } from "@/lib/store"
import { useOrganization } from "@/hooks/use-organization"

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Members",
    href: "/dashboard/members",
    icon: Users,
  },
  {
    title: "Finance",
    href: "/dashboard/finance",
    icon: DollarSign,
  },
  {
    title: "Asset Management",
    href: "/dashboard/asset-management",
    icon: Package,
  },
  {
    title: "Events",
    href: "/dashboard/events",
    icon: CalendarDays,
  },
  {
    title: "Projects",
    href: "/dashboard/projects",
    icon: FolderKanban,
  },
  {
    title: "Messaging",
    href: "/dashboard/messaging",
    icon: MessageSquare,
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isOpen, toggle } = useSidebarStore()
  const { organization, refreshOrganization } = useOrganization()

  // Listen for organization updates
  React.useEffect(() => {
    const handleOrganizationUpdate = () => {
      refreshOrganization()
    }

    window.addEventListener('organizationUpdated', handleOrganizationUpdate)
    
    return () => {
      window.removeEventListener('organizationUpdated', handleOrganizationUpdate)
    }
  }, [refreshOrganization])

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300",
          isOpen ? "w-60" : "w-16"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4 gap-2">
          {isOpen ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="text-2xl flex-shrink-0">⛪</div>
              <span className="font-semibold truncate">Circlify MS</span>
            </div>
          ) : (
            <div className="text-2xl flex-shrink-0 mx-auto">⛪</div>
            )}
        </div>

        <ScrollArea className="h-[calc(100vh-4rem)] px-3 py-4">
          <TooltipProvider>
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              // For Dashboard, only match exactly. For other items, match exactly or as a child route
              const isActive = item.href === "/dashboard" 
                ? pathname === item.href || pathname === item.href + "/"
                : pathname === item.href || pathname.startsWith(item.href + "/")
              
                const linkContent = (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-base mb-1 transition-colors cursor-pointer", 
                      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground", 
                      !isOpen && "justify-center"
                    )}
                  >
                  <Icon className="h-5 w-5 shrink-0" />
                  {isOpen && <span>{item.title}</span>}
                </Link>
              )

                if (!isOpen) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return linkContent
            })}
          </nav>
          </TooltipProvider>
        </ScrollArea>
      </aside>

      {/* Spacer */}
      <div className={cn("transition-all duration-300", isOpen ? "w-60" : "w-16")} />
    </>
  )
}

