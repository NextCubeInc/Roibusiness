"use server"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar/app-sidebar"
//import { AppHeader } from "@/components/app-sidebar/app-header"
import { getBusinessProfile } from "@/app/main/actions"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getBusinessProfile()
  
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <main className="flex flex-col flex-1 min-w-0 min-h-svh overflow-hidden">
        {/* <AppHeader /> */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}