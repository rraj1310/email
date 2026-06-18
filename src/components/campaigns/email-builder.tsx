"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, Send, Loader2, Sparkles, Upload, Eye, EyeOff, Palette } from "lucide-react"
import Link from "next/link"
import { getCampaignById, updateCampaignDesign, sendTestCampaign } from "@/app/actions/campaigns"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────
interface EmailBuilderProps {
  campaignId: string
}

interface EmailContent {
  templateId: string
  accentColor: string
  bannerUrl: string
  heading: string
  subheading: string
  bodyText: string
  buttonText: string
  buttonUrl: string
  footerText: string
  showButton: boolean
  showBanner: boolean
}

// ───────────────────────────────────────────────
// Templates
// ───────────────────────────────────────────────
const TEMPLATES = [
  {
    id: "greeting",
    name: "🌟 Greeting",
    desc: "Birthday, festive, or milestone email",
    defaults: {
      heading: "Happy Birthday! 🎂",
      subheading: "Wishing you a wonderful day",
      bodyText: "Dear {{firstName}},\n\nOn behalf of our entire team, we want to wish you a very happy birthday! You are a valued client and we appreciate your trust in us.\n\nMay this year bring you great health, happiness, and success in all your investments.\n\nWarm regards,\nThe Team",
      buttonText: "View Your Portfolio",
      buttonUrl: "#",
      footerText: "© 2025 Your Company. You are receiving this because you are our valued client.",
      accentColor: "#f59e0b",
    }
  },
  {
    id: "newsletter",
    name: "📰 Newsletter",
    desc: "Market updates, news, announcements",
    defaults: {
      heading: "Market Update — June 2025",
      subheading: "Your monthly financial newsletter",
      bodyText: "Dear {{firstName}},\n\nHere is your latest market update for this month.\n\nThe markets have shown steady growth across major sectors. We recommend reviewing your portfolio allocation in light of recent developments.\n\nKey highlights:\n• Nifty 50 up 2.4% this month\n• Gold prices remain stable\n• Mutual fund SIPs performing well\n\nFeel free to reach out if you have any questions.\n\nBest regards,\nYour Advisor",
      buttonText: "Read Full Report",
      buttonUrl: "#",
      footerText: "© 2025 Your Company. Unsubscribe anytime.",
      accentColor: "#3b82f6",
    }
  },
  {
    id: "custom",
    name: "✉️ Custom",
    desc: "Write your own email from scratch",
    defaults: {
      heading: "Your Message Subject",
      subheading: "A short line that appears below the heading",
      bodyText: "Dear {{firstName}},\n\nWrite your email message here. You can use {{firstName}} to automatically insert the client's first name.\n\nBest regards,\nYour Name",
      buttonText: "Click Here",
      buttonUrl: "#",
      footerText: "© 2025 Your Company.",
      accentColor: "#6366f1",
    }
  },
]

// ───────────────────────────────────────────────
// HTML Generator
// ───────────────────────────────────────────────
function generateHtml(content: EmailContent): string {
  const bodyLines = content.bodyText.replace(/\n/g, "<br/>")
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  body { margin:0; padding:0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background:#f4f4f5; }
  .wrapper { max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
  .banner { width:100%; height:200px; object-fit:cover; display:block; }
  .banner-placeholder { height:180px; background:linear-gradient(135deg, ${content.accentColor}dd, ${content.accentColor}66); display:flex; align-items:center; justify-content:center; font-size:48px; }
  .header { background:${content.accentColor}; padding:32px 40px 24px; }
  .header h1 { margin:0; font-size:26px; font-weight:800; color:#ffffff; line-height:1.2; }
  .header p { margin:8px 0 0; font-size:14px; color:rgba(255,255,255,0.85); }
  .body { padding:32px 40px; }
  .body-text { font-size:15px; line-height:1.75; color:#374151; white-space:pre-line; }
  .btn-wrap { text-align:center; margin:28px 0 8px; }
  .btn { display:inline-block; background:${content.accentColor}; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:8px; font-weight:700; font-size:15px; letter-spacing:0.3px; }
  .footer { background:#f9fafb; border-top:1px solid #e5e7eb; padding:20px 40px; text-align:center; font-size:11px; color:#9ca3af; line-height:1.6; }
</style>
</head>
<body>
<div style="padding:20px 0; background:#f4f4f5;">
<div class="wrapper">
  ${content.showBanner && content.bannerUrl
    ? `<img src="${content.bannerUrl}" alt="Email Banner" class="banner"/>`
    : content.showBanner
      ? `<div class="banner-placeholder">📧</div>`
      : ""}
  <div class="header">
    <h1>${content.heading}</h1>
    ${content.subheading ? `<p>${content.subheading}</p>` : ""}
  </div>
  <div class="body">
    <div class="body-text">${bodyLines}</div>
    ${content.showButton && content.buttonText
      ? `<div class="btn-wrap"><a href="${content.buttonUrl || "#"}" class="btn">${content.buttonText}</a></div>`
      : ""}
  </div>
  <div class="footer">${content.footerText}</div>
</div>
</div>
</body>
</html>`
}

// ───────────────────────────────────────────────
// Main Component
// ───────────────────────────────────────────────
export function EmailBuilder({ campaignId }: EmailBuilderProps) {
  const [campaignName, setCampaignName] = React.useState("Loading...")
  const [campaignSubject, setCampaignSubject] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isSendOpen, setIsSendOpen] = React.useState(false)
  const [testEmail, setTestEmail] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = React.useState(false)
  const [showPreview, setShowPreview] = React.useState(true)

  // Template step
  const [step, setStep] = React.useState<"pick" | "edit">("pick")

  // Email content
  const [content, setContent] = React.useState<EmailContent>({
    templateId: "greeting",
    accentColor: "#f59e0b",
    bannerUrl: "",
    heading: "",
    subheading: "",
    bodyText: "",
    buttonText: "",
    buttonUrl: "#",
    footerText: "© 2025 Your Company.",
    showButton: true,
    showBanner: true,
  })

  // Load campaign
  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await getCampaignById(campaignId)
        if (res.success && res.data) {
          setCampaignName(res.data.name)
          setCampaignSubject(res.data.subject || "")
          // If campaign has existing design, load it
          if (res.data.designContent) {
            try {
              const saved = JSON.parse(res.data.designContent as string)
              if (saved.__builder === "simple") {
                setContent(saved.content)
                setStep("edit")
              }
            } catch {}
          }
        }
      } catch (err) {
        toast.error("Failed to load campaign")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [campaignId])

  const patch = (updates: Partial<EmailContent>) => {
    setContent(prev => ({ ...prev, ...updates }))
  }

  const pickTemplate = (t: typeof TEMPLATES[0]) => {
    patch({ templateId: t.id, ...t.defaults })
    setStep("edit")
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingBanner(true)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("/api/media/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.url) {
        patch({ bannerUrl: data.url })
        toast.success("Banner uploaded!")
      } else {
        toast.error("Upload failed")
      }
    } catch {
      toast.error("Upload failed")
    } finally {
      setIsUploadingBanner(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const html = generateHtml(content)
      const designContent = JSON.stringify({ __builder: "simple", content })
      const res = await updateCampaignDesign(campaignId, html, designContent)
      if (res.success) {
        toast.success("Draft saved! ✅")
      } else {
        toast.error(res.error || "Failed to save")
      }
    } catch {
      toast.error("Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testEmail) return
    setIsSending(true)
    try {
      // Auto-save first
      const html = generateHtml(content)
      const designContent = JSON.stringify({ __builder: "simple", content })
      await updateCampaignDesign(campaignId, html, designContent)

      const res = await sendTestCampaign(campaignId, testEmail)
      if (res.success) {
        toast.success(`Campaign sent! Check ${testEmail}`)
        setIsSendOpen(false)
        setTestEmail("")
        window.location.href = "/campaigns"
      } else {
        toast.error(res.error || "Send failed")
      }
    } catch {
      toast.error("Send failed")
    } finally {
      setIsSending(false)
    }
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
        <span className="text-sm text-muted-foreground">Loading email builder...</span>
      </div>
    )
  }

  // ── Step 1: Pick Template ──
  if (step === "pick") {
    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b px-4 shrink-0 bg-background z-20">
          <div className="flex items-center gap-3">
            <Link href="/campaigns">
              <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div>
              <span className="text-sm font-bold">{campaignName}</span>
              <span className="block text-[10px] text-muted-foreground uppercase tracking-wider">Choose a Template</span>
            </div>
          </div>
        </header>

        {/* Template Picker */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-muted/10">
          <div className="max-w-2xl w-full">
            <h2 className="text-2xl font-extrabold text-center mb-2">Choose a starting template</h2>
            <p className="text-muted-foreground text-sm text-center mb-8">Pick the one that best matches your email — you can edit everything after.</p>

            <div className="grid gap-4 sm:grid-cols-3">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => pickTemplate(t)}
                  className="group relative border-2 border-border hover:border-blue-500 bg-card rounded-xl p-5 text-left transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                >
                  <div className="text-2xl mb-3">{t.name.split(" ")[0]}</div>
                  <p className="font-bold text-sm text-foreground">{t.name.replace(/^[^ ]+ /, "")}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.desc}</p>
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">Select →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2: Edit & Preview ──
  const previewHtml = generateHtml(content)

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* ── Toolbar ── */}
      <header className="flex h-14 items-center justify-between border-b px-4 shrink-0 bg-background z-20 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="min-w-0">
            <span className="text-sm font-bold block truncate max-w-[180px] sm:max-w-[320px]">{campaignName}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Email Builder</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setStep("pick")} className="h-8 text-xs text-muted-foreground hidden sm:flex">
            Change Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPreview(p => !p)} className="h-8 text-xs hidden sm:flex">
            {showPreview ? <><EyeOff className="mr-1 h-3.5 w-3.5" />Hide Preview</> : <><Eye className="mr-1 h-3.5 w-3.5" />Show Preview</>}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving} className="h-8 text-xs">
            {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save Draft
          </Button>
          <Button size="sm" onClick={() => setIsSendOpen(true)} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
            <Send className="mr-1.5 h-3.5 w-3.5" /> Send
          </Button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: Editor Panel */}
        <div className="w-full sm:w-[360px] shrink-0 border-r overflow-y-auto bg-background p-4 space-y-5">

          {/* Accent Color */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Palette className="h-3.5 w-3.5" /> Theme Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={content.accentColor}
                onChange={e => patch({ accentColor: e.target.value })}
                className="w-10 h-10 rounded-md border cursor-pointer p-0.5"
              />
              <div className="flex gap-2 flex-wrap">
                {["#f59e0b","#3b82f6","#10b981","#8b5cf6","#ef4444","#0f172a"].map(c => (
                  <button
                    key={c}
                    onClick={() => patch({ accentColor: c })}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${content.accentColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Banner */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Banner Image</Label>
              <label className="flex items-center gap-1 text-[10px] cursor-pointer text-muted-foreground">
                <input type="checkbox" checked={content.showBanner} onChange={e => patch({ showBanner: e.target.checked })} className="h-3 w-3" />
                Show banner
              </label>
            </div>
            {content.showBanner && (
              <div className="relative border border-dashed rounded-lg overflow-hidden bg-muted/10 hover:bg-muted/20 transition-colors">
                {content.bannerUrl ? (
                  <div className="relative">
                    <img src={content.bannerUrl} alt="Banner" className="w-full h-24 object-cover" />
                    <button onClick={() => patch({ bannerUrl: "" })} className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">Remove</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1 py-4 text-muted-foreground cursor-pointer text-xs">
                    <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" disabled={isUploadingBanner} />
                    {isUploadingBanner ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Uploading...</span></> : <><Upload className="h-4 w-4" /><span className="font-medium">Upload banner image</span><span className="text-[10px]">PNG, JPG, WebP</span></>}
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Heading</Label>
            <Input value={content.heading} onChange={e => patch({ heading: e.target.value })} placeholder="Main heading" className="h-9 text-xs" />
          </div>

          {/* Subheading */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Subheading <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input value={content.subheading} onChange={e => patch({ subheading: e.target.value })} placeholder="Small line under heading" className="h-9 text-xs" />
          </div>

          {/* Body text */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Email Body</Label>
            <textarea
              value={content.bodyText}
              onChange={e => patch({ bodyText: e.target.value })}
              rows={8}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-y font-sans leading-relaxed"
              placeholder={"Dear {{firstName}},\n\nWrite your message here..."}
            />
            <p className="text-[9px] text-muted-foreground">Use <code className="bg-muted px-1 rounded">{"{{firstName}}"}</code> to insert the client's name automatically.</p>
          </div>

          {/* Button */}
          <div className="space-y-1.5 border rounded-lg p-3 bg-muted/10">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Action Button</Label>
              <label className="flex items-center gap-1 text-[10px] cursor-pointer text-muted-foreground">
                <input type="checkbox" checked={content.showButton} onChange={e => patch({ showButton: e.target.checked })} className="h-3 w-3" />
                Show button
              </label>
            </div>
            {content.showButton && (
              <div className="space-y-1.5">
                <Input value={content.buttonText} onChange={e => patch({ buttonText: e.target.value })} placeholder="Button label" className="h-8 text-xs" />
                <Input value={content.buttonUrl} onChange={e => patch({ buttonUrl: e.target.value })} placeholder="https://yourlink.com" className="h-8 text-xs" />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Footer text</Label>
            <Input value={content.footerText} onChange={e => patch({ footerText: e.target.value })} placeholder="© 2025 Your Company." className="h-9 text-xs" />
          </div>

          {/* Save button at bottom of panel */}
          <Button onClick={handleSave} disabled={isSaving} className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs">
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Draft</>}
          </Button>
        </div>

        {/* RIGHT: Live Preview */}
        {showPreview && (
          <div className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-y-auto p-4 flex justify-center">
            <div className="w-full max-w-[620px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center mb-3">Live Preview</p>
              <div
                className="w-full rounded-xl shadow-lg overflow-hidden"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Send Dialog */}
      <Dialog open={isSendOpen} onOpenChange={setIsSendOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleSend}>
            <DialogHeader className="pb-3 border-b mb-4">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-500" /> Send Campaign
              </DialogTitle>
              <DialogDescription className="text-xs">
                The campaign will be sent to all your contacts. You'll also receive a test copy at the email below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid gap-1.5">
                <Label htmlFor="sendEmail" className="text-xs font-semibold">Your email (for test copy)</Label>
                <Input id="sendEmail" type="email" placeholder="you@yourcompany.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} required className="h-9 text-xs" />
              </div>
            </div>
            <DialogFooter className="mt-5 pt-4 border-t">
              <Button variant="outline" type="button" onClick={() => setIsSendOpen(false)} disabled={isSending} className="text-xs h-9">Cancel</Button>
              <Button type="submit" disabled={isSending} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white">
                {isSending ? "Sending..." : "Send Now"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
