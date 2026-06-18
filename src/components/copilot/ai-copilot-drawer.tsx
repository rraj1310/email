"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Loader2, Award, ShieldAlert, BookOpen, MousePointerClick, UserCheck, Check, Copy, ArrowRight, CornerDownLeft } from "lucide-react"
import { generateCampaignContent, auditCampaign } from "@/app/actions/copilot"
import { updateCampaignMetadata, updateCampaignDesign } from "@/app/actions/campaigns"
import { toast } from "sonner"
import { Editor } from "grapesjs"

interface AICopilotDrawerProps {
  campaignId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  editor: Editor | null
  currentSubject?: string
  currentPreview?: string
  onUpdateMetadata?: (subject: string, previewText: string) => void
}

export function AICopilotDrawer({
  campaignId,
  open,
  onOpenChange,
  editor,
  currentSubject = "",
  currentPreview = "",
  onUpdateMetadata,
}: AICopilotDrawerProps) {
  // Writer states
  const [goal, setGoal] = React.useState("")
  const [audience, setAudience] = React.useState("")
  const [brandVoice, setBrandVoice] = React.useState("Professional")
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [generatedData, setGeneratedData] = React.useState<{
    subjectLines: string[]
    previewTexts: string[]
    content: string
    ctaSuggestions: string[]
  } | null>(null)

  // Auditor states
  const [isAuditing, setIsAuditing] = React.useState(false)
  const [auditData, setAuditData] = React.useState<{
    spamScore: number
    readabilityScore: number
    subjectQuality: number
    ctaQuality: number
    personalizationScore: number
    suggestions: string[]
  } | null>(null)

  // Meta apply states
  const [appliedSubject, setAppliedSubject] = React.useState("")
  const [appliedPreview, setAppliedPreview] = React.useState("")

  const handleWriteCampaign = async () => {
    if (!goal || !audience) {
      toast.error("Please fill in both the goal and target audience.")
      return
    }

    setIsGenerating(true)
    setGeneratedData(null)
    try {
      const res = await generateCampaignContent({ goal, audience, brandVoice }) as any
      if (res.success && res.data) {
        setGeneratedData(res.data)
        toast.success("AI copy variations generated successfully!")
      } else {
        toast.error(res.error || "Failed to generate campaign assets.")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to contact generator service.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAuditCampaign = async () => {
    setIsAuditing(true)
    setAuditData(null)
    try {
      // First save current editor code if editor exists
      if (editor) {
        const html = editor.getHtml()
        const css = editor.getCss()
        const fullHtml = `<html><head><style>${css}</style></head><body>${html}</body></html>`
        const projectData = editor.getProjectData()
        
        // Auto-save the template first so the auditor inspects the latest copy
        await updateCampaignDesign(campaignId, fullHtml, JSON.stringify(projectData))
      }

      const res = await auditCampaign(campaignId) as any
      if (res.success && res.data) {
        setAuditData(res.data)
        toast.success("Pre-send copywriting audit complete!")
      } else {
        toast.error(res.error || "Failed to run audit verification.")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to contact audit service.")
    } finally {
      setIsAuditing(false)
    }
  }

  const applySubjectLine = async (subj: string) => {
    try {
      const result = await updateCampaignMetadata(campaignId, subj, appliedPreview || currentPreview)
      if (result.success) {
        setAppliedSubject(subj)
        if (onUpdateMetadata) {
          onUpdateMetadata(subj, appliedPreview || currentPreview)
        }
        toast.success("Subject line updated successfully!")
      } else {
        toast.error(result.error || "Failed to update metadata.")
      }
    } catch (err) {
      toast.error("Failed to update metadata.")
    }
  }

  const applyPreviewText = async (prev: string) => {
    try {
      const result = await updateCampaignMetadata(campaignId, appliedSubject || currentSubject, prev)
      if (result.success) {
        setAppliedPreview(prev)
        if (onUpdateMetadata) {
          onUpdateMetadata(appliedSubject || currentSubject, prev)
        }
        toast.success("Preview text updated successfully!")
      } else {
        toast.error(result.error || "Failed to update metadata.")
      }
    } catch (err) {
      toast.error("Failed to update metadata.")
    }
  }

  const applyTemplateBody = () => {
    if (!editor || !generatedData) return
    try {
      editor.setComponents(generatedData.content)
      toast.success("AI draft loaded into canvas!")
    } catch (err) {
      toast.error("Failed to insert content template.")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard!")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto h-screen flex flex-col p-0 border-l">
        <div className="p-6 border-b shrink-0 bg-muted/10">
          <SheetHeader>
            <SheetTitle className="text-xl font-black flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500 fill-blue-500/20" />
              AI Marketing Copilot
            </SheetTitle>
            <SheetDescription className="text-xs">
              Draft high-converting copy and audit spam deliverability parameters.
            </SheetDescription>
          </SheetHeader>
        </div>

        <Tabs defaultValue="writer" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 border-b shrink-0">
            <TabsList className="grid w-full grid-cols-2 bg-muted/30 p-1 border rounded-md max-w-xs my-2">
              <TabsTrigger value="writer" className="text-xs font-bold py-1.5">Campaign Writer</TabsTrigger>
              <TabsTrigger value="auditor" className="text-xs font-bold py-1.5">Deliverability Auditor</TabsTrigger>
            </TabsList>
          </div>

          {/* CAMPAIGN WRITER CONTENT */}
          <TabsContent value="writer" className="flex-1 p-6 space-y-6 overflow-y-auto mt-0">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Campaign Goal</Label>
                <textarea
                  className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                  placeholder="e.g. Promote our 20% summer sale on organic coffee beans and drive conversions."
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Target Audience</Label>
                <Input
                  className="text-xs"
                  placeholder="e.g. Inactive subscribers, coffee aficionados"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Brand Voice & Tone</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                  value={brandVoice}
                  onChange={(e) => setBrandVoice(e.target.value)}
                >
                  <option value="Professional">Professional (Assertive, corporate)</option>
                  <option value="Friendly">Friendly (Approachable, warm)</option>
                  <option value="Bold">Bold (Vibrant, urgent, high CTR)</option>
                  <option value="Playful">Playful (Humorous, cheeky)</option>
                  <option value="Minimalist">Minimalist (Clean, direct)</option>
                </select>
              </div>

              <Button
                onClick={handleWriteCampaign}
                disabled={isGenerating}
                className="w-full text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Drafting variations...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Generate Campaign Copy
                  </>
                )}
              </Button>
            </div>

            {generatedData && (
              <div className="space-y-6 pt-4 border-t">
                {/* Subject Lines */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    Suggested Subject Lines
                  </h4>
                  <div className="space-y-2">
                    {generatedData.subjectLines.map((subj, idx) => (
                      <div key={idx} className="flex gap-2 items-center justify-between p-2.5 rounded-lg border bg-muted/15 text-xs hover:border-blue-400 group">
                        <span className="font-semibold text-foreground/90 leading-normal flex-1 pr-2">{subj}</span>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => copyToClipboard(subj)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[10px] bg-white text-blue-600 border-blue-100 hover:bg-blue-50 font-bold"
                            onClick={() => applySubjectLine(subj)}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview Texts */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Suggested Preview Texts
                  </h4>
                  <div className="space-y-2">
                    {generatedData.previewTexts.map((prev, idx) => (
                      <div key={idx} className="flex gap-2 items-center justify-between p-2.5 rounded-lg border bg-muted/15 text-xs hover:border-blue-400 group">
                        <span className="text-muted-foreground leading-normal flex-1 pr-2">{prev}</span>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => copyToClipboard(prev)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[10px] bg-white text-blue-600 border-blue-100 hover:bg-blue-50 font-bold"
                            onClick={() => applyPreviewText(prev)}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Email Body Template */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Generated Template Content
                  </h4>
                  <div className="border rounded-lg p-3 bg-muted/20 text-xs font-mono max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {generatedData.content}
                  </div>
                  <Button
                    onClick={applyTemplateBody}
                    disabled={!editor}
                    className="w-full text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    <CornerDownLeft className="mr-1.5 h-3.5 w-3.5" /> Insert into Design Canvas
                  </Button>
                </div>

                {/* CTA suggestions */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    CTA Button Copy Ideas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {generatedData.ctaSuggestions.map((cta, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-xs font-semibold py-1 px-2.5 border-dashed bg-white cursor-pointer hover:bg-muted"
                        onClick={() => copyToClipboard(cta)}
                      >
                        {cta} <Copy className="h-2.5 w-2.5 ml-1.5 inline" />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* DELIVERABILITY AUDITOR CONTENT */}
          <TabsContent value="auditor" className="flex-1 p-6 space-y-6 overflow-y-auto mt-0">
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/40 border">
                The deliverability auditor runs a pre-send checklist checking for high-frequency spam trigger words, subject line character length fatigue, broken or missing action loops, and visual layouts.
              </div>
              <Button
                onClick={handleAuditCampaign}
                disabled={isAuditing}
                className="w-full text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {isAuditing ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Performing pre-send audit...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Audit Campaign Deliverability
                  </>
                )}
              </Button>
            </div>

            {auditData && (
              <div className="space-y-6 pt-4 border-t">
                {/* Metric Scoring Rows */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Audit Quality Breakdown
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Spam score */}
                    <div className="border p-3 rounded-lg bg-muted/15 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase">
                        Spam Safety
                        <Award className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <div className="text-2xl font-black mt-2 text-foreground">{auditData.spamScore}/100</div>
                      <div className="w-full bg-muted h-1 rounded-full mt-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${auditData.spamScore >= 80 ? 'bg-emerald-500' : auditData.spamScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} 
                          style={{ width: `${auditData.spamScore}%` }} 
                        />
                      </div>
                    </div>

                    {/* Readability score */}
                    <div className="border p-3 rounded-lg bg-muted/15 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase">
                        Readability
                        <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <div className="text-2xl font-black mt-2 text-foreground">{auditData.readabilityScore}/100</div>
                      <div className="w-full bg-muted h-1 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-blue-500" 
                          style={{ width: `${auditData.readabilityScore}%` }} 
                        />
                      </div>
                    </div>

                    {/* Subject line quality */}
                    <div className="border p-3 rounded-lg bg-muted/15 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase">
                        Subject Line
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      <div className="text-2xl font-black mt-2 text-foreground">{auditData.subjectQuality}/100</div>
                      <div className="w-full bg-muted h-1 rounded-full mt-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${auditData.subjectQuality >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                          style={{ width: `${auditData.subjectQuality}%` }} 
                        />
                      </div>
                    </div>

                    {/* CTA effectiveness */}
                    <div className="border p-3 rounded-lg bg-muted/15 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase">
                        CTA Strength
                        <MousePointerClick className="h-3.5 w-3.5 text-purple-500" />
                      </div>
                      <div className="text-2xl font-black mt-2 text-foreground">{auditData.ctaQuality}/100</div>
                      <div className="w-full bg-muted h-1 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-purple-500" 
                          style={{ width: `${auditData.ctaQuality}%` }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Personalization score */}
                  <div className="border p-3 rounded-lg bg-muted/15 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                      <UserCheck className="h-4 w-4 text-teal-500" />
                      Personalization Rate
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-foreground">{auditData.personalizationScore}/100</span>
                      <div className="w-24 bg-muted h-2 rounded-full overflow-hidden border">
                        <div className="h-full rounded-full bg-teal-500" style={{ width: `${auditData.personalizationScore}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Suggestions List */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Deliverability suggestions
                  </h4>
                  <div className="space-y-2">
                    {auditData.suggestions.map((sug, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start p-2.5 rounded-lg border bg-amber-500/5 border-amber-500/20 text-xs">
                        <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-foreground/90 font-medium">{sug}</span>
                      </div>
                    ))}
                    {auditData.suggestions.length === 0 && (
                      <div className="flex gap-2.5 items-start p-2.5 rounded-lg border bg-emerald-500/5 border-emerald-500/20 text-xs text-emerald-700">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Everything looks excellent! No deliverability blockades detected.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
