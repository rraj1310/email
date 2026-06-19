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
import { useRouter } from "next/navigation"

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
      promoAttachmentUrl?: string
      promoAttachmentName?: string
    }
  }
  campaigns: any[]
}

export function AutomationsClient({ initialAutomations, birthdaySettings, campaigns }: AutomationsClientProps) {
  const router = useRouter()
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
  const [bdayPromoAttachmentUrl, setBdayPromoAttachmentUrl] = React.useState(birthdaySettings.templateConfig?.promoAttachmentUrl || "")
  const [bdayPromoAttachmentName, setBdayPromoAttachmentName] = React.useState(birthdaySettings.templateConfig?.promoAttachmentName || "")
  const [isUploadingBdayAttachment, setIsUploadingBdayAttachment] = React.useState(false)

  // Sync workflows from props when they update (e.g. after router.refresh())
  React.useEffect(() => {
    setWorkflows(initialAutomations)
  }, [initialAutomations])

  // Sync birthday settings from props
  React.useEffect(() => {
    setBdayEnabled(birthdaySettings.birthdayAutomationEnabled)
    setBdayTime(birthdaySettings.birthdayEmailTime)
    setTodayBirthdays(birthdaySettings.todayBirthdays)
    setBdaySubject(birthdaySettings.templateConfig?.subject || "Happy Birthday! 🎂")
    setBdayBody(birthdaySettings.templateConfig?.bodyText || "Wishing you a wonderful year ahead filled with happiness and success!")
    setBdayBannerUrl(birthdaySettings.templateConfig?.bannerUrl || "")
    setBdayPromoAttachmentUrl(birthdaySettings.templateConfig?.promoAttachmentUrl || "")
    setBdayPromoAttachmentName(birthdaySettings.templateConfig?.promoAttachmentName || "")
  }, [birthdaySettings])

  const handleToggleBday = async (checked: boolean) => {
    setIsUpdatingBday(true)
    try {
      setBdayEnabled(checked)
      const res = await saveSimpleBirthdayMessage(
        bdaySubject, 
        bdayBody, 
        bdayBannerUrl || null, 
        checked, 
        bdayTime,
        bdayPromoAttachmentUrl || null,
        bdayPromoAttachmentName || null
      )
      if ("data" in res && res.data) {
        toast.success(`Birthday emails ${checked ? "activated" : "paused"}.`)
        const updated = res.data
        setWorkflows(prev => prev.some(w => w.id === updated.id) ? prev.map(w => w.id === updated.id ? updated : w) : [updated, ...prev])
        router.refresh()
      } else {
        toast.error(("error" in res ? res.error : null) || "Failed to update state.")
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
      const res = await saveSimpleBirthdayMessage(
        bdaySubject, 
        bdayBody, 
        bdayBannerUrl || null, 
        bdayEnabled, 
        bdayTime,
        bdayPromoAttachmentUrl || null,
        bdayPromoAttachmentName || null
      )
      if ("data" in res && res.data) {
        toast.success("Birthday Settings & Template updated successfully!")
        const updatedRule = res.data
        setWorkflows(prev => prev.some(w => w.id === updatedRule.id) ? prev.map(w => w.id === updatedRule.id ? updatedRule : w) : [updatedRule, ...prev])
        router.refresh()
      } else {
        toast.error(("error" in res ? res.error : null) || "Failed to save settings.")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred while saving configuration.")
    } finally {
      setIsSavingConfig(false)
    }
  }

  const handleBdayAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingBdayAttachment(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (data.success && data.url) {
        setBdayPromoAttachmentUrl(data.url)
        setBdayPromoAttachmentName(file.name)
        toast.success("Attachment file uploaded successfully!")
      } else {
        toast.error(data.error || "Upload failed")
      }
    } catch (err) {
      console.error(err)
      toast.error("Attachment upload failed.")
    } finally {
      setIsUploadingBdayAttachment(false)
    }
  }

  const handleRemoveBdayAttachment = () => {
    setBdayPromoAttachmentUrl("")
    setBdayPromoAttachmentName("")
    toast.success("Attachment removed.")
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
      if ("count" in res) {
        toast.success(`${res.count} birthday email(s) dispatched successfully!`)
      } else {
        toast.error(("error" in res ? res.error : null) || "Failed to trigger birthday check.")
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
      if ("data" in result) {
        toast.success("Workflow created successfully!")
        setWorkflows([result.data, ...workflows])
        setNewWorkflowName("")
        setNewTriggerType("NEW_CONTACT")
        setIsCreateOpen(false)
        router.refresh()
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
      if ("data" in result) {
        toast.success("Workflow state modified.")
        setWorkflows(workflows.map(w => w.id === id ? result.data : w))
        router.refresh()
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
      if (!("error" in result)) {
        toast.success("Workflow deleted successfully.")
        setWorkflows(workflows.filter(w => w.id !== id))
        router.refresh()
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

            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label className="text-xs font-semibold">Promotion Attachment (Optional)</Label>
                <div className="relative h-8 border border-dashed rounded-md flex items-center justify-center text-[10px] text-muted-foreground cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/20 overflow-hidden">
                  <input type="file" onChange={handleBdayAttachmentUpload} disabled={isUploadingBdayAttachment} className="absolute inset-0 opacity-0 cursor-pointer" />
                  {isUploadingBdayAttachment ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Uploading...</> : bdayPromoAttachmentUrl ? "✅ Attached" : <><Upload className="h-3 w-3 mr-1" />Upload File</>}
                </div>
              </div>
              {bdayBannerUrl && (
                <div className="grid gap-1">
                  <Label className="text-xs font-semibold">Banner Actions</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleRemoveBanner} className="h-8 text-[10px] text-destructive hover:bg-destructive/10 cursor-pointer">
                    Remove Banner
                  </Button>
                </div>
              )}
              {bdayPromoAttachmentUrl && !bdayBannerUrl && (
                <div className="grid gap-1">
                  <Label className="text-xs font-semibold">Attachment Actions</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleRemoveBdayAttachment} className="h-8 text-[10px] text-destructive hover:bg-destructive/10 cursor-pointer">
                    Remove File
                  </Button>
                </div>
              )}
              {bdayPromoAttachmentUrl && bdayBannerUrl && (
                <div className="col-span-2 flex items-center justify-between text-[10px] text-emerald-600 bg-emerald-500/10 px-2.5 py-1.5 rounded-md mt-1 font-semibold">
                  <span className="truncate max-w-[200px]">Attached: {bdayPromoAttachmentName}</span>
                  <button type="button" onClick={handleRemoveBdayAttachment} className="text-destructive font-bold hover:underline cursor-pointer">Remove</button>
                </div>
              )}
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

      {/* Workflow Cards — Inline Editing Cards (like Birthday) */}
      {workflows.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Other Automations</p>
          <div className="grid gap-3">
            {workflows.map(item => (
              <AutomationCard
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onUpdated={(updated) => {
                  setWorkflows(prev => prev.map(w => w.id === updated.id ? { ...w, ...updated } : w))
                  router.refresh()
                }}
              />
            ))}
          </div>
        </div>
      )}

      {workflows.length === 0 && (
        <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/10">
          <Workflow className="h-8 w-8 mb-2 opacity-40 text-blue-500 mx-auto" />
          <p className="text-sm font-semibold text-foreground">No other automations yet</p>
          <p className="text-xs mt-1">Click &quot;New Automation&quot; to create one.</p>
        </div>
      )}

      {/* Birthday Email Preview Modal */}
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
          <div className="p-4 bg-slate-100 dark:bg-slate-950 max-h-[360px] overflow-y-auto flex justify-center">
            <div 
              className="w-full max-w-[420px] rounded-xl overflow-hidden shadow text-xs border"
              style={{
                background: bdayBannerUrl 
                  ? `url('${bdayBannerUrl}') no-repeat center/cover` 
                  : 'linear-gradient(135deg, #08120d 0%, #0f3026 100%)',
                minHeight: '260px',
                padding: '20px 15px'
              }}
            >
              <div className="bg-slate-950/90 text-white border border-emerald-500/20 rounded-lg p-5 text-center my-4 space-y-3">
                <div className="text-2xl">🎉</div>
                <h2 className="text-sm font-extrabold text-emerald-400">{bdaySubject || "Happy Birthday!"}</h2>
                <div className="text-slate-200 whitespace-pre-line text-[11px] leading-relaxed" dangerouslySetInnerHTML={{ __html: (bdayBody || "Wishing you a wonderful year ahead!").replace(/\{\{firstName\}\}/g, "John").replace(/\{\{lastName\}\}/g, "Doe").replace(/\{\{email\}\}/g, "john.doe@client.com") }} />
              </div>
              <div className="p-3 text-[9px] text-center text-slate-500 bg-slate-950/95 rounded-md border border-emerald-500/10">© {new Date().getFullYear()} Workspace Automations</div>
              {bdayPromoAttachmentUrl && (
                <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-md px-3 py-1.5 flex items-center justify-between">
                  <span className="truncate max-w-[220px]">📎 {bdayPromoAttachmentName || "Promo Attachment"}</span>
                  <span className="text-[8px] font-bold text-emerald-500/70">ATTACHED</span>
                </div>
              )}
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

// ─── Inline Automation Card (same experience as Birthday card) ───────────────

const triggerConfigMap: Record<string, { emoji: string; label: string; gradientFrom: string; gradientTo: string; colorClass: string; borderClass: string }> = {
  NEW_CONTACT: { emoji: "👋", label: "New contact added", gradientFrom: "from-blue-500/5", gradientTo: "to-cyan-500/5", colorClass: "text-blue-700 dark:text-blue-400", borderClass: "border-blue-200/60 dark:border-blue-900/30" },
  TAG_ADDED: { emoji: "🏷️", label: "Tag added to contact", gradientFrom: "from-violet-500/5", gradientTo: "to-purple-500/5", colorClass: "text-violet-700 dark:text-violet-400", borderClass: "border-violet-200/60 dark:border-violet-900/30" },
  CAMPAIGN_OPENED: { emoji: "📬", label: "Contact opened email", gradientFrom: "from-orange-500/5", gradientTo: "to-red-500/5", colorClass: "text-orange-700 dark:text-orange-400", borderClass: "border-orange-200/60 dark:border-orange-900/30" },
  LINK_CLICKED: { emoji: "🔗", label: "Contact clicked link", gradientFrom: "from-emerald-500/5", gradientTo: "to-teal-500/5", colorClass: "text-emerald-700 dark:text-emerald-400", borderClass: "border-emerald-200/60 dark:border-emerald-900/30" },
  BIRTHDAY: { emoji: "🎂", label: "Contact's birthday", gradientFrom: "from-amber-500/5", gradientTo: "to-pink-500/5", colorClass: "text-amber-700 dark:text-amber-400", borderClass: "border-amber-200/60 dark:border-amber-900/30" },
}

function AutomationCard({ item, onToggle, onDelete, onUpdated }: {
  item: any
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdated: (updated: any) => void
}) {
  const cfg = triggerConfigMap[item.triggerType] || { emoji: "⚡", label: item.triggerType, gradientFrom: "from-blue-500/5", gradientTo: "to-indigo-500/5", colorClass: "text-blue-700 dark:text-blue-400", borderClass: "border-muted/50" }

  const [subject, setSubject] = React.useState(item.templateConfig?.subject || "")
  const [body, setBody] = React.useState(item.templateConfig?.bodyText || "")
  const [bannerUrl, setBannerUrl] = React.useState(item.templateConfig?.bannerUrl || "")
  const [enabled, setEnabled] = React.useState(item.isActive)
  const [sendDate, setSendDate] = React.useState(item.triggerConfig?.sendDate || "")
  const [sendTime, setSendTime] = React.useState(item.triggerConfig?.sendTime || "09:00")
  const [isSaving, setIsSaving] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false)
  const [promoAttachmentUrl, setPromoAttachmentUrl] = React.useState(item.templateConfig?.promoAttachmentUrl || "")
  const [promoAttachmentName, setPromoAttachmentName] = React.useState(item.templateConfig?.promoAttachmentName || "")
  const [isUploadingAttachment, setIsUploadingAttachment] = React.useState(false)

  const hasTemplate = !!item.templateConfig

  React.useEffect(() => {
    setSubject(item.templateConfig?.subject || "")
    setBody(item.templateConfig?.bodyText || "")
    setBannerUrl(item.templateConfig?.bannerUrl || "")
    setEnabled(item.isActive)
    setSendDate(item.triggerConfig?.sendDate || "")
    setSendTime(item.triggerConfig?.sendTime || "09:00")
    setPromoAttachmentUrl(item.templateConfig?.promoAttachmentUrl || "")
    setPromoAttachmentName(item.templateConfig?.promoAttachmentName || "")
  }, [item])

  const handleSave = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and email body are required.")
      return
    }
    setIsSaving(true)
    try {
      const { saveAutomationTemplate } = await import("@/app/actions/automations")
      const res = await saveAutomationTemplate(
        item.id, 
        subject, 
        body, 
        bannerUrl || null, 
        enabled, 
        sendDate || null, 
        sendTime || null,
        promoAttachmentUrl || null,
        promoAttachmentName || null
      )
      if ("data" in res && res.data) {
        toast.success("Automation template saved!")
        onUpdated(res.data)
      } else {
        toast.error(("error" in res ? res.error : null) || "Failed to save.")
      }
    } catch {
      toast.error("Failed to save automation template.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/media/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.success && data.url) {
        setBannerUrl(data.url)
        toast.success("Banner uploaded!")
      } else {
        toast.error(data.error || "Upload failed")
      }
    } catch {
      toast.error("Banner upload failed.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingAttachment(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/media/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.success && data.url) {
        setPromoAttachmentUrl(data.url)
        setPromoAttachmentName(file.name)
        toast.success("Attachment uploaded!")
      } else {
        toast.error(data.error || "Upload failed")
      }
    } catch {
      toast.error("Attachment upload failed.")
    } finally {
      setIsUploadingAttachment(false)
    }
  }

  const handleRemoveAttachment = () => {
    setPromoAttachmentUrl("")
    setPromoAttachmentName("")
    toast.success("Attachment removed.")
  }

  const handleRemoveBanner = () => {
    setBannerUrl("")
    toast.success("Banner removed.")
  }

  const handleToggleEnabled = async (checked: boolean) => {
    setEnabled(checked)
    if (hasTemplate) {
      setIsSaving(true)
      try {
        const { saveAutomationTemplate } = await import("@/app/actions/automations")
        const res = await saveAutomationTemplate(
          item.id, 
          subject, 
          body, 
          bannerUrl || null, 
          checked, 
          sendDate || null, 
          sendTime || null,
          promoAttachmentUrl || null,
          promoAttachmentName || null
        )
        if ("data" in res && res.data) {
          toast.success(`Automation ${checked ? "activated" : "paused"}.`)
          onUpdated(res.data)
        } else {
          toast.error(("error" in res ? res.error : null) || "Failed to update.")
        }
      } catch {
        toast.error("Failed to update status.")
      } finally {
        setIsSaving(false)
      }
    } else {
      onToggle(item.id)
    }
  }


  // No linked template — show simple compact row with fallback controls
  if (!hasTemplate) {
    return (
      <div className="flex items-center justify-between gap-3 border rounded-lg px-4 py-3 bg-card hover:bg-muted/20 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-md shrink-0">
            <Workflow className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
            <p className="text-[10px] text-muted-foreground">{cfg.emoji} {cfg.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={item.isActive ? "default" : "secondary"} className={`text-[9px] font-bold ${item.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-muted-foreground/10 text-muted-foreground"}`}>
            {item.isActive ? "ACTIVE" : "PAUSED"}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => onToggle(item.id)} className="h-7 text-[10px] px-2">
            {item.isActive ? <><Pause className="mr-1 h-3 w-3 text-amber-500" />Pause</> : <><Play className="mr-1 h-3 w-3 text-emerald-500" />Run</>}
          </Button>
          <Link href={`/automations/${item.id}/editor`}>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"><Settings className="h-3.5 w-3.5" /></Button>
          </Link>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => onDelete(item.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  // Has linked template — show rich inline card (like birthday)
  return (
    <>
      <div className={`border rounded-xl bg-gradient-to-r ${cfg.gradientFrom} ${cfg.gradientTo} ${cfg.borderClass} overflow-hidden`}>
        {/* Card Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${cfg.borderClass}`}>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gradient-to-tr from-blue-500 to-indigo-500 text-white rounded-lg shadow-sm">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">{cfg.emoji} {item.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Triggers: {cfg.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
              {enabled ? "● Active" : "○ Paused"}
            </span>
            <Switch checked={enabled} onCheckedChange={handleToggleEnabled} disabled={isSaving} className="data-[state=checked]:bg-emerald-500 scale-90" />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => onDelete(item.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Card Body — Email Settings */}
        <div className="p-4 space-y-3">
          <p className={`text-[10px] font-bold uppercase tracking-wider ${cfg.colorClass} flex items-center gap-1`}>
            <Settings className="h-3 w-3" /> Email Settings
          </p>

          <div className="grid gap-1">
            <Label className="text-xs font-semibold">Subject Line</Label>
            <Input placeholder="Email subject..." value={subject} onChange={(e) => setSubject(e.target.value)} className="h-8 text-xs" />
          </div>

          <div className="grid gap-1">
            <Label className="text-xs font-semibold">Email Message</Label>
            <textarea rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none" placeholder={"Dear {{firstName}}, ..."} value={body} onChange={(e) => setBody(e.target.value)} />
            <p className="text-[9px] text-muted-foreground">Use <code className="bg-muted px-1 rounded">{"{{firstName}}"}</code> to insert client&apos;s name.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <Label className="text-xs font-semibold">Banner Image</Label>
              <div className="relative h-8 border border-dashed rounded-md flex items-center justify-center text-[10px] text-muted-foreground cursor-pointer hover:bg-muted/30 overflow-hidden">
                <input type="file" accept="image/*" onChange={handleBannerUpload} disabled={isUploading} className="absolute inset-0 opacity-0 cursor-pointer" />
                {isUploading ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Uploading...</> : bannerUrl ? "✅ Uploaded" : <><Upload className="h-3 w-3 mr-1" />Upload</>}
              </div>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs font-semibold">Promotion Attachment (Optional)</Label>
              <div className="relative h-8 border border-dashed rounded-md flex items-center justify-center text-[10px] text-muted-foreground cursor-pointer hover:bg-muted/30 overflow-hidden">
                <input type="file" onChange={handleAttachmentUpload} disabled={isUploadingAttachment} className="absolute inset-0 opacity-0 cursor-pointer" />
                {isUploadingAttachment ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Uploading...</> : promoAttachmentUrl ? "✅ Attached" : <><Upload className="h-3 w-3 mr-1" />Upload File</>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <Label className="text-xs font-semibold">Banner Actions</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleRemoveBanner} disabled={!bannerUrl} className="h-8 text-[10px] text-destructive hover:bg-destructive/10 disabled:opacity-50 cursor-pointer">
                Remove Banner
              </Button>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs font-semibold">Attachment Actions</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleRemoveAttachment} disabled={!promoAttachmentUrl} className="h-8 text-[10px] text-destructive hover:bg-destructive/10 disabled:opacity-50 cursor-pointer">
                Remove File
              </Button>
            </div>
          </div>

          {promoAttachmentUrl && (
            <div className="flex items-center justify-between text-[10px] text-emerald-600 bg-emerald-500/10 px-2.5 py-1.5 rounded-md mt-1 font-semibold">
              <span className="truncate max-w-[280px]">Attached: {promoAttachmentName}</span>
              <button type="button" onClick={handleRemoveAttachment} className="text-destructive font-bold hover:underline cursor-pointer">Remove</button>
            </div>
          )}

          <div className="grid gap-1">
            <Label className="text-xs font-semibold">Advanced Designer</Label>
            <Link href={`/automations/${item.id}/editor`}>
              <Button variant="outline" className="h-8 w-full text-[10px] border-muted cursor-pointer">
                <Settings className="h-3 w-3 mr-1" /> Drag & Drop Flow Editor
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="grid gap-1">
              <Label className="text-xs font-semibold">Send Date (Optional)</Label>
              <Input type="date" value={sendDate} onChange={(e) => setSendDate(e.target.value)} className="h-8 text-xs w-full" />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs font-semibold">Send Time</Label>
              <Input type="time" value={sendTime} onChange={(e) => setSendTime(e.target.value)} className="h-8 text-xs w-full" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" onClick={handleSave} disabled={isSaving} className="flex-1 h-8 text-xs bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold cursor-pointer">
              {isSaving ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Saving...</> : <><CheckCircle className="mr-1 h-3 w-3" />Save Settings</>}
            </Button>
            <Button type="button" onClick={() => setIsPreviewOpen(true)} variant="outline" className="h-8 px-3 text-xs cursor-pointer">
              👁️ Preview
            </Button>
          </div>
        </div>
      </div>

      {/* Inline Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-muted/20">
            <DialogTitle className="text-sm font-bold">👁️ Email Preview — {item.name}</DialogTitle>
            <DialogDescription className="text-[10px]">This is what your contacts will receive.</DialogDescription>
          </DialogHeader>
          <div className="px-4 py-2 bg-muted/10 border-b text-xs space-y-1">
            <div className="flex gap-2"><span className="text-muted-foreground w-14 text-right">Subject:</span><span className="font-bold text-primary">{subject || "No subject"}</span></div>
            <div className="flex gap-2"><span className="text-muted-foreground w-14 text-right">To:</span><span>John Doe &lt;john.doe@client.com&gt;</span></div>
          </div>
          <div className="p-4 bg-slate-100 dark:bg-slate-950 max-h-[360px] overflow-y-auto flex justify-center">
            <div 
              className="w-full max-w-[420px] rounded-xl overflow-hidden shadow text-xs border"
              style={{
                background: bannerUrl 
                  ? `url('${bannerUrl}') no-repeat center/cover` 
                  : `linear-gradient(135deg, ${cfg.gradientFrom.includes('emerald') ? '#08120d' : '#030706'} 0%, ${cfg.gradientFrom.includes('emerald') ? '#0f3026' : '#1e1b4b'} 100%)`,
                minHeight: '260px',
                padding: '20px 15px'
              }}
            >
              <div className="bg-slate-950/90 text-white border border-emerald-500/20 rounded-lg p-5 text-center my-4 space-y-3">
                <div className="text-2xl">{cfg.emoji}</div>
                <h2 className="text-sm font-extrabold text-emerald-400">{subject || "Template Subject"}</h2>
                <div className="text-slate-200 whitespace-pre-line text-[11px] leading-relaxed" dangerouslySetInnerHTML={{ __html: (body || "Your email message...").replace(/\{\{firstName\}\}/g, "John").replace(/\{\{lastName\}\}/g, "Doe").replace(/\{\{email\}\}/g, "john.doe@client.com") }} />
              </div>
              <div className="p-3 text-[9px] text-center text-slate-500 bg-slate-950/95 rounded-md border border-emerald-500/10">© {new Date().getFullYear()} Workspace Automations</div>
              {promoAttachmentUrl && (
                <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-md px-3 py-1.5 flex items-center justify-between">
                  <span className="truncate max-w-[220px]">📎 {promoAttachmentName || "Promo Attachment"}</span>
                  <span className="text-[8px] font-bold text-emerald-500/70">ATTACHED</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="p-3 border-t bg-muted/10">
            <Button type="button" onClick={() => setIsPreviewOpen(false)} className="text-xs h-8 cursor-pointer">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
