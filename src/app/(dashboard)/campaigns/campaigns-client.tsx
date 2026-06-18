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
import { Plus, Search, MoreHorizontal, FileEdit, Send, Copy, Pause, Play, Trash2, ArrowUpRight, BarChart, Sparkles } from "lucide-react"
import Link from "next/link"
import { Campaign } from "@prisma/client"
import { createCampaign, deleteCampaign, cloneCampaign, toggleCampaignStatus, sendTestCampaign } from "@/app/actions/campaigns"
import { toast } from "sonner"

interface CampaignsClientProps {
  initialCampaigns: Campaign[]
}

export function CampaignsClient({ initialCampaigns }: CampaignsClientProps) {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>(initialCampaigns)
  const [search, setSearch] = React.useState("")
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isSendTestOpen, setIsSendTestOpen] = React.useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<string | null>(null)
  const [testEmail, setTestEmail] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

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
      if (result.success && result.data) {
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
      if (result.success && result.data) {
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
      if (result.success && result.data) {
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
      if (result.success) {
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

  // Trigger Send Campaign Simulation
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCampaignId || !testEmail) return

    setIsSaving(true)
    try {
      const result = await sendTestCampaign(selectedCampaignId, testEmail)
      if (result.success) {
        toast.success(`Simulation completed! Email sent to ${testEmail} and stats computed.`)
        setIsSendTestOpen(false)
        setTestEmail("")
        setSelectedCampaignId(null)
        
        // Refresh page or list
        window.location.reload()
      } else {
        toast.error(result.error || "Simulation failed.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to send simulation.")
    } finally {
      setIsSaving(false)
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
                  <div className="flex items-center gap-2 self-end md:self-center">
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
                          setIsSendTestOpen(true)
                        }} className="text-xs">
                          <Send className="mr-1.5 h-3.5 w-3.5 text-blue-500" /> Send / Dispatch Campaign
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

      {/* Send Simulation Dialog Modal */}
      <Dialog open={isSendTestOpen} onOpenChange={setIsSendTestOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleSendTest}>
            <DialogHeader className="pb-3 border-b mb-4">
              <DialogTitle className="text-lg font-bold flex items-center gap-1.5">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                Dispatch Email Simulation
              </DialogTitle>
              <DialogDescription className="text-xs">
                Simulate sending this campaign email to your database list. This will compute open/click rates and mark the campaign COMPLETED.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="testEmail" className="text-xs font-semibold">Receive Test Copy Email</Label>
                <Input 
                  id="testEmail" 
                  type="email" 
                  placeholder="tester@yourcompany.com" 
                  value={testEmail} 
                  onChange={(e) => setTestEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <DialogFooter className="mt-6 pt-4 border-t">
              <Button variant="outline" type="button" onClick={() => setIsSendTestOpen(false)} disabled={isSaving} className="text-xs h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white">
                {isSaving ? "Simulating..." : "Trigger Send Simulation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
