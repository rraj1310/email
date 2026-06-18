export const dynamic = "force-dynamic"

import { getDashboardStats } from "@/app/actions/dashboard"
import { getEngagementTrends, getSendTimeRecommendations } from "@/app/actions/copilot"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Mail, MousePointerClick, ShieldAlert, ArrowUpRight, TrendingUp, Sparkles, Activity, CalendarClock } from "lucide-react"
import { EngagementChart } from "@/components/analytics/engagement-chart"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function DashboardPage() {
  const statsResult = await getDashboardStats()

  // Run AI calls in parallel with graceful failure handling (free tier = 5 req/min limit)
  const [trendsSettled, timingSettled] = await Promise.allSettled([
    getEngagementTrends(),
    getSendTimeRecommendations()
  ])
  const trendsResult = (trendsSettled.status === "fulfilled" ? trendsSettled.value : { success: false }) as any
  const timingResult = (timingSettled.status === "fulfilled" ? timingSettled.value : { success: false }) as any
  
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

  const trendsText = trendsResult.success && trendsResult.text ? (trendsResult.text as string) : ""
  const trendsList: string[] = trendsText
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.startsWith("* ") || line.startsWith("- "))
    .map((line: string) => line.substring(2))

  const timingText = timingResult.success && timingResult.text ? (timingResult.text as string) : "Send times are currently baseline."

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header section with brand highlights */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Overview
          </h2>
          <p className="text-muted-foreground text-sm">
            Here&apos;s how your audience and campaigns are performing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/campaigns/new">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-md transition-all active:scale-95 duration-150">
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
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 to-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Total Contacts
            </CardTitle>
            <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-md">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-bold tracking-tight">{stats.totalContacts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500 inline" />
              Active subscribers in database
            </p>
          </CardContent>
        </Card>

        {/* Total Sent */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border bg-gradient-to-b from-card to-card/95 hover:scale-[1.01]">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-500 to-pink-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Emails Sent
            </CardTitle>
            <div className="p-1.5 bg-purple-500/10 text-purple-500 rounded-md">
              <Mail className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-bold tracking-tight">{stats.totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              Aggregate dispatches across all drafts
            </p>
          </CardContent>
        </Card>

        {/* Avg Open Rate */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border bg-gradient-to-b from-card to-card/95 hover:scale-[1.01]">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Average Open Rate
            </CardTitle>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-md">
              <Activity className="h-4 w-4" />
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
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-orange-500 to-amber-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Average Click Rate
            </CardTitle>
            <div className="p-1.5 bg-orange-500/10 text-orange-500 rounded-md">
              <MousePointerClick className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-bold tracking-tight">{stats.clickRate}%</div>
            {/* Custom visual progress bar */}
            <div className="w-full bg-muted h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(stats.clickRate, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Copilot Insights Panel */}
      <Card className="relative overflow-hidden border bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 shadow-xs">
        <div className="absolute top-0 left-0 h-full w-[4px] bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500" />
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500 fill-blue-500/10" />
              AI Marketing Copilot Insights
            </CardTitle>
            <CardDescription className="text-xs">
              Autonomous calculations and campaign recommendations based on workspace engagement metadata.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-6 text-xs pt-0">
          <div className="md:col-span-2 space-y-2.5">
            <h4 className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Narrative Engagement Trends</h4>
            {trendsList.length > 0 ? (
              <ul className="space-y-2">
                {trendsList.map((trend, idx) => (
                  <li key={idx} className="flex gap-2 items-start leading-relaxed text-foreground/90">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                    <span>{trend}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground italic">No historical trends available yet. Start sending campaigns to calculate engagement ratios.</p>
            )}
          </div>
          <div className="border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 space-y-2.5">
            <h4 className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-purple-500" />
              Send Time Optimization
            </h4>
            <p className="leading-relaxed text-foreground/90">
              {timingText}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Charts & Activities */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
        {/* Engagement Overview Chart */}
        <Card className="col-span-1 lg:col-span-4 shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg font-bold">Engagement Trends</CardTitle>
              <CardDescription className="text-xs">Compare performance across your recent campaigns.</CardDescription>
            </div>
            <Link href="/reports">
              <Button variant="ghost" size="sm" className="text-xs flex items-center gap-1 hover:text-blue-500">
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
              <Activity className="h-4 w-4 text-blue-500" />
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
                    <div className="h-4 w-4 rounded-full border bg-background flex items-center justify-center shrink-0 z-10 transition-colors group-hover:border-blue-500 duration-200">
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground group-hover:bg-blue-500 transition-colors" />
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
