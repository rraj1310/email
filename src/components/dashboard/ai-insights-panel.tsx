import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Sparkles, CalendarClock, Loader2 } from "lucide-react"
import { getEngagementTrends, getSendTimeRecommendations } from "@/app/actions/copilot"

export async function AiInsightsPanel() {
  // Run AI calls in parallel with graceful failure handling (free tier = 5 req/min limit)
  const [trendsSettled, timingSettled] = await Promise.allSettled([
    getEngagementTrends(),
    getSendTimeRecommendations()
  ])

  const trendsResult = (trendsSettled.status === "fulfilled" ? trendsSettled.value : { success: false }) as any
  const timingResult = (timingSettled.status === "fulfilled" ? timingSettled.value : { success: false }) as any

  const trendsText = trendsResult.success && trendsResult.text ? (trendsResult.text as string) : ""
  const trendsList: string[] = trendsText
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.startsWith("* ") || line.startsWith("- "))
    .map((line: string) => line.substring(2))

  const timingText = timingResult.success && timingResult.text ? (timingResult.text as string) : "Send times are currently baseline."

  return (
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
  )
}

export function AiInsightsPanelSkeleton() {
  return (
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
      <CardContent className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500 mb-2" />
        <span className="font-medium animate-pulse">AI marketing assistant is compiling insights...</span>
      </CardContent>
    </Card>
  )
}
