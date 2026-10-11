import type * as React from "react"
import { Gamepad2Icon } from "lucide-react"
import { Link } from "react-router"

import { NavMain, type NavMainItem } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export type NavSection = { label?: string; items: NavMainItem[] }

export function AppSidebar({
  homeUrl,
  sections,
  isActive,
  user,
  accountUrl,
  onSignOut,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  homeUrl: string
  sections: NavSection[]
  isActive: (url: string) => boolean
  user: { name: string; email: string }
  accountUrl: string
  onSignOut: () => void
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link to={homeUrl}>
                <Gamepad2Icon className="size-5!" />
                <span className="text-base font-semibold">Game Provider</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {sections.map((section, index) => (
          <NavMain
            key={section.label ?? index}
            label={section.label}
            items={section.items}
            isActive={isActive}
          />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} accountUrl={accountUrl} onSignOut={onSignOut} />
      </SidebarFooter>
    </Sidebar>
  )
}
