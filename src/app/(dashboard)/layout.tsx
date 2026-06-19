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
            {/* Removed PremiumWorkspaceControls workspace switcher as requested */}
            <ModeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 relative overflow-hidden min-h-[calc(100vh-4rem)]">
          {/* Ambient background glow mesh */}
          <div className="absolute top-[-5%] left-[15%] w-[450px] h-[450px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none -z-10 ambient-orb-1" />
          <div className="absolute bottom-[-5%] right-[5%] w-[400px] h-[400px] bg-teal-600/5 dark:bg-teal-600/10 rounded-full blur-[110px] pointer-events-none -z-10 ambient-orb-2" />
          <div className="absolute top-[40%] right-[30%] w-[350px] h-[350px] bg-emerald-500/3 dark:bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10 ambient-orb-3" />

          {/* Stock Market Dynamic Animated Chart Background - Reduced opacity and speed to be non-distracting */}
          <div className="absolute inset-0 pointer-events-none -z-20 opacity-[0.08] dark:opacity-[0.12] overflow-hidden">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 800" preserveAspectRatio="none">
              {/* Gradients */}
              <defs>
                <linearGradient id="chart-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.05" />
                  <stop offset="50%" stopColor="#00dfa2" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {/* Rising bull market trendline */}
              <path
                d="M 0,720 Q 300,700 600,730 T 1200,680 T 1600,710 T 1920,670"
                fill="none"
                stroke="url(#chart-gradient)"
                strokeWidth="2.5"
              />
              
              {/* Secondary faint chart index line */}
              <path
                d="M 0,735 Q 350,715 700,745 T 1400,695 T 1920,710"
                fill="none"
                stroke="#00dfa2"
                strokeOpacity="0.1"
                strokeWidth="1.5"
                strokeDasharray="6,6"
              />

              {/* Animated glowing stock index pointer circles - Slowed down significantly */}
              <circle r="4" fill="#00dfa2" filter="drop-shadow(0 0 4px #00dfa2)">
                <animateMotion
                  path="M 0,720 Q 300,700 600,730 T 1200,680 T 1600,710 T 1920,670"
                  dur="120s"
                  repeatCount="indefinite"
                />
              </circle>
              
              <circle r="3" fill="#06b6d4" filter="drop-shadow(0 0 3px #06b6d4)">
                <animateMotion
                  path="M 0,735 Q 350,715 700,745 T 1400,695 T 1920,710"
                  dur="160s"
                  repeatCount="indefinite"
                />
              </circle>
            </svg>
            
            {/* Candle Bars (dynamic stock market illustration) */}
            <div className="absolute bottom-4 left-0 right-0 h-32 flex items-end justify-between px-6 gap-[3px] opacity-10 dark:opacity-15 select-none">
              {Array.from({ length: 70 }).map((_, i) => {
                const height = 15 + Math.sin(i * 0.3) * 12 + Math.cos(i * 0.7) * 8 + (i * 0.4);
                const isGreen = (i * 3 + 1) % 5 !== 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div className={`w-[1px] h-full ${isGreen ? "bg-emerald-500" : "bg-rose-500"}`} style={{ height: `${height + 10}px` }} />
                    <div className={`w-1 rounded-xs ${isGreen ? "bg-emerald-500" : "bg-rose-500"}`} style={{ height: `${height}px` }} />
                  </div>
                )
              })}
            </div>
          </div>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
