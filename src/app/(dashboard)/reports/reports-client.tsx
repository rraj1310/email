"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Compass, Mail, BarChart2 } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from "recharts"
import { toast } from "sonner"
import Papa from "papaparse"

interface ReportsClientProps {
  campaignData: Array<{
    name: string
    opens: number
    clicks: number
    sent: number
  }>
  stats: {
    openRate: number
    clickRate: number
    bounceRate: number
    unsubscribeRate: number
  }
}

export function ReportsClient({ campaignData, stats }: ReportsClientProps) {
  
  const handleExport = () => {
    if (campaignData.length === 0) {
      toast.error("No reports data available to export.")
      return
    }

    const exportRows = campaignData.map(c => ({
      Campaign: c.name,
      EmailsSent: c.sent,
      UniqueOpens: c.opens,
      UniqueClicks: c.clicks,
      OpenRate: c.sent > 0 ? ((c.opens / c.sent) * 100).toFixed(1) + "%" : "0%",
      ClickRate: c.sent > 0 ? ((c.clicks / c.sent) * 100).toFixed(1) + "%" : "0%"
    }))

    const csv = Papa.unparse(exportRows)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `campaign_reports_${Date.now()}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Successfully exported campaign performance report!")
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Reports & Analytics</h2>
          <p className="text-muted-foreground text-sm">
            Review detailed metrics and comparison data across your campaigns.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="h-9 text-xs">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Grid: 4 Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
        <Card className="border shadow-xs bg-gradient-to-b from-card to-card/95 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-blue-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Avg. Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{stats.openRate}%</div>
            <div className="w-full bg-muted h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-blue-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(stats.openRate, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border shadow-xs bg-gradient-to-b from-card to-card/95 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Avg. Click Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">{stats.clickRate}%</div>
            <div className="w-full bg-muted h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(stats.clickRate, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border shadow-xs bg-gradient-to-b from-card to-card/95 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Bounce Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{stats.bounceRate}%</div>
            <div className="w-full bg-muted h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-red-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(stats.bounceRate, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border shadow-xs bg-gradient-to-b from-card to-card/95 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Unsubscribe Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">{stats.unsubscribeRate}%</div>
            <div className="w-full bg-muted h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(stats.unsubscribeRate, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart comparison */}
      <Card className="mt-6 border shadow-xs">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Campaign Performance Comparison</CardTitle>
          <CardDescription className="text-xs">Compare absolute open and click metrics across recent campaigns.</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          {campaignData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.922 0 0)" className="dark:stroke-neutral-800" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} dy={5} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: "var(--card)", 
                    borderColor: "oklch(0.922 0 0)",
                    borderRadius: "6px"
                  }} 
                  labelClassName="font-semibold text-foreground text-xs"
                />
                <Legend className="text-xs font-semibold" />
                <Bar dataKey="opens" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Unique Opens" />
                <Bar dataKey="clicks" fill="#10b981" radius={[4, 4, 0, 0]} name="Unique Clicks" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground text-xs">
              <BarChart2 className="h-10 w-10 mb-2 opacity-50" />
              <h3 className="text-md font-semibold text-foreground">No Analytics Data</h3>
              <p className="text-[11px] max-w-sm mt-1">
                Trigger campaign dispatch simulations to record opens and clicks.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
