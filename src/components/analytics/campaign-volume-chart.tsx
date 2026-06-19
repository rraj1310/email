"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const defaultData = [
  { name: "Promo A", sent: 4000 },
  { name: "Promo B", sent: 5000 },
  { name: "Newsletter 1", sent: 3000 },
  { name: "Promo C", sent: 6000 },
]

interface CampaignVolumeChartProps {
  data?: Array<{
    name: string
    sent: number
  }>
}

export function CampaignVolumeChart({ data = defaultData }: CampaignVolumeChartProps) {
  const chartData = data && data.length > 0 ? data : defaultData

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00dfa2" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.14 0.03 165)" className="dark:stroke-neutral-800" />
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
            borderColor: "oklch(0.14 0.03 165)",
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)"
          }} 
          labelClassName="font-semibold text-foreground text-xs"
          itemStyle={{ color: "#00dfa2" }}
        />
        <Bar
          dataKey="sent"
          fill="url(#colorSent)"
          radius={[4, 4, 0, 0]}
          name="Emails Sent"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
