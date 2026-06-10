"use client"

import { redirect, usePathname } from "next/navigation"
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
  ChevronsUpDown,
  User,
  CreditCard,
  LogOut,
  Stars,
} from "lucide-react"
import Link from "next/link"
import { UserAvatar } from "../ui/user-avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu"
import { logout } from "@/app/main/actions"
import type { BusinessProfile } from "@/lib/types"

const sidebarRoutes = [
  { id: 11, title: "Dashboard", icon: LayoutDashboard, Link: "/main/dashboard" },
  { id: 12, title: "Influencers", icon: Users, Link: "/main/influencers" },
  { id: 13, title: "Vendas", icon: ShoppingBag, Link: "/main/vendas" },
  { id: 14, title: "Ranking", icon: TrendingUp, Link: "/main/ranking" },
  { id: 15, title: "Integrações", icon: Zap, Link: "/main/integracoes" },
]

type AppSidebarProps = {
  user: BusinessProfile | null
}

export function AppSidebar({ user }: AppSidebarProps) {
  const { open } = useSidebar()
  const pathname = usePathname()
  const handleLogout = async () => {
    await logout()
  }

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
              const isActive = pathname.startsWith(item.Link)
              
              return (
                <SidebarMenuItem key={item.id} className="mb-3">
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive}
                  >
                    <Link href={item.Link}>
                      <Icon className="size-4" 
                      color={isActive ? "var(--sidebar-primary)" : undefined}
                      />
                      <span className={isActive ? "text-sidebar-primary" : undefined}>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <UserAvatar
                    avatarUrl={user?.avatar_url}
                    name={user?.name}
                    size={32}
                    rounded="lg"
                    className="grayscale"
                  />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user?.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4"/>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserAvatar
                      avatarUrl={user?.avatar_url}
                      name={user?.name}
                      size={32}
                      rounded="lg"
                    />
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user?.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user?.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={()=> redirect("/main/config")}> 
                    <User/>
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={()=> redirect("/main/plans")}>
                    <Stars/>
                    Plans
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut color="var(--destructive)"/>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}