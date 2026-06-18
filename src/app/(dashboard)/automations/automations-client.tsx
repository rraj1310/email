"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Workflow, Settings, Play, Pause, Trash2, ArrowRight, Clock, Mail, CheckCircle, Loader2, Cake, Sparkles, Upload } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { updateBirthdaySettings, triggerBirthdayCheckNow, saveSimpleBirthdayMessage } from "@/app/actions/birthday"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { AutomationRule } from "@prisma/client"
import { createAutomation, deleteAutomation, toggleAutomationStatus } from "@/app/actions/automations"
import { toast } from "sonner"
import Link from "next/link"

interface AutomationsClientProps {
  initialAutomations: any[]
  birthdaySettings: {
    birthdayAutomationEnabled: boolean
    birthdayEmailTime: string
    todayBirthdays: Array<{ id: string; name: string; email: string }>
    templateConfig?: {
      subject: string
      bodyText: string
      bannerUrl: string
    }
  }
  campaigns: any[]
}

export function AutomationsClient({ initialAutomations, birthdaySettings, campaigns }: AutomationsClientProps) {
  const [workflows, setWorkflows] = React.useState<any[]>(initialAutomations)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  // Form states
  const [newWorkflowName, setNewWorkflowName] = React.useState("")
  const [newTriggerType, setNewTriggerType] = React.useState("NEW_CONTACT")

  // Birthday states
  const [bdayEnabled, setBdayEnabled] = React.useState(birthdaySettings.birthdayAutomationEnabled)
  const [bdayTime, setBdayTime] = React.useState(birthdaySettings.birthdayEmailTime)
  const [todayBirthdays, setTodayBirthdays] = React.useState(birthdaySettings.todayBirthdays)
  const [isUpdatingBday, setIsUpdatingBday] = React.useState(false)
  const [isTriggeringNow, setIsTriggeringNow] = React.useState(false)

  // Simplified custom template states
  const [bdaySubject, setBdaySubject] = React.useState(birthdaySettings.templateConfig?.subject || "Happy Birthday! 🎂")
  const [bdayBody, setBdayBody] = React.useState(birthdaySettings.templateConfig?.bodyText || "Wishing you a wonderful year ahead filled with happiness and success!")
  const [bdayBannerUrl, setBdayBannerUrl] = React.useState(birthdaySettings.templateConfig?.bannerUrl || "")
  const [isUploadingBanner, setIsUploadingBanner] = React.useState(false)
  const [isSavingConfig, setIsSavingConfig] = React.useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false)

  const handleToggleBday = async (checked: boolean) => {
    setIsUpdatingBday(true)
    try {
      setBdayEnabled(checked)
      const res = await saveSimpleBirthdayMessage(bdaySubject, bdayBody, bdayBannerUrl || null, checked, bdayTime)
      if (res.success) {
        toast.success(`Birthday emails ${checked ? "activated" : "paused"}.`)
        if (res.data) {
          const updated = res.data
          setWorkflows(prev => prev.some(w => w.id === updated.id) ? prev.map(w => w.id === updated.id ? updated : w) : [updated, ...prev])
        }
      } else {
        toast.error(res.error || "Failed to update state.")
      }
    } catch (err) {
      toast.error("Failed to update status settings.")
    } finally {
      setIsUpdatingBday(false)
    }
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBdayTime(e.target.value)
  }

  const handleSaveSimpleConfig = async () => {
    if (!bdaySubject.trim() || !bdayBody.trim()) {
      toast.error("Subject and email body are required.")
      return
    }
    setIsSavingConfig(true)
    try {
      const res = await saveSimpleBirthdayMessage(bdaySubject, bdayBody, bdayBannerUrl || null, bdayEnabled, bdayTime)
      if (res.success && res.data) {
        toast.success("Birthday Settings & Template updated successfully!")
        const updatedRule = res.data
        setWorkflows(prev => prev.some(w => w.id === updatedRule.id) ? prev.map(w => w.id === updatedRule.id ? updatedRule : w) : [updatedRule, ...prev])
      } else {
        toast.error(res.error || "Failed to save settings.")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred while saving configuration.")
    } finally {
      setIsSavingConfig(false)
    }
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingBanner(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (data.success && data.url) {
        setBdayBannerUrl(data.url)
        toast.success("Banner image uploaded successfully!")
      } else {
        toast.error(data.error || "Upload failed")
      }
    } catch (err) {
      console.error(err)
      toast.error("Banner upload failed.")
    } finally {
      setIsUploadingBanner(false)
    }
  }

  const handleRemoveBanner = () => {
    setBdayBannerUrl("")
    toast.success("Banner removed.")
  }

  const handleTriggerNow = async () => {
    setIsTriggeringNow(true)
    try {
      const res = await triggerBirthdayCheckNow()
      if (res.success) {
        toast.success(`${res.count} birthday email(s) dispatched successfully!`)
      } else {
        toast.error(res.error || "Failed to trigger birthday check.")
      }
    } catch (err) {
      toast.error("Failed to execute check.")
    } finally {
      setIsTriggeringNow(false)
    }
  }

  // Create Submit
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWorkflowName) return

    setIsSaving(true)
    try {
      const result = await createAutomation(newWorkflowName, newTriggerType)
      if (result.success && result.data) {
        toast.success("Workflow created successfully!")
        setWorkflows([result.data, ...workflows])
        setNewWorkflowName("")
        setNewTriggerType("NEW_CONTACT")
        setIsCreateOpen(false)
      } else {
        toast.error(result.error || "Failed to create workflow.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to create workflow.")
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle Play / Pause
  const handleToggle = async (id: string) => {
    try {
      const result = await toggleAutomationStatus(id)
      if (result.success && result.data) {
        toast.success("Workflow state modified.")
        setWorkflows(workflows.map(w => w.id === id ? result.data : w))
      } else {
        toast.error(result.error || "Failed to update state.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to update state.")
    }
  }

  // Delete Workflow
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this automation workflow?")) return

    try {
      const result = await deleteAutomation(id)
      if (result.success) {
        toast.success("Workflow deleted successfully.")
        setWorkflows(workflows.filter(w => w.id !== id))
      } else {
        toast.error(result.error || "Failed to delete workflow.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete workflow.")
    }
  }

  // Get status value helper
  const getStatus = (rule: any) => {
    return rule.isActive ? "ACTIVE" : "PAUSED"
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Automations</h2>
          <p className="text-muted-foreground text-sm">
            Set up automated emails that send based on triggers (like a birthday greeting or welcome series).
          </p>
        </div>

        {/* Create Automation Dialog Trigger */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer" />}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Automation
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <form onSubmit={handleCreate}>
              <DialogHeader className="pb-3 border-b mb-4">
                <DialogTitle className="text-lg font-bold">New Automation</DialogTitle>
                <DialogDescription className="text-xs">
                  Trigger automated emails based on contact events (e.g. birthday, new signup).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="workflowName" className="text-xs font-semibold">Workflow Name *</Label>
                  <Input 
                    id="workflowName" 
                    placeholder="Welcome series to Leads" 
                    value={newWorkflowName} 
                    onChange={(e) => setNewWorkflowName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="triggerType" className="text-xs font-semibold">Event Trigger</Label>
                  <select 
                    id="triggerType" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={newTriggerType}
                    onChange={(e) => setNewTriggerType(e.target.value)}
                  >
                    <option value="NEW_CONTACT">Contact Created (joins list)</option>
                    <option value="TAG_ADDED">Tag Connected to Contact</option>
                    <option value="CAMPAIGN_OPENED">Campaign Opened by Contact</option>
                    <option value="LINK_CLICKED">Link Clicked inside Email</option>
                    <option value="FORM_SUBMITTED">Form Submitted</option>
                    <option value="BIRTHDAY">🎂 Contact's Birthday</option>
                  </select>
                </div>
              </div>

              <DialogFooter className="mt-6 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)} disabled={isSaving} className="text-xs h-9">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                  {isSaving ? "Creating..." : "Create Automation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Birthday Automation Settings Card */}
      <Card className="border shadow-md bg-gradient-to-tr from-amber-500/5 to-pink-500/5 dark:from-amber-950/10 dark:to-pink-950/10 border-amber-200 dark:border-amber-900/40">
        <CardHeader className="pb-4 border-b border-amber-100 dark:border-amber-900/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-pink-500 text-white rounded-xl shadow-md">
                <Cake className="h-6 w-6 animate-bounce" />
              </div>
              <div>
                <CardTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
                  Birthday Automation
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Automatically send personalized greetings and milestone emails to clients on their special day.
                </CardDescription>
              </div>
            </div>
            
            {/* Status Switch */}
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border px-4 py-2.5 rounded-xl shadow-xs shrink-0 self-start sm:self-auto">
              <div className="text-right">
                <span className="text-xs font-bold text-foreground block">
                  {bdayEnabled ? "Automation Active" : "Automation Paused"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {bdayEnabled ? "Daily checks enabled" : "Toggle to activate"}
                </span>
              </div>
              <Switch 
                checked={bdayEnabled} 
                onCheckedChange={handleToggleBday} 
                disabled={isUpdatingBday} 
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-amber-500 data-[state=checked]:to-pink-500"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6 grid gap-6 md:grid-cols-3">
          {/* Section 1: Setup Birthday Email Form (Plain text + upload image) */}
          <div className="space-y-4 border-r border-amber-100/50 dark:border-amber-900/20 pr-4 last:border-0 md:col-span-1">
            <h4 className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Settings className="h-4 w-4" /> Setup Birthday Email
            </h4>

            {/* Email Subject Input */}
            <div className="grid gap-1.5">
              <Label htmlFor="bdaySubjectInput" className="text-xs font-semibold text-foreground">
                Email Subject Line
              </Label>
              <Input
                id="bdaySubjectInput"
                placeholder="Happy Birthday! 🎂"
                value={bdaySubject}
                onChange={(e) => setBdaySubject(e.target.value)}
                required
              />
            </div>

            {/* Email Banner Upload */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Email Banner Image</span>
                {bdayBannerUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveBanner}
                    className="text-[10px] text-destructive hover:underline font-bold"
                  >
                    Remove banner
                  </button>
                )}
              </Label>

              {bdayBannerUrl ? (
                <div className="relative border rounded-lg overflow-hidden bg-muted/25 flex flex-col gap-1.5 p-1">
                  <img
                    src={bdayBannerUrl}
                    alt="Uploaded Banner"
                    className="w-full h-20 object-cover rounded-md"
                  />
                  <div className="text-[9px] text-muted-foreground truncate px-1 text-center">
                    Image uploaded successfully
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-input rounded-lg p-3 text-center bg-background/50 hover:bg-amber-500/5 transition-colors cursor-pointer relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    disabled={isUploadingBanner}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
                    {isUploadingBanner ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                        <span className="text-[10px]">Uploading to cloud...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 group-hover:text-amber-500 transition-colors" />
                        <span className="text-[10px] font-medium">Click to upload banner image</span>
                        <span className="text-[9px] opacity-75">PNG, JPG or WebP (Cloudinary hosted)</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Email Message Text Box */}
            <div className="grid gap-1.5">
              <Label htmlFor="bdayBodyInput" className="text-xs font-semibold text-foreground">
                Email Message Text
              </Label>
              <textarea
                id="bdayBodyInput"
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none font-sans"
                placeholder="Type your warm birthday greeting here..."
                value={bdayBody}
                onChange={(e) => setBdayBody(e.target.value)}
                required
              />
              <p className="text-[9px] text-muted-foreground leading-normal">
                You can use personalization placeholders like <code className="bg-muted/80 px-1 rounded">{"{{firstName}}"}</code> to print the client's name automatically.
              </p>
            </div>

            {/* Daily Send Time */}
            <div className="grid gap-1.5">
              <Label htmlFor="bdayTime" className="text-xs font-semibold text-foreground">
                Daily Send Time (IST)
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="bdayTime" 
                  type="time" 
                  className="pl-9 h-10 w-full text-sm"
                  value={bdayTime}
                  onChange={handleTimeChange}
                />
              </div>
            </div>

            {/* Save Config Button */}
            <div className="pt-1.5 flex gap-2">
              <Button
                type="button"
                onClick={handleSaveSimpleConfig}
                disabled={isSavingConfig || isUploadingBanner}
                className="flex-1 h-10 text-xs bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white font-bold shadow-md cursor-pointer"
              >
                {isSavingConfig ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Save settings
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                variant="outline"
                className="h-10 px-3 border-amber-200 text-amber-800 hover:bg-amber-50 dark:border-slate-800 dark:text-amber-400 dark:hover:bg-slate-800 font-semibold cursor-pointer"
              >
                👁️ Preview
              </Button>
            </div>

            {/* Trigger Manual Check button */}
            <div className="pt-2 border-t border-amber-100/60 dark:border-amber-900/20">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleTriggerNow} 
                disabled={isTriggeringNow} 
                className="h-9 w-full text-[11px] bg-amber-50/50 hover:bg-amber-100/80 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 dark:border-amber-900 dark:text-amber-400 font-semibold cursor-pointer"
              >
                {isTriggeringNow ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Checking Today's Birthdays...</>
                ) : (
                  <><Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-600" /> Test Run: Check & Send Today</>
                )}
              </Button>
            </div>
          </div>

          
          {/* Section 2: Today's Birthdays Preview */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <h4 className="font-bold text-xs uppercase tracking-wider text-pink-700 dark:text-pink-400 flex items-center gap-1.5">
                Today's Birthdays
                <Badge variant="secondary" className="px-2 py-0 text-[10px] bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400 font-bold">
                  {todayBirthdays.length}
                </Badge>
              </h4>
              <span className="text-[10px] text-muted-foreground">Month/Day matches IST today</span>
            </div>
            
            <div className="border rounded-xl bg-white/70 dark:bg-slate-900/60 p-3 max-h-[160px] overflow-y-auto">
              {todayBirthdays.length > 0 ? (
                <div className="divide-y divide-amber-100/50 dark:divide-slate-800">
                  {todayBirthdays.map((c) => (
                    <div key={c.id} className="py-2 flex items-center justify-between text-xs hover:bg-amber-500/5 dark:hover:bg-pink-500/5 px-2 rounded-md transition-colors">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-amber-400 to-pink-400 flex items-center justify-center text-[9px] text-white font-bold">
                          {c.name[0].toUpperCase()}
                        </div>
                        {c.name}
                      </div>
                      <span className="text-muted-foreground font-mono">{c.email}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-xs leading-normal">
                  🎈 No birthdays scheduled for today.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid listing */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
        {workflows.map(item => {
          const status = getStatus(item)
          
          return (
            <Card key={item.id} className="border shadow-xs hover:shadow-md transition-all duration-300 relative bg-card">
              <CardHeader className="pb-3 border-b">
                <div className="flex justify-between items-start gap-2">
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-md shrink-0">
                    <Workflow className="h-5 w-5" />
                  </div>
                  <Badge variant={status === "ACTIVE" ? "default" : "secondary"} className={`text-[9px] font-bold ${
                    status === "ACTIVE" 
                      ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10" 
                      : "bg-muted-foreground/15 text-muted-foreground"
                  }`}>
                    {status}
                  </Badge>
                </div>
                <CardTitle className="mt-3 text-base font-bold text-foreground truncate">{item.name}</CardTitle>
                <CardDescription className="text-[11px] truncate">
                  Trigger: {item.triggerType}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-4 space-y-4">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 border rounded-md p-2.5 bg-muted/10 text-xs">
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Enrolled</p>
                    <p className="font-extrabold text-sm text-foreground">{item.metrics?.entered || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Completed</p>
                    <p className="font-extrabold text-sm text-foreground">{item.metrics?.completed || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Open Rate</p>
                    <p className="font-extrabold text-sm text-foreground">{Number(item.metrics?.openRate || 0).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Click Rate</p>
                    <p className="font-extrabold text-sm text-foreground">{Number(item.metrics?.clickRate || 0).toFixed(1)}%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>Active: <strong className="text-foreground font-semibold">{item.metrics?.active || 0}</strong></span>
                  <span>Exit Rate: <strong className="text-foreground font-semibold">{Number(item.metrics?.exitRate || 0).toFixed(1)}%</strong></span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs flex-1 border-indigo-200/80 hover:bg-indigo-50 hover:text-indigo-600 dark:border-indigo-900/50 dark:hover:bg-indigo-950/20">
                    <Link href={`/automations/${item.id}/editor`} className="flex items-center justify-center w-full h-full">
                      <Settings className="mr-1 h-3.5 w-3.5" /> Edit Flow
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleToggle(item.id)} className="h-8 text-xs flex-1">
                    {status === "ACTIVE" ? (
                      <>
                        <Pause className="mr-1 h-3.5 w-3.5 text-amber-500" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="mr-1 h-3.5 w-3.5 text-emerald-500" /> Run
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 border-destructive/20 shrink-0"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {workflows.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground text-xs flex flex-col items-center justify-center border border-dashed rounded-lg bg-muted/10 h-64">
            <Workflow className="h-10 w-10 mb-2 opacity-50 text-blue-500" />
            <h3 className="text-md font-semibold text-foreground">No Workflows</h3>
            <p className="text-[11px] max-w-sm mt-1">
              Add auto-responses or drip marketing series triggers.
            </p>
          </div>
        )}
      </div>

      {/* Real-time Email Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-card/95 backdrop-blur-md border shadow-2xl rounded-2xl">
          <DialogHeader className="p-4 border-b bg-muted/20">
            <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>👁️ Real-time Email Preview</span>
            </DialogTitle>
            <DialogDescription className="text-[10px] text-muted-foreground">
              See what your contacts will receive on their birthday.
            </DialogDescription>
          </DialogHeader>

          {/* Simulated Email Client Header */}
          <div className="px-4 py-3 bg-muted/10 border-b text-xs space-y-1.5 font-sans">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold w-12 text-right">From:</span>
              <span className="font-medium text-foreground">Workspace Birthday System &lt;greetings@yourbrand.com&gt;</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold w-12 text-right">To:</span>
              <span className="font-medium text-foreground">John Doe &lt;john.doe@client.com&gt;</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold w-12 text-right">Subject:</span>
              <span className="font-bold text-primary">{bdaySubject || "Happy Birthday!"}</span>
            </div>
          </div>

          {/* Email Body Canvas */}
          <div className="p-6 bg-slate-100 dark:bg-slate-950 max-h-[350px] overflow-y-auto flex justify-center">
            <div className="w-full max-w-[450px] bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-md text-slate-800 dark:text-slate-200 text-xs">
              {/* Banner */}
              {bdayBannerUrl ? (
                <div className="w-full bg-gradient-to-tr from-amber-400 to-pink-400 flex items-center justify-center overflow-hidden">
                  <img
                    src={bdayBannerUrl}
                    alt="Email Banner"
                    className="w-full h-auto max-h-40 object-cover"
                  />
                </div>
              ) : (
                <div className="h-24 bg-gradient-to-tr from-amber-400 to-pink-500 flex items-center justify-center text-white text-3xl">
                  🎂
                </div>
              )}

              {/* Message */}
              <div className="p-6 space-y-4 font-sans leading-relaxed">
                <h2 className="text-base font-extrabold text-slate-950 dark:text-white text-center">
                  Happy Birthday!
                </h2>
                <div 
                  className="whitespace-pre-line text-slate-700 dark:text-slate-300"
                  dangerouslySetInnerHTML={{
                    __html: (bdayBody || "Wishing you a wonderful year ahead!")
                      .replace(/\{\{firstName\}\}/g, "John")
                      .replace(/\{\{lastName\}\}/g, "Doe")
                      .replace(/\{\{email\}\}/g, "john.doe@client.com")
                  }}
                />
                <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center pt-2 border-t">
                  Sent automatically on your special day.
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t text-[9px] text-center text-slate-400 dark:text-slate-500 font-mono">
                © {new Date().getFullYear()} Workspace Automations. All rights reserved.
              </div>
            </div>
          </div>

          <DialogFooter className="p-3 border-t bg-muted/10 flex justify-end">
            <Button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="text-xs h-8 px-4 bg-primary text-primary-foreground font-bold cursor-pointer"
            >
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
