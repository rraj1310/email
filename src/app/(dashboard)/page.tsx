export const dynamic = "force-dynamic"

import { getDashboardStats } from "@/app/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Mail, MousePointerClick, ShieldAlert, ArrowUpRight, TrendingUp, Sparkles, Activity, CalendarClock } from "lucide-react"
import { EngagementChart } from "@/components/analytics/engagement-chart"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Suspense } from "react"
import { AiInsightsPanel, AiInsightsPanelSkeleton } from "@/components/dashboard/ai-insights-panel"

export default async function DashboardPage() {
  const statsResult = await getDashboardStats()
  
  // Provide robust defaults if fetch fails
  const stats = statsResult.success && statsResult.data ? statsResult.data : {
    totalContacts: 0,
    totalSent: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
    unsubscribeRate: 0,
    totalSuppressed: 0,
    chartData: [],
    activities: []
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      
      {/* Live Stats Ticker Bar */}
      <div className="w-full bg-slate-900 dark:bg-slate-950 text-slate-100 text-xs py-2 px-3 rounded-lg border border-slate-800 shadow-md flex items-center overflow-hidden gap-6 select-none">
        <div className="flex items-center gap-1.5 shrink-0 bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px] animate-pulse">
          LIVE
        </div>
        <div className="flex gap-8 whitespace-nowrap overflow-x-auto scrollbar-none text-[11px] font-mono w-full">
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Contacts:</span> 
            <span className="font-semibold">{stats.totalContacts}</span>
            <span className="text-emerald-500 font-bold flex items-center gap-0.5">▲ +12.4%</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Emails Sent:</span> 
            <span className="font-semibold">{stats.totalSent}</span>
            <span className="text-emerald-500 font-bold flex items-center gap-0.5">▲ +5.8%</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Open Rate:</span> 
            <span className="font-semibold">{stats.openRate}%</span>
            <span className="text-emerald-500 font-bold flex items-center gap-0.5">▲ +4.2%</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Click Rate:</span> 
            <span className="font-semibold">{stats.clickRate}%</span>
            <span className="text-rose-500 font-bold flex items-center gap-0.5">▼ -1.1%</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Suppressed:</span> 
            <span className="font-semibold">{stats.totalSuppressed}</span>
            <span className="text-slate-400 font-bold flex items-center gap-0.5">▬ 0.0%</span>
          </span>
        </div>
      </div>

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Dashboard
          </h2>
          <p className="text-muted-foreground text-sm">
            Monitor your email marketing performance at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/campaigns/new">
            <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium shadow-md transition-all active:scale-95 duration-150 cursor-pointer">
              <Sparkles className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid: 4 Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Contacts */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border bg-gradient-to-b from-card to-card/95 hover:scale-[1.01]">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Total Contacts
            </CardTitle>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-md">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-bold tracking-tight">{stats.totalContacts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500 inline" />
              Total active contacts in your workspace
            </p>
          </CardContent>
        </Card>

        {/* Total Sent */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border bg-gradient-to-b from-card to-card/95 hover:scale-[1.01]">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 to-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Emails Sent
            </CardTitle>
            <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-md">
              <Mail className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-bold tracking-tight">{stats.totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              Total emails dispatched across all campaigns
            </p>
          </CardContent>
        </Card>

        {/* Avg Open Rate */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border bg-gradient-to-b from-card to-card/95 hover:scale-[1.01]">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 to-emerald-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Avg Open Rate
            </CardTitle>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-md">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-bold tracking-tight">{stats.openRate}%</div>
            {/* Custom visual progress bar */}
            <div className="w-full bg-muted h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(stats.openRate, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Avg Click Rate */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border bg-gradient-to-b from-card to-card/95 hover:scale-[1.01]">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-amber-500 to-orange-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Avg Click Rate
            </CardTitle>
            <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-md">
              <MousePointerClick className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-bold tracking-tight">{stats.clickRate}%</div>
            {/* Custom visual progress bar */}
            <div className="w-full bg-muted h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(stats.clickRate, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Guide */}
      <Card className="border border-emerald-500/20 bg-emerald-500/[0.02] dark:bg-emerald-950/[0.02] overflow-hidden shadow-xs">
        <CardHeader className="pb-3 border-b border-emerald-500/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Quick Guide — What Each Section Does</CardTitle>
              <CardDescription className="text-xs text-emerald-700/80 dark:text-emerald-400/80">New here? Here is a quick overview of each section in the sidebar:</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="space-y-1.5 p-3 rounded-lg border bg-background/50">
            <span className="font-bold text-foreground flex items-center gap-1.5 text-[13px]">
              👥 Contacts
            </span>
            <p className="text-muted-foreground leading-relaxed">
              Your subscriber list. Add, search, import contacts and organize them with color-coded <strong>Tags</strong>.
            </p>
          </div>
          <div className="space-y-1.5 p-3 rounded-lg border bg-background/50">
            <span className="font-bold text-foreground flex items-center gap-1.5 text-[13px]">
              ✉️ Campaigns
            </span>
            <p className="text-muted-foreground leading-relaxed">
              Send emails. Write, design, and broadcast email newsletters or promotions to your contact segments.
            </p>
          </div>
          <div className="space-y-1.5 p-3 rounded-lg border bg-background/50">
            <span className="font-bold text-foreground flex items-center gap-1.5 text-[13px]">
              🤖 Automations
            </span>
            <p className="text-muted-foreground leading-relaxed">
              Set up automatic emails. For example, send a birthday greeting to contacts on their birthday, automatically.
            </p>
          </div>
          <div className="space-y-1.5 p-3 rounded-lg border bg-background/50">
            <span className="font-bold text-foreground flex items-center gap-1.5 text-[13px]">
              📊 Reports
            </span>
            <p className="text-muted-foreground leading-relaxed">
              View performance stats. See how many people opened, clicked, or unsubscribed from your emails.
            </p>
          </div>
        </CardContent>
      </Card>

      <Suspense fallback={<AiInsightsPanelSkeleton />}>
        <AiInsightsPanel />
      </Suspense>

      {/* Main Grid: Charts & Activities */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
        {/* Engagement Overview Chart */}
        <Card className="col-span-1 lg:col-span-4 shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg font-bold">Engagement Over Time</CardTitle>
              <CardDescription className="text-xs">Compare open and click performance across your recent campaigns.</CardDescription>
            </div>
            <Link href="/reports">
              <Button variant="ghost" size="sm" className="text-xs flex items-center gap-1 hover:text-emerald-500 cursor-pointer">
                View Reports <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <EngagementChart data={stats.chartData} />
          </CardContent>
        </Card>

        {/* Recent Activity Timeline */}
        <Card className="col-span-1 lg:col-span-3 shadow-sm border bg-card/60 backdrop-blur-xs">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Activity Feed
            </CardTitle>
            <CardDescription className="text-xs">
              Recent system updates and logs.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted/80">
              {stats.activities && stats.activities.length > 0 ? (
                stats.activities.map((act) => (
                  <div key={act.id} className="flex gap-4 relative group">
                    {/* Circle timeline dot */}
                    <div className="h-4 w-4 rounded-full border bg-background flex items-center justify-center shrink-0 z-10 transition-colors group-hover:border-emerald-500 duration-200">
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground group-hover:bg-emerald-500 transition-colors" />
                    </div>
                    
                    {/* Log Details */}
                    <div className="space-y-1">
                      <p className="text-sm font-semibold leading-tight text-foreground/90 group-hover:text-foreground transition-colors">
                        {act.action}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">{act.user}</span>
                        <span>•</span>
                        <span>{act.time}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground text-sm">
                  <ShieldAlert className="h-8 w-8 mb-2 opacity-50" />
                  No recent activities logged.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
