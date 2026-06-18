import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

import { GlobalSearch } from "@/components/layout/global-search"
import { ModeToggle } from "@/components/ui/mode-toggle"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
            <ModeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 relative overflow-hidden min-h-[calc(100vh-4rem)]">
          {/* Ambient background glow mesh */}
          <div className="absolute top-[-10%] left-[20%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse duration-[8000ms]" />
          <div className="absolute bottom-[-10%] right-[10%] w-[350px] h-[350px] bg-pink-500/5 dark:bg-pink-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
