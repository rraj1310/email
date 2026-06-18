"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const defaultData = [
  { name: "Promo A", opens: 2500, clicks: 1200, sent: 4000 },
  { name: "Promo B", opens: 3200, clicks: 1400, sent: 5000 },
  { name: "Newsletter 1", opens: 1800, clicks: 800, sent: 3000 },
  { name: "Promo C", opens: 4200, clicks: 2200, sent: 6000 },
]

interface EngagementChartProps {
  data?: Array<{
    name: string
    opens: number
    clicks: number
    sent: number
  }>
}

export function EngagementChart({ data = defaultData }: EngagementChartProps) {
  const chartData = data && data.length > 0 ? data : defaultData

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.922 0 0)" className="dark:stroke-neutral-800" />
        <XAxis 
          dataKey="name" 
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          dy={10}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          dx={-5}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: "var(--card)", 
            borderColor: "oklch(0.922 0 0)",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)"
          }} 
          labelClassName="font-semibold text-foreground text-xs"
        />
        <Area
          type="monotone"
          dataKey="opens"
          stroke="#3b82f6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorOpens)"
          name="Opens"
        />
        <Area
          type="monotone"
          dataKey="clicks"
          stroke="#10b981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorClicks)"
          name="Clicks"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
