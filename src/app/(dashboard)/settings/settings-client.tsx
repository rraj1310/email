"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, Save, Globe, Shield, User, Loader2, Trash2, Mail, Plus, Clock, Settings } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { updateOrganizationSettings } from "@/app/actions/settings"
import { getAiDashboardStats } from "@/app/actions/copilot"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  inviteMember,
  getPendingInvites,
  cancelInvite,
  removeMember,
  getWorkspaceMembers,
} from "@/app/actions/workspace"
import { PlanType } from "@/lib/plans"
import {
  getBillingDetails,
  createCheckoutSession,
} from "@/app/actions/billing"

interface SettingsClientProps {
  organization: {
    id: string
    name: string
    logoUrl: string | null
    brandColorPrimary: string | null
    customDomain: string | null
    customEmailFooter: string | null
    aiProvider?: string | null
    aiApiKey?: string | null
    aiModelOverride?: string | null
  }
  users: Array<{
    id: string
    email: string
    name: string
    role: string
    createdAt: Date
  }>
}

export function SettingsClient({ organization, users }: SettingsClientProps) {
  const [isSaving, setIsSaving] = React.useState(false)
  const [orgName, setOrgName] = React.useState(organization.name)
  const [customDomain, setCustomDomain] = React.useState(organization.customDomain || "")
  const [brandColor, setBrandColor] = React.useState(organization.brandColorPrimary || "#0f172a")
  const [emailFooter, setEmailFooter] = React.useState(organization.customEmailFooter || "")

  // AI Configurations
  const [aiProvider, setAiProvider] = React.useState(organization.aiProvider || "GEMINI")
  const [aiApiKey, setAiApiKey] = React.useState(organization.aiApiKey || "")
  const [aiModel, setAiModel] = React.useState(organization.aiModelOverride || "")

  const [aiStats, setAiStats] = React.useState<{
    plan: string
    provider: string
    isCustomKey: boolean
    dailyLimit: string
    todayUsed: number
    todayRemaining: string
    monthlyRequests: number
    monthlyTokens: number
    monthlySpend: number
    apiKeyConfigured: boolean
  } | null>(null)
  const [isLoadingStats, setIsLoadingStats] = React.useState(false)

  // Billing & Subscriptions state
  const [billingDetails, setBillingDetails] = React.useState<any>(null)
  const [isUpdatingSub, setIsUpdatingSub] = React.useState(false)

  const loadBilling = React.useCallback(async () => {
    try {
      const res = await getBillingDetails()
      if (res.success && res.data) {
        setBillingDetails(res.data)
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  const handleUpgrade = async (plan: PlanType) => {
    setIsUpdatingSub(true)
    try {
      const res = await createCheckoutSession(plan)
      if (res.success) {
        toast.success(`Successfully upgraded to the ${plan} plan!`)
        loadBilling()
        window.location.reload()
      } else {
        toast.error(res.error || "Failed to upgrade subscription")
      }
    } catch (err) {
      toast.error("Failed to upgrade subscription")
    } finally {
      setIsUpdatingSub(false)
    }
  }

  const loadAiStats = React.useCallback(async () => {
    setIsLoadingStats(true)
    try {
      const res = await getAiDashboardStats()
      if (res.success && res.data) {
        setAiStats(res.data as any)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingStats(false)
    }
  }, [])

  React.useEffect(() => {
    loadBilling()
    loadAiStats()
  }, [loadBilling, loadAiStats])

  // Team state management
  const [activeUsers, setActiveUsers] = React.useState(users)
  const [invites, setInvites] = React.useState<Array<{
    id: string
    email: string
    role: string
    expiresAt: Date
  }>>([])
  
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState<"OWNER" | "ADMIN" | "EDITOR" | "ANALYST" | "VIEWER">("VIEWER")
  const [isInviting, setIsInviting] = React.useState(false)

  // AI Features states (persisted in localStorage)
  const [aiSubject, setAiSubject] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const sub = localStorage.getItem("setting_ai_subject")
      return sub !== null ? sub === "true" : true
    }
    return true
  })
  const [aiContent, setAiContent] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const con = localStorage.getItem("setting_ai_content")
      return con !== null ? con === "true" : true
    }
    return true
  })
  const [aiSendTimes, setAiSendTimes] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const snd = localStorage.getItem("setting_ai_sendtimes")
      return snd !== null ? snd === "true" : false
    }
    return false
  })

  const loadInvitesAndMembers = React.useCallback(async () => {
    try {
      const invitesRes = await getPendingInvites()
      if (invitesRes.success && invitesRes.data) {
        setInvites(invitesRes.data as any)
      }
      const membersRes = await getWorkspaceMembers()
      if (membersRes.success && membersRes.data) {
        setActiveUsers(membersRes.data as any)
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  React.useEffect(() => {
    loadInvitesAndMembers()
  }, [loadInvitesAndMembers])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return
    setIsInviting(true)
    try {
      const res = await inviteMember(inviteEmail, inviteRole)
      if (res.success) {
        toast.success(`Invitation sent to ${inviteEmail}!`)
        setInviteEmail("")
        loadInvitesAndMembers()
      } else {
        toast.error(res.error || "Failed to invite member")
      }
    } catch (err) {
      toast.error("Failed to send invitation")
    } finally {
      setIsInviting(false)
    }
  }

  const handleCancelInvite = async (id: string) => {
    try {
      const res = await cancelInvite(id)
      if (res.success) {
        toast.success("Invitation cancelled")
        loadInvitesAndMembers()
      } else {
        toast.error(res.error || "Failed to cancel invitation")
      }
    } catch (err) {
      toast.error("Failed to cancel invitation")
    }
  }

  const handleRemoveMember = async (id: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return
    try {
      const res = await removeMember(id)
      if (res.success) {
        toast.success("Team member removed")
        loadInvitesAndMembers()
      } else {
        toast.error(res.error || "Failed to remove member")
      }
    } catch (err) {
      toast.error("Failed to remove member")
    }
  }

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const result = await updateOrganizationSettings({
        name: orgName,
        brandColorPrimary: brandColor,
        customDomain: customDomain,
        customEmailFooter: emailFooter
      })

      if (result.success && result.data) {
        toast.success("Organization settings saved successfully!")
        
        // Sync Organization name with Sidebar via localStorage
        localStorage.setItem("org_name", orgName)
        window.dispatchEvent(new Event("storage"))
      } else {
        toast.error(result.error || "Failed to save settings.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to save settings.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAISettings = async () => {
    setIsSaving(true)
    try {
      const result = await updateOrganizationSettings({
        name: orgName,
        brandColorPrimary: brandColor,
        customDomain: customDomain,
        customEmailFooter: emailFooter,
        aiProvider: aiProvider,
        aiApiKey: aiApiKey,
        aiModelOverride: aiModel
      })

      if (result.success) {
        toast.success("AI configurations and API keys saved successfully.")
        await loadAiStats()
      } else {
        toast.error(result.error || "Failed to save AI settings.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to save AI settings.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Settings</h2>
          <p className="text-muted-foreground text-sm">
            Configure branding domains, manage users list, and toggle AI assistive engines.
          </p>
        </div>
      </div>

      {/* Tabs list with responsive layout */}
      <Tabs defaultValue="whitelabel" className="w-full mt-6">
        <TabsList className="grid w-full grid-cols-4 bg-muted/30 p-1 border rounded-md max-w-lg">
          <TabsTrigger value="whitelabel" className="text-xs font-semibold py-2">Branding</TabsTrigger>
          <TabsTrigger value="users" className="text-xs font-semibold py-2">Team</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs font-semibold py-2">Billing</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs font-semibold py-2">AI engines</TabsTrigger>
        </TabsList>
        
        {/* BRANDING TAB */}
        <TabsContent value="whitelabel" className="mt-4">
          <Card className="max-w-2xl border shadow-xs">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg font-bold">Brand Details</CardTitle>
              <CardDescription className="text-xs">Customize the platform with your own white-label assets.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveBranding}>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-1.5">
                  <Label htmlFor="orgName" className="text-xs font-semibold">Organization Name</Label>
                  <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="customDomain" className="text-xs font-semibold">Custom Tracking Domain</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="customDomain" 
                      placeholder="links.yourdomain.com" 
                      value={customDomain} 
                      onChange={(e) => setCustomDomain(e.target.value)} 
                    />
                    <Button type="button" variant="outline" className="text-xs h-10 px-3">
                      <Globe className="mr-1.5 h-3.5 w-3.5" /> Verify DNS
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Point tracking URLs to CNAME tracker for better deliverability rates.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="brandColor" className="text-xs font-semibold">Brand Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <Input 
                      id="brandColor" 
                      type="color" 
                      className="w-12 h-10 p-1 cursor-pointer border rounded-md shrink-0" 
                      value={brandColor} 
                      onChange={(e) => setBrandColor(e.target.value)} 
                    />
                    <Input 
                      type="text" 
                      className="text-xs" 
                      value={brandColor} 
                      onChange={(e) => setBrandColor(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="emailFooter" className="text-xs font-semibold">Custom Email Footer text</Label>
                  <textarea 
                    id="emailFooter" 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="© Acme Corp. All rights reserved."
                    value={emailFooter}
                    onChange={(e) => setEmailFooter(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Appended at the bottom of GrapesJS dispatches. Include opt-out placeholders.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="border-t p-4 bg-muted/10">
                <Button type="submit" disabled={isSaving} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white ml-auto">
                  {isSaving ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* TEAM USERS TAB */}
        <TabsContent value="users" className="mt-4 space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Invite Form */}
            <Card className="border shadow-xs md:col-span-1 h-fit">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg font-bold">Invite Member</CardTitle>
                <CardDescription className="text-xs">Add new users and configure access roles.</CardDescription>
              </CardHeader>
              <form onSubmit={handleInvite}>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="inviteEmail" className="text-xs font-semibold">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="inviteEmail"
                        type="email"
                        placeholder="collaborator@company.com"
                        className="pl-9 text-xs"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="inviteRole" className="text-xs font-semibold">Role</Label>
                    <select
                      id="inviteRole"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                    >
                      <option value="VIEWER">Viewer (Read-only)</option>
                      <option value="ANALYST">Analyst (View & Export Reports)</option>
                      <option value="EDITOR">Editor (Manage Campaigns & Contacts)</option>
                      <option value="ADMIN">Admin (Full Control, No Billing)</option>
                      <option value="OWNER">Owner (Full Control & Billing)</option>
                    </select>
                  </div>
                </CardContent>
                <CardFooter className="border-t p-4 bg-muted/10">
                  <Button type="submit" disabled={isInviting} className="w-full text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white">
                    {isInviting ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Send Invite
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Members & Invites List */}
            <div className="md:col-span-2 space-y-6">
              {/* Active Members */}
              <Card className="border shadow-xs">
                <CardHeader className="border-b pb-4">
                  <CardTitle className="text-lg font-bold">Active Members</CardTitle>
                  <CardDescription className="text-xs">Users currently assigned to this workspace.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-semibold text-xs text-muted-foreground py-2.5">Name</TableHead>
                        <TableHead className="font-semibold text-xs text-muted-foreground py-2.5">Email</TableHead>
                        <TableHead className="font-semibold text-xs text-muted-foreground py-2.5">Role</TableHead>
                        <TableHead className="font-semibold text-xs text-muted-foreground py-2.5 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-muted/10 text-xs">
                          <TableCell className="font-semibold py-3 flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            {user.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] py-0.5 ${
                              user.role === "OWNER" || user.role === "ADMIN" 
                                ? "border-blue-500 text-blue-500 bg-blue-500/5" 
                                : "border-slate-500 text-slate-500"
                            }`}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                              onClick={() => handleRemoveMember(user.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Pending Invites */}
              {invites.length > 0 && (
                <Card className="border shadow-xs">
                  <CardHeader className="border-b pb-4">
                    <CardTitle className="text-lg font-bold">Pending Invitations</CardTitle>
                    <CardDescription className="text-xs">Invited users who haven&apos;t joined yet.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="font-semibold text-xs text-muted-foreground py-2.5">Email</TableHead>
                          <TableHead className="font-semibold text-xs text-muted-foreground py-2.5">Role</TableHead>
                          <TableHead className="font-semibold text-xs text-muted-foreground py-2.5">Expires</TableHead>
                          <TableHead className="font-semibold text-xs text-muted-foreground py-2.5 text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invites.map((invite) => (
                          <TableRow key={invite.id} className="hover:bg-muted/10 text-xs">
                            <TableCell className="font-semibold py-3 flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {invite.email}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] py-0.5 border-slate-500 text-slate-500">
                                {invite.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(invite.expiresAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                onClick={() => handleCancelInvite(invite.id)}
                              >
                                Revoke
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* BILLING & SUBSCRIPTIONS TAB */}
        <TabsContent value="billing" className="mt-4 space-y-6">
          {billingDetails ? (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Plan Limits & Progress */}
              <div className="md:col-span-1 space-y-6">
                <Card className="border shadow-xs">
                  <CardHeader className="border-b pb-4">
                    <CardTitle className="text-lg font-bold">Active Plan</CardTitle>
                    <CardDescription className="text-xs">Your workspace current subscription.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">Plan:</span>
                      <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-0.5 px-2">
                        {billingDetails.plan}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="capitalize font-semibold text-emerald-600 dark:text-emerald-400">
                        {billingDetails.subscriptionStatus}
                      </span>
                    </div>
                    {billingDetails.currentPeriodEnd && (
                      <div className="flex items-center justify-between border-t pt-3">
                        <span className="text-muted-foreground">Renewal Date:</span>
                        <span className="font-medium text-foreground">
                          {new Date(billingDetails.currentPeriodEnd).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Usage statistics progress bars */}
                <Card className="border shadow-xs">
                  <CardHeader className="border-b pb-4">
                    <CardTitle className="text-lg font-bold">Workspace Usage</CardTitle>
                    <CardDescription className="text-xs">Usage metrics for this billing cycle.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-4 text-xs">
                    {/* Contacts Usage */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between font-semibold">
                        <span>Contacts CRM</span>
                        <span className="text-muted-foreground">
                          {billingDetails.usage.contactsCount.toLocaleString()} / {billingDetails.usage.contactsLimit.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden border">
                        <div 
                          className="bg-blue-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${billingDetails.usage.contactsUsagePercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Email Sends Usage */}
                    <div className="space-y-1.5 border-t pt-4">
                      <div className="flex justify-between font-semibold">
                        <span>Email Sends (Monthly)</span>
                        <span className="text-muted-foreground">
                          {billingDetails.usage.emailsCount.toLocaleString()} / {billingDetails.usage.emailsLimit.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden border">
                        <div 
                          className="bg-purple-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${billingDetails.usage.emailsUsagePercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Team Seats Usage */}
                    <div className="space-y-1.5 border-t pt-4">
                      <div className="flex justify-between font-semibold">
                        <span>Team Seats</span>
                        <span className="text-muted-foreground">
                          {billingDetails.usage.seatsCount.toLocaleString()} / {billingDetails.usage.seatsLimit.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden border">
                        <div 
                          className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${billingDetails.usage.seatsUsagePercent}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tiers Pricing Grid */}
              <div className="md:col-span-2 space-y-6">
                <Card className="border shadow-xs">
                  <CardHeader className="border-b pb-4">
                    <CardTitle className="text-lg font-bold">Subscription Plans</CardTitle>
                    <CardDescription className="text-xs">Choose the plan that fits your business requirements.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Starter */}
                      <Card className={`border p-4 relative ${billingDetails.plan === "STARTER" ? "ring-2 ring-blue-500" : ""}`}>
                        <div className="space-y-2">
                          <h4 className="font-bold text-sm text-foreground">Starter Plan</h4>
                          <p className="text-2xl font-black text-foreground">$29<span className="text-xs font-normal text-muted-foreground"> / month</span></p>
                          <p className="text-[10px] text-muted-foreground">Great for growing creators.</p>
                          <ul className="text-[10px] text-muted-foreground space-y-1 pt-2 border-t">
                            <li>• Up to 5,000 CRM Contacts</li>
                            <li>• 20,000 monthly email sends</li>
                            <li>• Up to 5 team member seats</li>
                            <li>• Standard custom footer & domains</li>
                          </ul>
                          <Button
                            type="button"
                            disabled={isUpdatingSub || billingDetails.plan === "STARTER"}
                            onClick={() => handleUpgrade("STARTER")}
                            className={`w-full mt-4 text-xs h-8 ${
                              billingDetails.plan === "STARTER" 
                                ? "bg-muted text-muted-foreground border cursor-default hover:bg-muted font-bold" 
                                : "bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            }`}
                          >
                            {billingDetails.plan === "STARTER" ? "Current Plan" : "Upgrade to Starter"}
                          </Button>
                        </div>
                      </Card>

                      {/* Pro */}
                      <Card className={`border p-4 relative ${billingDetails.plan === "PRO" ? "ring-2 ring-blue-500" : ""}`}>
                        <div className="absolute top-2 right-2 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                          POPULAR
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-bold text-sm text-foreground">Pro Plan</h4>
                          <p className="text-2xl font-black text-foreground">$99<span className="text-xs font-normal text-muted-foreground"> / month</span></p>
                          <p className="text-[10px] text-muted-foreground">Advanced automation & workflows.</p>
                          <ul className="text-[10px] text-muted-foreground space-y-1 pt-2 border-t">
                            <li>• Up to 25,000 CRM Contacts</li>
                            <li>• 100,000 monthly email sends</li>
                            <li>• Up to 15 team member seats</li>
                            <li>• Drag & Drop Automation Builder</li>
                            <li>• Advanced Funnel Attribution Reports</li>
                          </ul>
                          <Button
                            type="button"
                            disabled={isUpdatingSub || billingDetails.plan === "PRO"}
                            onClick={() => handleUpgrade("PRO")}
                            className={`w-full mt-4 text-xs h-8 ${
                              billingDetails.plan === "PRO" 
                                ? "bg-muted text-muted-foreground border cursor-default hover:bg-muted font-bold" 
                                : "bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            }`}
                          >
                            {billingDetails.plan === "PRO" ? "Current Plan" : "Upgrade to Pro"}
                          </Button>
                        </div>
                      </Card>

                      {/* Enterprise */}
                      <Card className={`border p-4 sm:col-span-2 relative ${billingDetails.plan === "ENTERPRISE" ? "ring-2 ring-blue-500" : ""}`}>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                          <div className="space-y-2 flex-1">
                            <h4 className="font-bold text-sm text-foreground">Enterprise Plan</h4>
                            <p className="text-2xl font-black text-foreground">$299<span className="text-xs font-normal text-muted-foreground"> / month</span></p>
                            <p className="text-[10px] text-muted-foreground">Enterprise scalability, white-labeling and security.</p>
                            <ul className="text-[10px] text-muted-foreground grid sm:grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t">
                              <li>• Up to 1,000,000 CRM Contacts</li>
                              <li>• 10M monthly email sends</li>
                              <li>• Up to 100 team member seats</li>
                              <li>• SAML SSO (Okta & Entra ID)</li>
                              <li>• Full Brand White-labeling</li>
                              <li>• Public Developer APIs</li>
                            </ul>
                          </div>
                          <Button
                            type="button"
                            disabled={isUpdatingSub || billingDetails.plan === "ENTERPRISE"}
                            onClick={() => handleUpgrade("ENTERPRISE")}
                            className={`sm:w-44 shrink-0 self-end sm:self-center text-xs h-8 ${
                              billingDetails.plan === "ENTERPRISE" 
                                ? "bg-muted text-muted-foreground border cursor-default hover:bg-muted font-bold" 
                                : "bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            }`}
                          >
                            {billingDetails.plan === "ENTERPRISE" ? "Current Plan" : "Upgrade to Enterprise"}
                          </Button>
                        </div>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="border p-8 text-center text-xs text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading subscription details...
            </Card>
          )}
        </TabsContent>

        {/* AI TOGGLES TAB */}
        <TabsContent value="ai" className="mt-4 space-y-6">
          {/* AI Usage Dashboard */}
          <Card className="max-w-2xl border shadow-xs">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-1.5">
                <Sparkles className="h-5 w-5 text-blue-500" />
                AI Usage Dashboard
              </CardTitle>
              <CardDescription className="text-xs">
                Track prompt usage, tokens, and estimated cost for the current period.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoadingStats ? (
                <div className="flex justify-center py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading stats...
                </div>
              ) : aiStats ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="border p-3 rounded-lg bg-muted/20">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Today's Used</p>
                    <p className="text-lg font-black mt-1 text-foreground">{aiStats.todayUsed} calls</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Limit: {aiStats.dailyLimit}</p>
                  </div>
                  <div className="border p-3 rounded-lg bg-muted/20">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Month Requests</p>
                    <p className="text-lg font-black mt-1 text-foreground">{aiStats.monthlyRequests}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">This billing cycle</p>
                  </div>
                  <div className="border p-3 rounded-lg bg-muted/20">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Tokens Used</p>
                    <p className="text-lg font-black mt-1 text-foreground">{(aiStats.monthlyTokens / 1000).toFixed(1)}k</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Input & Output</p>
                  </div>
                  <div className="border p-3 rounded-lg bg-muted/20">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Estimated Cost</p>
                    <p className="text-lg font-black mt-1 text-foreground">${aiStats.monthlySpend.toFixed(4)}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Calculated in USD</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  Failed to fetch usage metrics.
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Settings Form */}
          <Card className="max-w-2xl border shadow-xs">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-1.5">
                <Settings className="h-5 w-5 text-blue-500" />
                Copilot API Configuration
              </CardTitle>
              <CardDescription className="text-xs">
                Configure your preferred LLM engine and API key overrides.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 text-sm">
              <div className="grid gap-1.5">
                <Label htmlFor="aiProvider" className="text-xs font-semibold">AI Provider</Label>
                <select 
                  id="aiProvider" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                >
                  <option value="GEMINI">Google Gemini (Recommended default)</option>
                  <option value="OPENAI">OpenAI (GPT-4o / gpt-4o-mini)</option>
                  <option value="ANTHROPIC">Anthropic (Claude 3.5)</option>
                  <option value="AZURE_OPENAI">Azure OpenAI (Enterprise)</option>
                </select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="aiApiKey" className="text-xs font-semibold">Custom API Key (Optional)</Label>
                <Input 
                  id="aiApiKey" 
                  type="password"
                  placeholder={aiApiKey ? "••••••••••••••••••••" : "Enter custom API key to bypass limits"}
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  Leave blank to use platform-managed keys. Enter your own credentials to unlock unlimited quotas.
                </p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="aiModel" className="text-xs font-semibold">Model Override (Optional)</Label>
                <Input 
                  id="aiModel" 
                  placeholder="e.g. gemini-2.5-flash, gpt-4o-mini"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  Bypasses the default model selection assigned to your plan tier.
                </p>
              </div>
            </CardContent>
            <CardFooter className="border-t p-4 bg-muted/10">
              <Button onClick={handleSaveAISettings} disabled={isSaving} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white ml-auto">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-1.5 h-3.5 w-3.5" /> Save AI Configuration
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
