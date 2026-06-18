"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Cake, Sparkles, ArrowRight, Loader2, Zap, CheckCircle2 } from "lucide-react"
import { updateBirthdaySettings, triggerBirthdayCheckNow } from "@/app/actions/birthday"
import { toast } from "sonner"
import Link from "next/link"

interface DashboardCardsProps {
  initialEnabled: boolean
  emailTime: string
  todayBirthdays: Array<{ id: string; name: string; email: string }>
}

export function DashboardCards({ initialEnabled, emailTime, todayBirthdays }: DashboardCardsProps) {
  const [bdayEnabled, setBdayEnabled] = React.useState(initialEnabled)
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [isTriggering, setIsTriggering] = React.useState(false)

  const handleToggle = async (checked: boolean) => {
    setIsUpdating(true)
    try {
      const res = await updateBirthdaySettings(checked, emailTime)
      if (res.success) {
        setBdayEnabled(checked)
        toast.success(`Birthday automation ${checked ? "enabled" : "disabled"}`)
      } else {
        toast.error(res.error || "Failed to update settings")
      }
    } catch {
      toast.error("Failed to update settings")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleTriggerNow = async () => {
    setIsTriggering(true)
    try {
      const res = await triggerBirthdayCheckNow()
      if (res.success) {
        toast.success(`Dispatched ${res.count} birthday email(s) successfully!`)
      } else {
        toast.error(res.error || "Failed to trigger birthday check")
      }
    } catch {
      toast.error("Failed to trigger birthday check")
    } finally {
      setIsTriggering(false)
    }
  }

  return (
    <>
      {/* CARD 3: Birthday Automation */}
      <Card className="relative overflow-hidden group border bg-gradient-to-br from-amber-500/10 via-pink-500/5 to-card hover:shadow-lg transition-all duration-300 flex flex-col justify-between min-h-[300px] hover:scale-[1.01]">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-amber-500 to-pink-500" />
        <CardContent className="p-5 flex flex-col justify-between h-full flex-1">
          <div className="space-y-4">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-tr from-amber-500 to-pink-500 text-white rounded-lg shadow-sm">
                  <Cake className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm text-foreground">
                  Birthday Automation
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={bdayEnabled} 
                  onCheckedChange={handleToggle} 
                  disabled={isUpdating}
                  className="data-[state=checked]:bg-emerald-500 scale-90"
                />
              </div>
            </div>

            {/* Status description */}
            <p className="text-[11px] text-muted-foreground leading-tight">
              {bdayEnabled 
                ? `Auto-send ON — runs at ${emailTime} daily` 
                : "Auto-send OFF — paused"}
            </p>

            {/* Today's birthdays */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-pink-700 dark:text-pink-400">
                Today's birthdays ({todayBirthdays.length})
              </p>
              <div className="rounded-lg border bg-background/50 max-h-[120px] overflow-y-auto divide-y divide-border scrollbar-none">
                {todayBirthdays.length > 0 ? (
                  todayBirthdays.map((c) => (
                    <div key={c.id} className="p-2 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-amber-400 to-pink-400 flex items-center justify-center text-[9px] text-white font-bold shrink-0">
                          {c.name[0].toUpperCase()}
                        </div>
                        <span className="font-semibold text-foreground truncate max-w-[80px]">{c.name}</span>
                      </div>
                      <span className="text-muted-foreground text-[10px] truncate max-w-[100px]">{c.email}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-muted-foreground text-[11px]">
                    🎈 No birthdays today
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Button at bottom */}
          <Button 
            onClick={handleTriggerNow} 
            disabled={isTriggering}
            variant="outline"
            className="w-full mt-4 h-8 text-[11px] font-bold border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-800 dark:text-amber-400 cursor-pointer"
          >
            {isTriggering ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Checking...</>
            ) : (
              <><Zap className="mr-1.5 h-3.5 w-3.5 fill-current" />Check & Send Today's Birthdays Now</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* CARD 4: AI Personalized Bulk Send */}
      <Card className="relative overflow-hidden group border bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-card hover:shadow-lg transition-all duration-300 flex flex-col justify-between min-h-[300px] hover:scale-[1.01]">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500" />
        <CardContent className="p-5 flex flex-col justify-between h-full flex-1">
          <div className="space-y-3">
            {/* Header Row */}
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-tr from-violet-500 to-indigo-500 text-white rounded-lg shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">
                AI Personalized Bulk Send
              </h3>
            </div>

            <p className="text-[11px] text-muted-foreground leading-normal">
              Send a different, personal message to each client — without typing each one by hand.
            </p>

            {/* Steps List */}
            <div className="space-y-1.5 text-[10.5px]">
              <div className="flex gap-2 items-start text-muted-foreground">
                <span className="font-bold text-violet-600 bg-violet-100 dark:bg-violet-950/40 rounded-full w-4 h-4 flex items-center justify-center shrink-0">1</span>
                <span><strong>Pick clients</strong> — select from your contact list</span>
              </div>
              <div className="flex gap-2 items-start text-muted-foreground">
                <span className="font-bold text-violet-600 bg-violet-100 dark:bg-violet-950/40 rounded-full w-4 h-4 flex items-center justify-center shrink-0">2</span>
                <span><strong>Add a short note</strong> per client (optional)</span>
              </div>
              <div className="flex gap-2 items-start text-muted-foreground">
                <span className="font-bold text-violet-600 bg-violet-100 dark:bg-violet-950/40 rounded-full w-4 h-4 flex items-center justify-center shrink-0">3</span>
                <span><strong>AI writes</strong> a warm personalized email each</span>
              </div>
              <div className="flex gap-2 items-start text-muted-foreground">
                <span className="font-bold text-violet-600 bg-violet-100 dark:bg-violet-950/40 rounded-full w-4 h-4 flex items-center justify-center shrink-0">4</span>
                <span><strong>Review, edit</strong> if needed, then send all</span>
              </div>
            </div>
          </div>

          {/* Action Button at bottom */}
          <Link href="/campaigns/personalized" passHref className="w-full mt-4">
            <Button className="w-full h-8 text-[11px] font-bold bg-white text-violet-900 border border-violet-200 hover:bg-violet-50 hover:text-violet-950 shadow-sm cursor-pointer">
              ✦ Start Personalized Send <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </>
  )
}
