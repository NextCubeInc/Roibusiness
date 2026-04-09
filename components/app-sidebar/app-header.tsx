"use client"
import { Separator } from "../ui/separator"
import { SidebarTrigger, useSidebar } from "../ui/sidebar"

export function AppHeader(){
  const {open} = useSidebar()
  return(
    <header className="flex flex-row pt-2 pl-2">
      {open?
      (<></>):
      (<SidebarTrigger/>)
      }
    </header>
  )
}