"use client"
import type { LucideIcon } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Separator } from "../ui/separator"
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  TrendingUp,
  Zap,
} from "lucide-react"
import Link from "next/link"

type SidebarRoute = {
  id: number
  title: string
  icon: LucideIcon
  Link: string
}

const sidebarRoutes: SidebarRoute[] = [
  { id: 11, title: "Dashboard", icon: LayoutDashboard, Link: "app/dashboard" },
  { id: 12, title: "Influencers", icon: Users, Link: "app/influencers" },
  { id: 13, title: "Vendas", icon: ShoppingBag, Link: "app/vendas" },
  { id: 14, title: "Ranking", icon: TrendingUp, Link: "app/ranking" },
  { id: 15, title: "Integrações", icon: Zap, Link: "app/integracoes" },
]

export function AppSidebar() {
  const { open } = useSidebar()

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu className="flex gap-4">
          {open ? (
            <SidebarMenuItem className="flex flex-row items-center gap-4">
              <img src="/android-chrome-512x512.png" className="size-8" />
              <label htmlFor="ROI" className="font-bold">
                ROINFLUENCER
              </label>
              <Separator orientation="vertical" />
              <SidebarTrigger />
            </SidebarMenuItem>
          ) : (
            <SidebarMenuItem>
              <img src="/android-chrome-512x512.png" className="size-8" />
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {sidebarRoutes.map((item) => {
              const Icon = item.icon
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton asChild>
                    <Link href={item.Link}>
                      <Icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}