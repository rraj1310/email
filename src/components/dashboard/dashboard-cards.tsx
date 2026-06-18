"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Cake, Sparkles, ArrowRight, Loader2, Zap } from "lucide-react"
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
      if ("data" in res && res.data) {
        setBdayEnabled(checked)
        toast.success(`Birthday automation ${checked ? "enabled" : "disabled"}`)
      } else {
        toast.error(("error" in res ? res.error : null) || "Failed to update settings")
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
      if ("count" in res) {
        toast.success(`Dispatched ${res.count} birthday email(s) successfully!`)
      } else {
        toast.error(("error" in res ? res.error : null) || "Failed to trigger birthday check")
      }
    } catch {
      toast.error("Failed to trigger birthday check")
    } finally {
      setIsTriggering(false)
    }
  }

  return (
    <>
      {/* CARD 3: Sleek Birthday Automation */}
      <Card className="relative overflow-hidden group border bg-gradient-to-br from-amber-500/10 via-pink-500/5 to-card hover:shadow-lg transition-all duration-300 flex flex-col justify-between hover:scale-[1.01]">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-amber-500 to-pink-500" />
        <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-tr from-amber-500 to-pink-500 text-white rounded-lg shadow-sm">
                <Cake className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Birthday Automation
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  {bdayEnabled ? `Auto-send at ${emailTime} daily` : "Auto-send paused"}
                </p>
              </div>
            </div>
            <Switch 
              checked={bdayEnabled} 
              onCheckedChange={handleToggle} 
              disabled={isUpdating}
              className="data-[state=checked]:bg-emerald-500 scale-90"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 items-center pt-1">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-pink-700 dark:text-pink-400 uppercase tracking-wider">Today's Birthdays</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold text-foreground">{todayBirthdays.length}</span>
                {todayBirthdays.length > 0 && (
                  <span className="text-[8px] bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 px-1.5 py-0.2 rounded font-semibold">Active</span>
                )}
              </div>
            </div>
            <Button 
              onClick={handleTriggerNow} 
              disabled={isTriggering}
              variant="outline"
              size="sm"
              className="h-8 text-[10px] font-bold border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-800 dark:text-amber-400 cursor-pointer w-full"
            >
              {isTriggering ? (
                <><Loader2 className="mr-1 h-3 animate-spin" />Checking...</>
              ) : (
                <><Zap className="mr-1 h-3 fill-current" />Run Now</>
              )}
            </Button>
          </div>

          {todayBirthdays.length > 0 && (
            <div className="rounded-lg border bg-background/50 max-h-[80px] overflow-y-auto divide-y divide-border scrollbar-none">
              {todayBirthdays.map((c) => (
                <div key={c.id} className="p-1.5 flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-foreground truncate max-w-[100px]">{c.name}</span>
                  <span className="text-muted-foreground truncate max-w-[120px]">{c.email}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CARD 4: Sleek AI Personalized Bulk Send */}
      <Card className="relative overflow-hidden group border bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-card hover:shadow-lg transition-all duration-300 flex flex-col justify-between hover:scale-[1.01]">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500" />
        <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-tr from-violet-500 to-indigo-500 text-white rounded-lg shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">
                AI Personalized Bulk Send
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Send unique, personalized bulk emails to clients instantly.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px] font-semibold text-muted-foreground/80 bg-muted/30 p-2 rounded-lg border border-border/40 select-none">
            <span className="flex items-center gap-1"><span className="text-violet-500 font-bold">1.</span> Select</span>
            <span className="text-muted-foreground/30">➔</span>
            <span className="flex items-center gap-1"><span className="text-violet-500 font-bold">2.</span> Context</span>
            <span className="text-muted-foreground/30">➔</span>
            <span className="flex items-center gap-1"><span className="text-violet-500 font-bold">3.</span> AI Write</span>
            <span className="text-muted-foreground/30">➔</span>
            <span className="flex items-center gap-1"><span className="text-violet-500 font-bold">4.</span> Send</span>
          </div>

          <Link href="/campaigns/personalized" passHref className="w-full">
            <Button size="sm" className="w-full h-8 text-[10px] font-bold bg-white text-violet-900 border border-violet-200 hover:bg-violet-50 hover:text-violet-950 shadow-sm cursor-pointer">
              ✦ Start Personalized Send <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </>
  )
}
