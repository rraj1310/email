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
    <div className="flex-1 space-y-5 p-4 md:p-6 pt-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Automations</h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            Emails that send automatically — set it once, works forever.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer shrink-0" />}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Automation
          </DialogTrigger>
          <DialogContent className="sm:max-w-[380px]">
            <form onSubmit={handleCreate}>
              <DialogHeader className="pb-3 border-b mb-4">
                <DialogTitle className="text-base font-bold">New Automation</DialogTitle>
                <DialogDescription className="text-xs">
                  Pick a trigger — the system sends an email automatically when it fires.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="workflowName" className="text-xs font-semibold">Name *</Label>
                  <Input id="workflowName" placeholder="e.g. Welcome New Client" value={newWorkflowName} onChange={(e) => setNewWorkflowName(e.target.value)} required className="h-9 text-xs" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="triggerType" className="text-xs font-semibold">When should it trigger?</Label>
                  <select id="triggerType" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring" value={newTriggerType} onChange={(e) => setNewTriggerType(e.target.value)}>
                    <option value="NEW_CONTACT">📋 When a new contact is added</option>
                    <option value="TAG_ADDED">🏷️ When a tag is added to a contact</option>
                    <option value="CAMPAIGN_OPENED">📬 When a contact opens an email</option>
                    <option value="LINK_CLICKED">🔗 When a contact clicks a link</option>
                    <option value="BIRTHDAY">🎂 On a contact's birthday</option>
                  </select>
                </div>
              </div>
              <DialogFooter className="mt-5 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)} disabled={isSaving} className="text-xs h-8">Cancel</Button>
                <Button type="submit" disabled={isSaving} className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                  {isSaving ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Birthday Automation — Compact Card */}
      <div className="border rounded-xl bg-gradient-to-r from-amber-500/5 to-pink-500/5 dark:from-amber-950/10 dark:to-pink-950/10 border-amber-200/60 dark:border-amber-900/30 overflow-hidden">
        {/* Card Header Row */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100/60 dark:border-amber-900/20">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gradient-to-tr from-amber-500 to-pink-500 text-white rounded-lg shadow-sm">
              <Cake className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">🎂 Birthday Greeting</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Auto-sends on each contact's birthday</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${bdayEnabled ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
              {bdayEnabled ? "● Active" : "○ Paused"}
            </span>
            <Switch checked={bdayEnabled} onCheckedChange={handleToggleBday} disabled={isUpdatingBday} className="data-[state=checked]:bg-emerald-500 scale-90" />
          </div>
        </div>

        {/* Card Body — 2 columns */}
        <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-amber-100/50 dark:divide-amber-900/20">
          {/* Left: Email Settings */}
          <div className="p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Settings className="h-3 w-3" /> Email Settings
            </p>

            <div className="grid gap-1">
              <Label htmlFor="bdaySubjectInput" className="text-xs font-semibold">Subject Line</Label>
              <Input id="bdaySubjectInput" placeholder="Happy Birthday! 🎂" value={bdaySubject} onChange={(e) => setBdaySubject(e.target.value)} className="h-8 text-xs" />
            </div>

            <div className="grid gap-1">
              <Label htmlFor="bdayBodyInput" className="text-xs font-semibold">Email Message</Label>
              <textarea id="bdayBodyInput" rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none" placeholder="Dear {{firstName}}, wishing you a great birthday!" value={bdayBody} onChange={(e) => setBdayBody(e.target.value)} />
              <p className="text-[9px] text-muted-foreground">Use <code className="bg-muted px-1 rounded">{"{{firstName}}"}</code> to insert the client's name.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label htmlFor="bdayTime" className="text-xs font-semibold">Send Time</Label>
                <div className="relative">
                  <Clock className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input id="bdayTime" type="time" className="pl-7 h-8 text-xs w-full" value={bdayTime} onChange={handleTimeChange} />
                </div>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs font-semibold">Banner Image</Label>
                <div className="relative h-8 border border-dashed rounded-md flex items-center justify-center text-[10px] text-muted-foreground cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/20 overflow-hidden">
                  <input type="file" accept="image/*" onChange={handleBannerUpload} disabled={isUploadingBanner} className="absolute inset-0 opacity-0 cursor-pointer" />
                  {isUploadingBanner ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Uploading...</> : bdayBannerUrl ? "✅ Uploaded" : <><Upload className="h-3 w-3 mr-1" />Upload</>}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" onClick={handleSaveSimpleConfig} disabled={isSavingConfig} className="flex-1 h-8 text-xs bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white font-semibold cursor-pointer">
                {isSavingConfig ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Saving...</> : <><CheckCircle className="mr-1 h-3 w-3" />Save Settings</>}
              </Button>
              <Button type="button" onClick={() => setIsPreviewOpen(true)} variant="outline" className="h-8 px-3 text-xs border-amber-200 cursor-pointer">
                👁️ Preview
              </Button>
              <Button variant="outline" size="sm" onClick={handleTriggerNow} disabled={isTriggeringNow} className="h-8 px-2 text-[10px] border-amber-200 text-amber-800 dark:text-amber-400 cursor-pointer">
                {isTriggeringNow ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          {/* Right: Today's Birthdays */}
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-pink-700 dark:text-pink-400">Today's Birthdays</p>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-pink-500/10 text-pink-600 dark:text-pink-400">
                {todayBirthdays.length}
              </Badge>
            </div>
            <div className="rounded-lg border bg-white/60 dark:bg-slate-900/50 max-h-[180px] overflow-y-auto divide-y divide-amber-50 dark:divide-slate-800">
              {todayBirthdays.length > 0 ? todayBirthdays.map((c) => (
                <div key={c.id} className="px-3 py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-amber-400 to-pink-400 flex items-center justify-center text-[9px] text-white font-bold shrink-0">
                      {c.name[0].toUpperCase()}
                    </div>
                    <span className="font-semibold text-foreground truncate max-w-[100px]">{c.name}</span>
                  </div>
                  <span className="text-muted-foreground text-[10px] truncate max-w-[120px]">{c.email}</span>
                </div>
              )) : (
                <div className="py-8 text-center text-muted-foreground text-[11px]">🎈 No birthdays today</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Cards — Compact List */}
      {workflows.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Other Automations</p>
          <div className="grid gap-2">
            {workflows.map(item => {
              const status = getStatus(item)
              const triggerLabels: Record<string, string> = {
                NEW_CONTACT: "📋 New contact added",
                TAG_ADDED: "🏷️ Tag added to contact",
                CAMPAIGN_OPENED: "📬 Contact opened email",
                LINK_CLICKED: "🔗 Contact clicked link",
                FORM_SUBMITTED: "📝 Form submitted",
                BIRTHDAY: "🎂 Contact's birthday",
                SCHEDULED: "⏰ Scheduled time",
                MANUAL: "✋ Manual trigger",
              }
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 border rounded-lg px-4 py-3 bg-card hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-md shrink-0">
                      <Workflow className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{triggerLabels[item.triggerType] || item.triggerType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={status === "ACTIVE" ? "default" : "secondary"} className={`text-[9px] font-bold ${status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted-foreground/10 text-muted-foreground"}`}>
                      {status}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => handleToggle(item.id)} className="h-7 text-[10px] px-2">
                      {status === "ACTIVE" ? <><Pause className="mr-1 h-3 w-3 text-amber-500" />Pause</> : <><Play className="mr-1 h-3 w-3 text-emerald-500" />Run</>}
                    </Button>
                    <Link href={`/automations/${item.id}/editor`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {workflows.length === 0 && (
        <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/10">
          <Workflow className="h-8 w-8 mb-2 opacity-40 text-blue-500 mx-auto" />
          <p className="text-sm font-semibold text-foreground">No other automations yet</p>
          <p className="text-xs mt-1">Click "New Automation" to create one.</p>
        </div>
      )}

      {/* Email Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-muted/20">
            <DialogTitle className="text-sm font-bold">👁️ Email Preview</DialogTitle>
            <DialogDescription className="text-[10px]">This is what your contacts will receive.</DialogDescription>
          </DialogHeader>
          <div className="px-4 py-2 bg-muted/10 border-b text-xs space-y-1">
            <div className="flex gap-2"><span className="text-muted-foreground w-14 text-right">Subject:</span><span className="font-bold text-primary">{bdaySubject || "Happy Birthday!"}</span></div>
            <div className="flex gap-2"><span className="text-muted-foreground w-14 text-right">To:</span><span>John Doe &lt;john.doe@client.com&gt;</span></div>
          </div>
          <div className="p-4 bg-slate-100 dark:bg-slate-950 max-h-[320px] overflow-y-auto flex justify-center">
            <div className="w-full max-w-[420px] bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow text-xs">
              {bdayBannerUrl ? (
                <img src={bdayBannerUrl} alt="Banner" className="w-full h-32 object-cover" />
              ) : (
                <div className="h-20 bg-gradient-to-tr from-amber-400 to-pink-500 flex items-center justify-center text-white text-2xl">🎂</div>
              )}
              <div className="p-5 space-y-3 font-sans leading-relaxed">
                <h2 className="text-sm font-extrabold text-center">Happy Birthday!</h2>
                <div className="text-slate-700 dark:text-slate-300 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: (bdayBody || "Wishing you a wonderful year ahead!").replace(/\{\{firstName\}\}/g, "John").replace(/\{\{lastName\}\}/g, "Doe").replace(/\{\{email\}\}/g, "john.doe@client.com") }} />
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t text-[9px] text-center text-slate-400">© {new Date().getFullYear()} Your Workspace</div>
            </div>
          </div>
          <DialogFooter className="p-3 border-t bg-muted/10">
            <Button type="button" onClick={() => setIsPreviewOpen(false)} className="text-xs h-8 cursor-pointer">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
