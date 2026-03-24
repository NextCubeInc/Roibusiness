"use client"
import { Separator } from "../ui/separator"
import { SidebarTrigger, useSidebar } from "../ui/sidebar"

export function AppHeader(){
  const {open} = useSidebar()
  return(
    <header className="flex flex-row p-3 gap-4">
      {open?
      (<></>):
      (
        <>
          <SidebarTrigger/>
          <Separator orientation="vertical"/>
        </>
      )
      }
      
      <h1 className="font-semibold">NAME</h1>
    </header>
  )
}