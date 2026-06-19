"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, FileEdit, Send, Copy, Pause, Play, Trash2, BarChart, Sparkles, Eye, Settings, Upload, Loader2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Campaign, Contact } from "@prisma/client"
import { createCampaign, deleteCampaign, cloneCampaign, toggleCampaignStatus, sendTestCampaign, dispatchCampaignAction, saveCampaignTemplateSettings } from "@/app/actions/campaigns"
import { toast } from "sonner"

interface CampaignsClientProps {
  initialCampaigns: Campaign[]
  initialContacts?: Contact[]
}

export function CampaignsClient({ initialCampaigns, initialContacts = [] }: CampaignsClientProps) {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>(initialCampaigns)
  const [contacts] = React.useState<Contact[]>(() => initialContacts.filter(c => c.status === "ACTIVE"))
  const [search, setSearch] = React.useState("")
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isSendTestOpen, setIsSendTestOpen] = React.useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<string | null>(null)
  const [sendMode, setSendMode] = React.useState<"TEST" | "ALL" | "SELECTED">("TEST")
  const [testEmail, setTestEmail] = React.useState("")
  const [selectedContactIds, setSelectedContactIds] = React.useState<string[]>([])
  const [contactSearch, setContactSearch] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  // Edit Template Settings states
  const [isEditSettingsOpen, setIsEditSettingsOpen] = React.useState(false)
  const [editCampaignId, setEditCampaignId] = React.useState<string | null>(null)
  const [editSubject, setEditSubject] = React.useState("")
  const [editPreviewText, setEditPreviewText] = React.useState("")
  const [editBannerUrl, setEditBannerUrl] = React.useState("")
  const [editPromoAttachmentUrl, setEditPromoAttachmentUrl] = React.useState("")
  const [editPromoAttachmentName, setEditPromoAttachmentName] = React.useState("")
  const [isUploadingBanner, setIsUploadingBanner] = React.useState(false)
  const [isUploadingAttachment, setIsUploadingAttachment] = React.useState(false)

  const searchParams = useSearchParams()
  const router = useRouter()

  React.useEffect(() => {
    if (searchParams.get("create") === "true") {
      setIsCreateOpen(true)
      // Clean up search params to avoid opening again on refresh
      const params = new URLSearchParams(searchParams.toString())
      params.delete("create")
      const newQuery = params.toString()
      router.replace(newQuery ? `/campaigns?${newQuery}` : "/campaigns", { scroll: false })
    }
  }, [searchParams, router])

  // Preview modal state
  const [previewCampaign, setPreviewCampaign] = React.useState<Campaign | null>(null)

  // Form states
  const [newCampaignName, setNewCampaignName] = React.useState("")
  const [newSubject, setNewSubject] = React.useState("")
  const [newPreviewText, setNewPreviewText] = React.useState("")

  // Filter campaigns
  const filteredCampaigns = React.useMemo(() => {
    return campaigns.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      (c.subject || "").toLowerCase().includes(search.toLowerCase())
    )
  }, [campaigns, search])

  // Filter contacts for the select list
  const filteredContacts = React.useMemo(() => {
    return contacts.filter(c => 
      c.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
      `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase().includes(contactSearch.toLowerCase())
    )
  }, [contacts, contactSearch])


  // Create Campaign Submit
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCampaignName || !newSubject) {
      toast.error("Name and Subject are required.")
      return
    }

    setIsSaving(true)
    try {
      const result = await createCampaign(newCampaignName, newSubject, newPreviewText)
      if ("data" in result) {
        toast.success("Campaign created! Redirecting to email editor...")
        setCampaigns([result.data, ...campaigns])
        setIsCreateOpen(false)
        
        // Reset fields
        setNewCampaignName("")
        setNewSubject("")
        setNewPreviewText("")
        
        // Redirect to editor
        window.location.href = `/campaigns/${result.data.id}/editor`
      } else {
        toast.error(result.error || "Failed to create campaign.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to create campaign.")
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle Pause/Resume
  const handleToggleStatus = async (id: string) => {
    try {
      const result = await toggleCampaignStatus(id)
      if ("data" in result) {
        toast.success(`Campaign state updated to ${result.data.status}`)
        setCampaigns(campaigns.map(c => c.id === id ? result.data as Campaign : c))
      } else {
        toast.error(result.error || "Failed to change state")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to change state")
    }
  }

  // Clone Campaign
  const handleClone = async (id: string) => {
    try {
      const result = await cloneCampaign(id)
      if ("data" in result) {
        toast.success("Campaign cloned successfully!")
        setCampaigns([result.data, ...campaigns])
      } else {
        toast.error(result.error || "Failed to clone campaign")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to clone campaign")
    }
  }

  // Delete Campaign
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return

    try {
      const result = await deleteCampaign(id)
      if (!("error" in result)) {
        toast.success("Campaign deleted.")
        setCampaigns(campaigns.filter(c => c.id !== id))
      } else {
        toast.error(result.error || "Failed to delete campaign.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete campaign.")
    }
  }

  // Trigger Send Campaign Dispatch
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCampaignId) return
    if (sendMode === "TEST" && !testEmail) {
      toast.error("Please provide a recipient email address.")
      return
    }
    if (sendMode === "SELECTED" && selectedContactIds.length === 0) {
      toast.error("Please select at least one contact.")
      return
    }

    setIsSaving(true)
    try {
      const result = await dispatchCampaignAction({
        campaignId: selectedCampaignId,
        mode: sendMode,
        testEmail: sendMode === "TEST" ? testEmail : undefined,
        selectedContactIds: sendMode === "SELECTED" ? selectedContactIds : undefined,
      })
      if ("sentCount" in result) {
        toast.success(
          sendMode === "TEST"
            ? `Test copy sent successfully to ${testEmail}`
            : `Campaign dispatched successfully to ${result.sentCount} recipients!`
        )
        setIsSendTestOpen(false)
        setTestEmail("")
        setSelectedContactIds([])
        setSelectedCampaignId(null)
        
        // Refresh page or list
        window.location.reload()
      } else {
        toast.error(result.error || "Campaign send failed.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to send campaign.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editCampaignId) return

    setIsSaving(true)
    try {
      const res = await saveCampaignTemplateSettings(
        editCampaignId,
        editSubject,
        editPreviewText,
        editBannerUrl || null,
        editPromoAttachmentUrl || null,
        editPromoAttachmentName || null
      )
      if (res.success && "data" in res) {
        toast.success("Campaign settings updated!")
        setCampaigns(campaigns.map(c => c.id === editCampaignId ? res.data as Campaign : c))
        setIsEditSettingsOpen(false)
        router.refresh()
      } else {
        toast.error(("error" in res ? res.error : null) || "Failed to update campaign settings.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to update campaign settings.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingBanner(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/media/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.success && data.url) {
        setEditBannerUrl(data.url)
        toast.success("Banner cover uploaded!")
      } else {
        toast.error(data.error || "Upload failed")
      }
    } catch {
      toast.error("Banner upload failed.")
    } finally {
      setIsUploadingBanner(false)
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
        setEditPromoAttachmentUrl(data.url)
        setEditPromoAttachmentName(file.name)
        toast.success("Attachment file uploaded!")
      } else {
        toast.error(data.error || "Upload failed")
      }
    } catch {
      toast.error("Attachment upload failed.")
    } finally {
      setIsUploadingAttachment(false)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Campaigns</h2>
          <p className="text-muted-foreground text-sm">
            Create, design, and send email newsletters and promotional campaigns to your contacts.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/campaigns/personalized"} className="h-9 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-950/20 font-medium">
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-indigo-500" />
            AI Personalized Send
          </Button>

          {/* Create Campaign Dialog Trigger */}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger render={<Button className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer" />}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Campaign
            </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <form onSubmit={handleCreate}>
              <DialogHeader className="pb-3 border-b mb-4">
                <DialogTitle className="text-lg font-bold">New Campaign</DialogTitle>
                <DialogDescription className="text-xs">
                  Fill in the details below to create a new email campaign.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold">Campaign Name *</Label>
                  <Input 
                    id="name" 
                    placeholder="October Newsletter" 
                    value={newCampaignName} 
                    onChange={(e) => setNewCampaignName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="subject" className="text-xs font-semibold">Email Subject Line *</Label>
                  <Input 
                    id="subject" 
                    placeholder="Get ready for big savings!" 
                    value={newSubject} 
                    onChange={(e) => setNewSubject(e.target.value)} 
                    required 
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="previewText" className="text-xs font-semibold">Preview Text</Label>
                  <Input 
                    id="previewText" 
                    placeholder="Open this email to reveal your 50% discount code." 
                    value={newPreviewText} 
                    onChange={(e) => setNewPreviewText(e.target.value)} 
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)} disabled={isSaving} className="text-xs h-9">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                  {isSaving ? "Executing..." : "Save & Design Layout"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md w-full">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
          type="search" 
          placeholder="Search campaigns..." 
          className="pl-9 w-full h-10 text-sm shadow-xs" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Campaigns list cards */}
      <div className="grid gap-4 mt-6">
        {filteredCampaigns.map(campaign => {
          const hasMetrics = campaign.sentCount > 0
          const openRateVal = hasMetrics ? ((campaign.openCount / campaign.sentCount) * 100).toFixed(1) : "0"
          const clickRateVal = hasMetrics ? ((campaign.clickCount / campaign.sentCount) * 100).toFixed(1) : "0"

          return (
            <Card key={campaign.id} className="relative overflow-hidden group hover:shadow-md transition-all duration-300 border bg-card hover:scale-[1.005]">
              {/* Colored left strip based on status */}
              <div className={`absolute top-0 left-0 w-[4px] h-full ${
                (campaign.status as any) === "COMPLETED" || (campaign.status as any) === "SENT" ? "bg-emerald-500" :
                (campaign.status as any) === "SCHEDULED" ? "bg-blue-500" :
                (campaign.status as any) === "ACTIVE" ? "bg-indigo-500" :
                (campaign.status as any) === "PAUSED" ? "bg-amber-500" : "bg-muted-foreground/30"
              }`} />

              <CardContent className="p-5 pl-7">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Left Side: Campaign Description */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-lg text-foreground group-hover:text-blue-500 transition-colors">
                        {campaign.name}
                      </h3>
                      <Badge variant={
                        (campaign.status as any) === "COMPLETED" || (campaign.status as any) === "SENT" ? "default" : 
                        (campaign.status as any) === "ACTIVE" ? "default" : 
                        (campaign.status as any) === "SCHEDULED" ? "outline" : 
                        (campaign.status as any) === "PAUSED" ? "destructive" : "secondary"
                      } className={`text-[10px] font-semibold ${
                        (campaign.status as any) === "COMPLETED" || (campaign.status as any) === "SENT" ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10" :
                        (campaign.status as any) === "ACTIVE" ? "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/10" :
                        (campaign.status as any) === "SCHEDULED" ? "bg-blue-500/10 text-blue-500" : ""
                      }`}>
                        {campaign.status}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      Subject: <span className="font-semibold text-foreground/80">{campaign.subject || "No Subject"}</span>
                    </p>

                    {/* Delivery metrics */}
                    <div className="flex gap-4 mt-4 pt-1 text-xs text-muted-foreground border-t md:border-none md:mt-2">
                      <div>Sent: <span className="font-semibold text-foreground">{campaign.sentCount.toLocaleString()}</span></div>
                      <div>Opens: <span className="font-semibold text-foreground">{openRateVal}%</span></div>
                      <div>Clicks: <span className="font-semibold text-foreground">{clickRateVal}%</span></div>
                    </div>
                  </div>
                  
                  {/* Right Side: Options Menu & Direct link */}
                  <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-medium text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-900/50 dark:hover:bg-purple-950/20"
                      onClick={() => setPreviewCampaign(campaign)}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Preview
                    </Button>
                    <Link href={`/campaigns/${campaign.id}/editor`} passHref>
                      <Button variant="outline" size="sm" className="h-8 text-xs font-medium">
                        <FileEdit className="mr-1.5 h-3.5 w-3.5" />
                        Design Editor
                      </Button>
                    </Link>

                    {/* Action Dropdown Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" />}>
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase">Options</DropdownMenuLabel>
                        
                        {/* Simulation Dispatch Trigger */}
                        <DropdownMenuItem onClick={() => {
                          setSelectedCampaignId(campaign.id)
                          setSendMode("TEST")
                          setTestEmail("")
                          setSelectedContactIds([])
                          setContactSearch("")
                          setIsSendTestOpen(true)
                        }} className="text-xs">
                          <Send className="mr-1.5 h-3.5 w-3.5 text-blue-500" /> Send / Dispatch Campaign
                        </DropdownMenuItem>

                        {/* Edit Campaign Details */}
                        <DropdownMenuItem onClick={async () => {
                          const design = campaign.designContent
                            ? (typeof campaign.designContent === "string"
                                ? JSON.parse(campaign.designContent)
                                : campaign.designContent)
                            : {}
                          setEditCampaignId(campaign.id)
                          setEditSubject(campaign.subject || "")
                          setEditPreviewText(campaign.previewText || "")
                          setEditBannerUrl(design.bannerUrl || "")
                          setEditPromoAttachmentUrl(design.promoAttachmentUrl || "")
                          setEditPromoAttachmentName(design.promoAttachmentName || "")
                          setIsEditSettingsOpen(true)
                        }} className="text-xs">
                          <Settings className="mr-1.5 h-3.5 w-3.5" /> Edit Campaign Details
                        </DropdownMenuItem>

                        {/* Toggle states */}
                        {campaign.status === "DRAFT" && (
                          <DropdownMenuItem onClick={() => handleToggleStatus(campaign.id)} className="text-xs">
                            <Play className="mr-1.5 h-3.5 w-3.5" /> Schedule Campaign
                          </DropdownMenuItem>
                        )}
                        {(campaign.status === "SCHEDULED" || campaign.status === "ACTIVE") && (
                          <DropdownMenuItem onClick={() => handleToggleStatus(campaign.id)} className="text-xs">
                            <Pause className="mr-1.5 h-3.5 w-3.5" /> Pause Campaign
                          </DropdownMenuItem>
                        )}
                        {campaign.status === "PAUSED" && (
                          <DropdownMenuItem onClick={() => handleToggleStatus(campaign.id)} className="text-xs">
                            <Play className="mr-1.5 h-3.5 w-3.5" /> Resume Campaign
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem onClick={() => handleClone(campaign.id)} className="text-xs">
                          <Copy className="mr-1.5 h-3.5 w-3.5" /> Clone Campaign
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(campaign.id)} className="text-xs text-destructive hover:bg-destructive/10">
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                </div>
              </CardContent>
            </Card>
          )
        })}

        {filteredCampaigns.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/10 h-64">
            <BarChart className="h-10 w-10 mb-2 opacity-50" />
            <h3 className="text-md font-semibold text-foreground">No Campaigns Found</h3>
            <p className="text-xs max-w-sm mt-1">
              Create a new campaign or modify your search query to list emails.
            </p>
          </div>
        )}
      </div>

      {/* Send Campaign Wizard Dialog Modal */}
      <Dialog open={isSendTestOpen} onOpenChange={setIsSendTestOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <form onSubmit={handleSendTest}>
            <DialogHeader className="pb-3 border-b mb-4">
              <DialogTitle className="text-lg font-bold flex items-center gap-1.5">
                <Sparkles className="h-5 w-5 text-blue-500" />
                Send Campaign
              </DialogTitle>
              <DialogDescription className="text-xs">
                Select your target audience mode and configure the recipients for this email campaign.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Audience Mode Selection Cards */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Target Audience</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSendMode("TEST")}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      sendMode === "TEST"
                        ? "border-blue-600 bg-blue-50/50 text-blue-700 font-semibold shadow-xs"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <div className="text-xs">Test Email</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendMode("ALL")}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      sendMode === "ALL"
                        ? "border-blue-600 bg-blue-50/50 text-blue-700 font-semibold shadow-xs"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <div className="text-xs">All Active ({contacts.length})</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendMode("SELECTED")}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      sendMode === "SELECTED"
                        ? "border-blue-600 bg-blue-50/50 text-blue-700 font-semibold shadow-xs"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <div className="text-xs">Select Contacts</div>
                  </button>
                </div>
              </div>

              {/* Mode Specific Configurations */}
              {sendMode === "TEST" && (
                <div className="grid gap-1.5">
                  <Label htmlFor="testEmail" className="text-xs font-semibold">Receive Test Copy Email</Label>
                  <Input
                    id="testEmail"
                    type="email"
                    placeholder="tester@yourcompany.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
              )}

              {sendMode === "ALL" && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-500 fill-blue-500/10" />
                    Ready to Dispatch
                  </p>
                  <p>This will send the campaign to all <strong>{contacts.length}</strong> active contacts in your database. This action cannot be undone.</p>
                </div>
              )}

              {sendMode === "SELECTED" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      type="text"
                      placeholder="Search active contacts..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedContactIds.length === filteredContacts.length) {
                          setSelectedContactIds([])
                        } else {
                          setSelectedContactIds(filteredContacts.map(c => c.id))
                        }
                      }}
                      className="h-8 text-[10px] px-2"
                    >
                      {selectedContactIds.length === filteredContacts.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>

                  <div className="border rounded-lg max-h-48 overflow-y-auto divide-y bg-card text-xs">
                    {filteredContacts.map(contact => {
                      const isChecked = selectedContactIds.includes(contact.id)
                      return (
                        <label
                          key={contact.id}
                          className="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedContactIds(selectedContactIds.filter(id => id !== contact.id))
                              } else {
                                setSelectedContactIds([...selectedContactIds, contact.id])
                              }
                            }}
                            className="h-3.5 w-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {contact.firstName || contact.lastName
                                ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                                : "Unnamed Contact"}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">{contact.email}</p>
                          </div>
                        </label>
                      )
                    })}
                    {filteredContacts.length === 0 && (
                      <div className="p-4 text-center text-muted-foreground text-xs">
                        No active contacts match your search.
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex justify-between px-1">
                    <span>{selectedContactIds.length} of {filteredContacts.length} contacts selected</span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-6 pt-4 border-t">
              <Button variant="outline" type="button" onClick={() => setIsSendTestOpen(false)} disabled={isSaving} className="text-xs h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white">
                {isSaving ? "Processing..." : sendMode === "TEST" ? "Send Test Copy" : "Dispatch Campaign Now"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== CAMPAIGN PREVIEW MODAL ===== */}
      <Dialog open={!!previewCampaign} onOpenChange={(open) => { if (!open) setPreviewCampaign(null) }}>
        <DialogContent className="max-w-2xl w-full p-0 overflow-hidden">
          {/* Modal Header */}
          <DialogHeader className="px-5 py-3 border-b bg-muted/20">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-500" />
              Email Preview
              {previewCampaign && (
                <span className="text-muted-foreground font-normal text-xs">— {previewCampaign.name}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Simulated email client header */}
          {previewCampaign && (
            <div className="px-5 py-3 bg-muted/10 border-b text-xs space-y-1 font-sans">
              <div className="flex gap-2 items-center">
                <span className="text-muted-foreground font-semibold w-16 text-right shrink-0">Subject:</span>
                <span className="font-bold text-foreground">{previewCampaign.subject || "(No Subject)"}</span>
              </div>
              {previewCampaign.previewText && (
                <div className="flex gap-2 items-center">
                  <span className="text-muted-foreground font-semibold w-16 text-right shrink-0">Preview:</span>
                  <span className="text-muted-foreground italic truncate">{previewCampaign.previewText}</span>
                </div>
              )}
              <div className="flex gap-2 items-center">
                <span className="text-muted-foreground font-semibold w-16 text-right shrink-0">Status:</span>
                <Badge variant="secondary" className="text-[9px] capitalize">{String(previewCampaign.status).toLowerCase()}</Badge>
              </div>
            </div>
          )}

          {/* Email body render */}
          <div className="bg-slate-100 dark:bg-slate-950 max-h-[420px] overflow-y-auto p-4 flex justify-center">
            {previewCampaign?.htmlContent ? (
              <div
                className="w-full max-w-[600px] bg-white dark:bg-slate-900 rounded-xl shadow overflow-hidden border"
                style={{ minHeight: 200 }}
              >
                <iframe
                  srcDoc={previewCampaign.htmlContent}
                  className="w-full"
                  style={{ minHeight: 360, border: "none" }}
                  sandbox="allow-same-origin"
                  title="Email Preview"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
                <FileEdit className="h-10 w-10 opacity-30" />
                <div>
                  <p className="font-semibold text-foreground text-sm">No design saved yet</p>
                  <p className="text-xs mt-1">Open the Design Editor to create your email layout, then save it — the preview will appear here.</p>
                </div>
                {previewCampaign && (
                  <Link href={`/campaigns/${previewCampaign.id}/editor`}>
                    <Button size="sm" className="h-8 text-xs mt-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setPreviewCampaign(null)}>
                      <FileEdit className="mr-1.5 h-3.5 w-3.5" /> Open Design Editor
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="px-5 py-3 border-t bg-muted/10">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setPreviewCampaign(null)}>Close</Button>
            {previewCampaign && (
              <Link href={`/campaigns/${previewCampaign.id}/editor`}>
                <Button size="sm" className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setPreviewCampaign(null)}>
                  <FileEdit className="mr-1.5 h-3.5 w-3.5" /> Edit Design
                </Button>
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Settings Dialog Modal */}
      <Dialog open={isEditSettingsOpen} onOpenChange={setIsEditSettingsOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSaveSettings}>
            <DialogHeader className="pb-3 border-b mb-4">
              <DialogTitle className="text-lg font-bold flex items-center gap-1.5">
                <Settings className="h-5 w-5 text-emerald-500" />
                Edit Campaign Details
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update the campaign settings, cover banner image, and select optional attachments.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="editSubject" className="text-xs font-semibold">Email Subject Line *</Label>
                <Input
                  id="editSubject"
                  placeholder="Subject line..."
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="editPreviewText" className="text-xs font-semibold">Preview Text</Label>
                <Input
                  id="editPreviewText"
                  placeholder="Preview text in inbox..."
                  value={editPreviewText}
                  onChange={(e) => setEditPreviewText(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold">Cover Banner Image</Label>
                  <div className="relative h-9 border border-dashed rounded-md flex items-center justify-center text-[11px] text-muted-foreground cursor-pointer hover:bg-muted/30 overflow-hidden">
                    <input type="file" accept="image/*" onChange={handleBannerUpload} disabled={isUploadingBanner} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {isUploadingBanner ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Uploading...</> : editBannerUrl ? "✅ Cover Uploaded" : <><Upload className="h-3.5 w-3.5 mr-1" />Upload Cover</>}
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold">Optional File Attachment</Label>
                  <div className="relative h-9 border border-dashed rounded-md flex items-center justify-center text-[11px] text-muted-foreground cursor-pointer hover:bg-muted/30 overflow-hidden">
                    <input type="file" onChange={handleAttachmentUpload} disabled={isUploadingAttachment} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {isUploadingAttachment ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Uploading...</> : editPromoAttachmentUrl ? "✅ File Attached" : <><Upload className="h-3.5 w-3.5 mr-1" />Attach File</>}
                  </div>
                </div>
              </div>

              {(editBannerUrl || editPromoAttachmentUrl) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    {editBannerUrl && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditBannerUrl("")} className="w-full h-8 text-[10px] text-destructive hover:bg-destructive/10 cursor-pointer">
                        Remove Cover Banner
                      </Button>
                    )}
                  </div>
                  <div>
                    {editPromoAttachmentUrl && (
                      <Button type="button" variant="outline" size="sm" onClick={() => { setEditPromoAttachmentUrl(""); setEditPromoAttachmentName(""); }} className="w-full h-8 text-[10px] text-destructive hover:bg-destructive/10 cursor-pointer">
                        Remove Attachment
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {editPromoAttachmentUrl && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] rounded-md px-3 py-2 flex items-center justify-between font-semibold">
                  <span className="truncate max-w-[320px]">📎 Attached: {editPromoAttachmentName}</span>
                  <button type="button" onClick={() => { setEditPromoAttachmentUrl(""); setEditPromoAttachmentName(""); }} className="text-destructive hover:underline cursor-pointer">Remove</button>
                </div>
              )}
            </div>

            <DialogFooter className="mt-6 pt-4 border-t">
              <Button variant="outline" type="button" onClick={() => setIsEditSettingsOpen(false)} disabled={isSaving} className="text-xs h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                {isSaving ? "Saving..." : "Save Settings"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
