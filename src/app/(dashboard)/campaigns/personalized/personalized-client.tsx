"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Mail,
  Users,
  AlertTriangle,
  RefreshCw,
  Send,
  Search,
  Filter,
} from "lucide-react"
import { Contact, Tag } from "@prisma/client"
import { generatePersonalizedEmailAction, startPersonalizedDispatchAction } from "@/app/actions/personalized-send"
import { toast } from "sonner"

interface PersonalizedClientProps {
  initialContacts: any[]
  initialTags: any[]
}

type ContactWithTags = Contact & { tags: Tag[] }

interface RecipientState {
  contactId: string
  name: string
  email: string
  note: string
  status: "idle" | "generating" | "success" | "failed"
  generatedHtml?: string
  errorMsg?: string
}

export function PersonalizedClient({ initialContacts, initialTags }: PersonalizedClientProps) {
  const router = useRouter()
  const [step, setStep] = React.useState(1)
  const [contacts] = React.useState<ContactWithTags[]>(initialContacts as ContactWithTags[])
  const [tags] = React.useState<Tag[]>(initialTags as Tag[])

  // Step 1: Recipients filter/search states
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedTag, setSelectedTag] = React.useState("ALL")
  const [selectedContactIds, setSelectedContactIds] = React.useState<Set<string>>(new Set())

  // Step 2: Campaign Configuration & Notes
  const [campaignName, setCampaignName] = React.useState("")
  const [subjectLine, setSubjectLine] = React.useState("")
  const [globalNote, setGlobalNote] = React.useState("")
  const [recipients, setRecipients] = React.useState<RecipientState[]>([])

  // Step 3: Generation progress
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [generationProgress, setGenerationProgress] = React.useState(0)
  const [generationError, setGenerationError] = React.useState<string | null>(null)

  // Step 5: Dispatching
  const [isSending, setIsSending] = React.useState(false)

  // Filter contacts lists based on Step 1 criteria
  const filteredContacts = React.useMemo(() => {
    return contacts.filter(c => {
      const nameMatch = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase().includes(searchQuery.toLowerCase())
      const emailMatch = c.email.toLowerCase().includes(searchQuery.toLowerCase())
      const queryMatch = searchQuery === "" || nameMatch || emailMatch

      if (selectedTag === "ALL") return queryMatch
      const tagMatch = c.tags.some(t => t.name === selectedTag)
      return queryMatch && tagMatch
    })
  }, [contacts, searchQuery, selectedTag])

  // Handle Step 1 Checkbox select toggles
  const handleToggleSelect = (contactId: string) => {
    const next = new Set(selectedContactIds)
    if (next.has(contactId)) {
      next.delete(contactId)
    } else {
      next.add(contactId)
    }
    setSelectedContactIds(next)
  }

  const handleToggleSelectAll = () => {
    const next = new Set<string>()
    if (selectedContactIds.size < filteredContacts.length) {
      filteredContacts.forEach(c => next.add(c.id))
    }
    setSelectedContactIds(next)
  }

  // Set up recipients list when moving to Step 2
  const handleProceedToStep2 = () => {
    if (selectedContactIds.size === 0) {
      toast.error("Please select at least one recipient to proceed.")
      return
    }
    const list: RecipientState[] = Array.from(selectedContactIds).map(id => {
      const c = contacts.find(contact => contact.id === id)!
      return {
        contactId: c.id,
        name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email,
        email: c.email,
        note: "",
        status: "idle"
      }
    })
    setRecipients(list)
    setStep(2)
  }

  // Apply global note to all blank inputs
  const handleApplyGlobalNote = () => {
    setRecipients(prev => prev.map(r => ({
      ...r,
      note: r.note.trim() === "" ? globalNote : r.note
    })))
    toast.success("Applied general note to empty fields.")
  }

  // Handle single note edits
  const handleNoteChange = (contactId: string, text: string) => {
    setRecipients(prev => prev.map(r => r.contactId === contactId ? { ...r, note: text } : r))
  }

  // AI Content Generator loop (Step 3)
  const handleGenerateAI = async () => {
    if (!campaignName.trim() || !subjectLine.trim()) {
      toast.error("Please enter a Campaign Name and Email Subject Line.")
      return
    }

    setStep(3)
    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationError(null)

    // Reset status to idle before run
    setRecipients(prev => prev.map(r => ({ ...r, status: "idle", errorMsg: undefined })))

    let completed = 0
    let hadError = false
    let currentErrorMsg = ""

    for (let i = 0; i < recipients.length; i++) {
      const target = recipients[i]
      
      // Update state to generating
      setRecipients(prev => prev.map(r => r.contactId === target.contactId ? { ...r, status: "generating" } : r))

      try {
        const res = await generatePersonalizedEmailAction({
          contactId: target.contactId,
          contactName: target.name,
          note: target.note,
        })

        if (res.success && res.text) {
          setRecipients(prev => prev.map(r => r.contactId === target.contactId ? { 
            ...r, 
            status: "success", 
            generatedHtml: res.text 
          } : r))
        } else {
          hadError = true
          currentErrorMsg = res.error || "Generation error"
          setRecipients(prev => prev.map(r => r.contactId === target.contactId ? { 
            ...r, 
            status: "failed", 
            errorMsg: currentErrorMsg 
          } : r))
          break // Halt execution loop on rate limit / AI error
        }
      } catch (err: any) {
        hadError = true
        currentErrorMsg = err.message || "An unexpected error occurred"
        setRecipients(prev => prev.map(r => r.contactId === target.contactId ? { 
          ...r, 
          status: "failed", 
          errorMsg: currentErrorMsg 
        } : r))
        break
      }

      completed++
      setGenerationProgress(Math.floor((completed / recipients.length) * 100))
    }

    setIsGenerating(false)
    if (hadError) {
      setGenerationError(currentErrorMsg)
      toast.error(`Generation halted: ${currentErrorMsg}`)
    } else {
      toast.success("Successfully generated personalized messages for everyone!")
      setStep(4)
    }
  }

  // Regenerate single email copy (Step 4)
  const handleRegenerateSingle = async (contactId: string) => {
    const target = recipients.find(r => r.contactId === contactId)!
    setRecipients(prev => prev.map(r => r.contactId === contactId ? { ...r, status: "generating", errorMsg: undefined } : r))

    try {
      const res = await generatePersonalizedEmailAction({
        contactId: target.contactId,
        contactName: target.name,
        note: target.note,
      })

      if (res.success && res.text) {
        setRecipients(prev => prev.map(r => r.contactId === contactId ? { 
          ...r, 
          status: "success", 
          generatedHtml: res.text 
        } : r))
        toast.success(`Regenerated email for ${target.name}`)
      } else {
        setRecipients(prev => prev.map(r => r.contactId === contactId ? { 
          ...r, 
          status: "failed", 
          errorMsg: res.error || "Failed to generate" 
        } : r))
        toast.error(res.error || "Regeneration failed")
      }
    } catch (err: any) {
      setRecipients(prev => prev.map(r => r.contactId === contactId ? { 
        ...r, 
        status: "failed", 
        errorMsg: err.message || "An error occurred" 
      } : r))
      toast.error("Regeneration failed.")
    }
  }

  // Handle manual edits (Step 4)
  const handleHtmlEdit = (contactId: string, updatedHtml: string) => {
    setRecipients(prev => prev.map(r => r.contactId === contactId ? { ...r, generatedHtml: updatedHtml } : r))
  }

  // Submit background campaign (Step 5)
  const handleSendAll = async () => {
    setIsSending(true)
    const toastId = toast.loading("Enqueuing campaign send...")

    // Format for server call
    const payload = recipients.map(r => ({
      contactId: r.contactId,
      email: r.email,
      subject: subjectLine,
      html: r.generatedHtml || ""
    }))

    try {
      const res = await startPersonalizedDispatchAction({
        campaignName,
        subject: subjectLine,
        recipients: payload
      })

      if (res.success) {
        toast.success("Campaign dispatched! Emails will send in the background.", { id: toastId })
        router.push("/campaigns")
      } else {
        toast.error(res.error || "Failed to dispatch email campaign", { id: toastId })
      }
    } catch (err) {
      toast.error("An error occurred during send command.", { id: toastId })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header & Step Tracker */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">AI Personalized Bulk Send</h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            Same occasion, customized personal message for each client written by AI.
          </p>
        </div>

        {/* Wizard step breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/40 border px-3 py-1.5 rounded-lg">
          <span className={step === 1 ? "text-blue-500 font-bold" : ""}>1. Recipients</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className={step === 2 ? "text-blue-500 font-bold" : ""}>2. Context Notes</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className={step === 3 ? "text-blue-500 font-bold" : ""}>3. Generating</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className={step >= 4 ? "text-blue-500 font-bold" : ""}>4. Review & Send</span>
        </div>
      </div>

      {/* STEP 1: RECIPIENTS SELECTION */}
      {step === 1 && (
        <Card className="border shadow-xs">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" /> Step 1: Select Clients
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose the contacts who should receive this personalized email check-in.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="px-3 py-1 text-xs bg-blue-500/10 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-bold">
                {selectedContactIds.size} clients selected
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-2">
            {/* Search and Tag Select bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name or email..."
                  className="pl-9 h-10 text-xs shadow-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="relative w-full sm:w-64">
                <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="pl-9 pr-8 flex h-10 w-full rounded-md border border-input bg-background py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="ALL">All tags</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contacts list table */}
            <div className="border rounded-xl bg-card overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <input
                        type="checkbox"
                        checked={filteredContacts.length > 0 && selectedContactIds.size === filteredContacts.length}
                        onChange={handleToggleSelectAll}
                        className="rounded border-input text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground">Name</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground">Email</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground">Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="text-center py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedContactIds.has(c.id)}
                          onChange={() => handleToggleSelect(c.id)}
                          className="rounded border-input text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                      </TableCell>
                      <TableCell className="font-semibold text-foreground py-2.5">
                        {[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.tags.map((tag) => (
                            <Badge key={tag.id} variant="outline" className="text-[9px] px-1.5 py-0 bg-muted/40 font-medium">
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredContacts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-muted-foreground text-xs">
                        No active contacts matched your search filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-4">
            <Link href="/campaigns" passHref legacyBehavior>
              <Button variant="outline" size="sm" className="h-9 text-xs">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to campaigns
              </Button>
            </Link>
            <Button onClick={handleProceedToStep2} className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium">
              Proceed to Notes <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 2: CAMPAIGN CONFIGURATION & CONTEXT NOTES */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Campaign Details inputs */}
          <Card className="border shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-500" /> Step 2: Configure Campaign Details
              </CardTitle>
              <CardDescription className="text-xs">
                Enter details for tracking and the default subject line sent to all clients.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="campaignName" className="text-xs font-semibold">Campaign Name *</Label>
                  <Input
                    id="campaignName"
                    placeholder="June Market SIP Check-in"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                  <span className="text-[10px] text-muted-foreground">Private name for reporting dashboard.</span>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="subjectLine" className="text-xs font-semibold">Email Subject Line *</Label>
                  <Input
                    id="subjectLine"
                    placeholder="Quick update on your portfolio & current market opportunities"
                    value={subjectLine}
                    onChange={(e) => setSubjectLine(e.target.value)}
                  />
                  <span className="text-[10px] text-muted-foreground">The email subject that recipients see.</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Context Note builder */}
          <Card className="border shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Provide Client Context Notes</CardTitle>
              <CardDescription className="text-xs">
                Add special details or reminders to include in each client's personalized email body.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-2">
              {/* Global Quick-fill note */}
              <div className="bg-slate-50 dark:bg-slate-900 border rounded-xl p-4 space-y-3">
                <Label htmlFor="globalNote" className="text-xs font-bold text-foreground">
                  💡 Apply Same Note to All Blank Fields
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="globalNote"
                    placeholder="e.g. Congratulate them on long term discipline, note current market is ideal for accumulation."
                    value={globalNote}
                    onChange={(e) => setGlobalNote(e.target.value)}
                    className="flex-1 text-xs h-9"
                  />
                  <Button type="button" onClick={handleApplyGlobalNote} variant="secondary" className="text-xs h-9 shrink-0">
                    Apply
                  </Button>
                </div>
                <span className="text-[9px] text-muted-foreground leading-normal block">
                  Useful if you want to apply the same market context but still let AI write individual text with personal names.
                </span>
              </div>

              {/* Rows of clients with notes */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {recipients.map((rec) => (
                  <div key={rec.contactId} className="flex flex-col md:flex-row gap-3 border rounded-xl p-3 bg-card items-start">
                    <div className="md:w-60 space-y-1">
                      <div className="font-bold text-sm text-foreground">{rec.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{rec.email}</div>
                    </div>
                    <div className="flex-1 w-full">
                      <Textarea
                        placeholder="Type personal reminders (e.g. SIP milestone, custom stocks discussed, family check-in) or leave blank for a warm general greeting."
                        value={rec.note}
                        onChange={(e) => handleNoteChange(rec.contactId, e.target.value)}
                        className="text-xs h-16 min-h-[64px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>

            <CardFooter className="flex justify-between border-t pt-4">
              <Button variant="outline" size="sm" onClick={() => setStep(1)} className="h-9 text-xs">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to list
              </Button>
              <Button 
                onClick={handleGenerateAI} 
                className="h-9 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="h-4 w-4" /> Generate Personalized Emails
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* STEP 3: GENERATING AI CONTENT PROGRESS */}
      {step === 3 && (
        <Card className="border shadow-md max-w-lg mx-auto mt-8">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 bg-blue-500/10 text-blue-500 rounded-full w-fit mb-2">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <CardTitle className="text-xl font-extrabold flex items-center justify-center gap-2">
              Generating Personalized Copies
            </CardTitle>
            <CardDescription className="text-xs">
              AI is writing custom emails for each selected client based on your context.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-2">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-foreground">
                <span>Overall Progress</span>
                <span>{generationProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-300 rounded-full" 
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>

            {/* List preview of generation state */}
            <div className="border rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/40 max-h-[220px] overflow-y-auto text-xs space-y-2.5">
              {recipients.map((rec) => {
                const statusBadge = (() => {
                  switch (rec.status) {
                    case "idle": return <Badge variant="secondary" className="text-[9px] px-1 py-0.5">Idle</Badge>
                    case "generating": return <Badge variant="outline" className="text-[9px] px-1 py-0.5 border-blue-200 text-blue-500 bg-blue-50/50 animate-pulse">Generating...</Badge>
                    case "success": return <Badge variant="outline" className="text-[9px] px-1 py-0.5 border-emerald-200 text-emerald-500 bg-emerald-50/50">✔ Done</Badge>
                    case "failed": return <Badge variant="destructive" className="text-[9px] px-1 py-0.5">⚠️ Failed</Badge>
                  }
                })()

                return (
                  <div key={rec.contactId} className="flex justify-between items-center gap-3">
                    <div className="truncate">
                      <span className="font-semibold text-foreground">{rec.name}</span>
                      <span className="text-muted-foreground text-[10px] ml-2">({rec.email})</span>
                    </div>
                    {statusBadge}
                  </div>
                )
              })}
            </div>

            {/* Halt errors summary */}
            {generationError && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg text-xs bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/50 leading-relaxed">
                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold mb-1">AI Limit Reached or Error Occurred</strong>
                  {generationError}
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-end border-t pt-4">
            {!isGenerating && generationError && (
              <Button onClick={() => setStep(4)} className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium">
                Proceed with Completed Rows <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
          </CardFooter>
        </Card>
      )}

      {/* STEP 4: REVIEW & EDIT */}
      {step === 4 && (
        <Card className="border shadow-xs">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Step 4: Review AI Personalized Drafts
                </CardTitle>
                <CardDescription className="text-xs">
                  Inspect and fine-tune each generated message. You can tweak and rewrite content safely here before dispatching.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="px-3 py-1 text-xs bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 font-bold">
                {recipients.filter(r => r.status === "success").length} generated successfully
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-2">
            {/* List of generated text blocks */}
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1">
              {recipients.map((rec) => {
                const isFailed = rec.status === "failed"
                const isRunning = rec.status === "generating"
                
                return (
                  <div 
                    key={rec.contactId} 
                    className={`border rounded-xl p-4 space-y-3 bg-card transition-all ${
                      isFailed ? "border-red-300 dark:border-red-900 bg-red-500/5" : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <span className="font-bold text-sm text-foreground">{rec.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({rec.email})</span>
                      </div>
                      
                      {/* Generation badge status */}
                      <div className="flex items-center gap-2">
                        {isRunning && (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-blue-300 text-blue-500 bg-blue-50/50 animate-pulse font-medium">
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Regenerating...
                          </Badge>
                        )}
                        {rec.status === "success" && (
                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                            AI Generated
                          </Badge>
                        )}
                        {isFailed && (
                          <Badge variant="destructive" className="text-[10px] px-2 py-0.5 font-bold">
                            Generation Failed
                          </Badge>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRegenerateSingle(rec.contactId)} 
                          disabled={isRunning} 
                          className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 rounded-lg p-0"
                          title="Regenerate single copy"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Context reference indicator */}
                    {rec.note.trim() !== "" && (
                      <div className="text-[10px] text-muted-foreground italic bg-muted/30 px-2.5 py-1 rounded-md">
                        Note Context: "{rec.note}"
                      </div>
                    )}

                    {/* AI Quota Fail Banner */}
                    {isFailed && rec.errorMsg && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg text-[10px] text-red-800 bg-red-100/50 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900 leading-normal">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold">AI Quota Exhausted:</strong>
                          {rec.errorMsg}
                        </div>
                      </div>
                    )}

                    {/* Editable preview area */}
                    <div className="grid gap-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Editable Email Body (HTML-safe)</Label>
                      <Textarea
                        value={rec.generatedHtml || `<p>Hi ${rec.name},</p><p>I wanted to send a quick check-in on your investment portfolios. Please let me know if you would like to schedule some time to talk.</p>`}
                        onChange={(e) => handleHtmlEdit(rec.contactId, e.target.value)}
                        disabled={isRunning}
                        className="text-xs font-mono h-24 min-h-[96px] bg-white dark:bg-slate-900/20"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => setStep(2)} className="h-9 text-xs">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Modify context notes
            </Button>
            <Button 
              onClick={handleSendAll} 
              disabled={isSending} 
              className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
            >
              {isSending ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Enqueuing Send...</>
              ) : (
                <><Send className="mr-1.5 h-3.5 w-3.5" /> Send All Personalized Emails</>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
