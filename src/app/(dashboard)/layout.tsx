"use client"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

import { GlobalSearch } from "@/components/layout/global-search"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { PremiumWorkspaceControls } from "@/components/layout/premium-workspace-controls"
import { usePathname } from "next/navigation"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isEditor = pathname?.includes("/editor")

  if (isEditor) {
    return <div className="w-screen h-screen overflow-hidden bg-background relative">{children}</div>
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="font-medium text-sm text-muted-foreground">
              Dashboard
            </div>
          </div>
          <div className="flex items-center gap-4">
            <GlobalSearch />
            <PremiumWorkspaceControls />
            <ModeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 relative overflow-hidden min-h-[calc(100vh-4rem)]">
          {/* Ambient background glow mesh */}
          <div className="absolute top-[-5%] left-[15%] w-[450px] h-[450px] bg-primary/15 rounded-full blur-[130px] pointer-events-none -z-10 ambient-orb-1" />
          <div className="absolute bottom-[-5%] right-[5%] w-[400px] h-[400px] bg-pink-500/10 dark:bg-pink-500/15 rounded-full blur-[110px] pointer-events-none -z-10 ambient-orb-2" />
          <div className="absolute top-[40%] right-[30%] w-[350px] h-[350px] bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-[120px] pointer-events-none -z-10 ambient-orb-3" />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
