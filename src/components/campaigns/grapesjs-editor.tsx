"use client"

import * as React from "react"
import grapesjs, { Editor } from "grapesjs"
import "grapesjs/dist/css/grapes.min.css"
import grapesjsNewsletter from "grapesjs-preset-newsletter"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, Send, Loader2, Sparkles } from "lucide-react"
import Link from "next/link"
import { getCampaignById, updateCampaignDesign, sendTestCampaign } from "@/app/actions/campaigns"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { AICopilotDrawer } from "@/components/copilot/ai-copilot-drawer"

interface GrapesJSEditorProps {
  campaignId: string
}

export function GrapesJSEditor({ campaignId }: GrapesJSEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null)
  const [editor, setEditor] = React.useState<Editor | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [campaignName, setCampaignName] = React.useState("Loading Campaign...")
  
  // Test Send Simulation Dialog states
  const [isSendOpen, setIsSendOpen] = React.useState(false)
  const [testEmail, setTestEmail] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)

  // AI Copilot states
  const [subject, setSubject] = React.useState("")
  const [previewTextState, setPreviewTextState] = React.useState("")
  const [isCopilotOpen, setIsCopilotOpen] = React.useState(false)

  // 1. Fetch campaign details on mount
  React.useEffect(() => {
    let activeEditor: Editor | null = null

    const initCampaignEditor = async () => {
      try {
        const result = await getCampaignById(campaignId)
        if (result.success && result.data) {
          setCampaignName(result.data.name)
          setSubject(result.data.subject || "")
          setPreviewTextState(result.data.previewText || "")
          
          if (!editorRef.current) return

          // Initialize GrapesJS
          const e = grapesjs.init({
            container: editorRef.current,
            fromElement: false,
            height: "calc(100vh - 3.5rem)",
            width: "auto",
            plugins: [grapesjsNewsletter],
            pluginsOpts: {
              [grapesjsNewsletter as unknown as string]: {
                modalTitleImport: "Import template",
              },
            },
            storageManager: {
              type: "none", // Manage storage manually via Server Actions
            },
          })

          activeEditor = e
          setEditor(e)

          // Load design from DB if available
          if (result.data.designContent) {
            try {
              const projectData = typeof result.data.designContent === "string"
                ? JSON.parse(result.data.designContent)
                : result.data.designContent
              e.loadProjectData(projectData as any)
            } catch (err) {
              console.error("Failed to parse designContent JSON:", err)
            }
          } else {
            // Default template
            e.setComponents(`
              <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Helvetica, Arial, sans-serif; background-color: #ffffff;">
                <h1 style="color: #1e293b; text-align: center; font-size: 28px; font-weight: bold; margin-bottom: 15px;">Welcome to Our Newsletter</h1>
                <p style="color: #64748b; font-size: 16px; line-height: 1.6; text-align: center;">This is a premium email template designed with GrapesJS. Start dragging blocks to customize!</p>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="#" style="background-color: #3b82f6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Visit Website</a>
                </div>
              </div>
            `)
          }
        } else {
          toast.error(result.error || "Failed to load campaign data")
        }
      } catch (err) {
        console.error("Editor init error:", err)
        toast.error("Failed to initialize campaign editor")
      } finally {
        setIsLoading(false)
      }
    }

    initCampaignEditor()

    return () => {
      if (activeEditor) {
        activeEditor.destroy()
      }
    }
  }, [campaignId])

  // 2. Save Draft Action
  const handleSaveDraft = async () => {
    if (!editor) return
    setIsSaving(true)
    try {
      const html = editor.getHtml()
      const css = editor.getCss()
      
      // Combine HTML and CSS into a single template for delivery
      const fullHtml = `
        <html>
          <head>
            <style>${css}</style>
          </head>
          <body>
            ${html}
          </body>
        </html>
      `
      
      const projectData = editor.getProjectData()
      const designContent = JSON.stringify(projectData)

      const result = await updateCampaignDesign(campaignId, fullHtml, designContent)
      if (result.success) {
        toast.success("Draft saved successfully!")
      } else {
        toast.error(result.error || "Failed to save draft.")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred while saving the draft.")
    } finally {
      setIsSaving(false)
    }
  }

  // 3. Send Simulation Action
  const handleSendSimulation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testEmail || !editor) return

    setIsSending(true)
    try {
      // Auto save first
      const html = editor.getHtml()
      const css = editor.getCss()
      const fullHtml = `<html><head><style>${css}</style></head><body>${html}</body></html>`
      const projectData = editor.getProjectData()
      const designContent = JSON.stringify(projectData)

      await updateCampaignDesign(campaignId, fullHtml, designContent)

      // Simulate sending
      const result = await sendTestCampaign(campaignId, testEmail)
      if (result.success) {
        toast.success(`Simulation complete! Template dispatched to ${testEmail}`)
        setIsSendOpen(false)
        setTestEmail("")
        // Redirect back to campaigns list after sending
        window.location.href = "/campaigns"
      } else {
        toast.error(result.error || "Simulation send failed.")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred during send simulation.")
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
        <p className="text-xs text-muted-foreground">Loading email template workspace...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Editor Header Toolbar */}
      <header className="flex h-14 items-center justify-between border-b px-4 shrink-0 bg-background z-20">
        <div className="flex items-center gap-3">
          <Link href="/campaigns" passHref legacyBehavior>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <span className="text-sm font-bold truncate max-w-[200px] sm:max-w-[400px]">
              {campaignName}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
              Drag-and-Drop Designer
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsCopilotOpen(true)} className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50">
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-blue-500 fill-blue-500/10" />
            AI Copilot
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSaving} className="h-8 text-xs">
            {isSaving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save Draft
          </Button>
          <Button size="sm" onClick={() => setIsSendOpen(true)} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Send Simulation
          </Button>
        </div>
      </header>

      {/* Editor Canvas Container */}
      <div className="flex-1 bg-background overflow-hidden relative">
        <div ref={editorRef} className="w-full h-[calc(100vh-3.5rem)] border-t border-border" />
      </div>

      {/* Send Simulation Dialog Modal */}
      <Dialog open={isSendOpen} onOpenChange={setIsSendOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleSendSimulation}>
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
                <Label htmlFor="simEmail" className="text-xs font-semibold">Receive Test Copy Email</Label>
                <Input 
                  id="simEmail" 
                  type="email" 
                  placeholder="tester@yourcompany.com" 
                  value={testEmail} 
                  onChange={(e) => setTestEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <DialogFooter className="mt-6 pt-4 border-t">
              <Button variant="outline" type="button" onClick={() => setIsSendOpen(false)} disabled={isSending} className="text-xs h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={isSending} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white">
                {isSending ? "Simulating..." : "Trigger Send Simulation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AICopilotDrawer
        campaignId={campaignId}
        open={isCopilotOpen}
        onOpenChange={setIsCopilotOpen}
        editor={editor}
        currentSubject={subject}
        currentPreview={previewTextState}
        onUpdateMetadata={(subj, prev) => {
          setSubject(subj)
          setPreviewTextState(prev)
        }}
      />
    </div>
  )
}
