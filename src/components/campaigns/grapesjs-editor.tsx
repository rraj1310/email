"use client"

import * as React from "react"
import grapesjs, { Editor } from "grapesjs"
import "grapesjs/dist/css/grapes.min.css"
import grapesjsNewsletter from "grapesjs-preset-newsletter"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, Send, Loader2, Sparkles } from "lucide-react"
import Link from "next/link"
import { getCampaignById, updateCampaignDesign, sendTestCampaign, dispatchCampaignAction } from "@/app/actions/campaigns"
import { getContacts } from "@/app/actions/contacts"
import { Contact } from "@prisma/client"
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
  
  // Send Campaign Wizard states
  const [isSendOpen, setIsSendOpen] = React.useState(false)
  const [sendMode, setSendMode] = React.useState<"TEST" | "ALL" | "SELECTED">("TEST")
  const [testEmail, setTestEmail] = React.useState("")
  const [selectedContactIds, setSelectedContactIds] = React.useState<string[]>([])
  const [contacts, setContacts] = React.useState<Contact[]>([])
  const [contactSearch, setContactSearch] = React.useState("")
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
        if (!("error" in result)) {
          if (result.data) {
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
            toast.error("Failed to load campaign: Empty data")
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

  // Fetch active contacts on mount
  React.useEffect(() => {
    const fetchContacts = async () => {
      try {
        const result = await getContacts()
        if ("data" in result && result.data) {
          setContacts(result.data.filter((c: any) => c.status === "ACTIVE"))
        }
      } catch (err) {
        console.error("Failed to load contacts for sender list:", err)
      }
    }
    fetchContacts()
  }, [])

  // Filter contacts for the select list
  const filteredContacts = React.useMemo(() => {
    return contacts.filter(c => 
      c.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
      `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase().includes(contactSearch.toLowerCase())
    )
  }, [contacts, contactSearch])

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
      if (!("error" in result)) {
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

  // 3. Send Campaign Action
  const handleSendSimulation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editor) return
    if (sendMode === "TEST" && !testEmail) {
      toast.error("Please provide a recipient email address.")
      return
    }
    if (sendMode === "SELECTED" && selectedContactIds.length === 0) {
      toast.error("Please select at least one contact.")
      return
    }

    setIsSending(true)
    try {
      // Auto save first
      const html = editor.getHtml()
      const css = editor.getCss()
      const fullHtml = `<html><head><style>${css}</style></head><body>${html}</body></html>`
      const projectData = editor.getProjectData()
      const designContent = JSON.stringify(projectData)

      await updateCampaignDesign(campaignId, fullHtml, designContent)

      // Dispatch campaign action
      const result = await dispatchCampaignAction({
        campaignId,
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
        setIsSendOpen(false)
        setTestEmail("")
        setSelectedContactIds([])
        // Redirect back to campaigns list after sending
        window.location.href = "/campaigns"
      } else {
        toast.error(result.error || "Campaign send failed.")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred during campaign dispatch.")
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
          <Button size="sm" onClick={() => {
            setSendMode("TEST")
            setTestEmail("")
            setSelectedContactIds([])
            setContactSearch("")
            setIsSendOpen(true)
          }} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Send Campaign
          </Button>
        </div>
      </header>

      {/* Editor Canvas Container */}
      <div className="flex-1 bg-background overflow-hidden relative">
        <div ref={editorRef} className="w-full h-[calc(100vh-3.5rem)] border-t border-border" />
      </div>

      {/* Send Campaign Wizard Dialog Modal */}
      <Dialog open={isSendOpen} onOpenChange={setIsSendOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <form onSubmit={handleSendSimulation}>
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
                  <Label htmlFor="simEmail" className="text-xs font-semibold">Receive Test Copy Email</Label>
                  <Input
                    id="simEmail"
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
              <Button variant="outline" type="button" onClick={() => setIsSendOpen(false)} disabled={isSending} className="text-xs h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={isSending} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white">
                {isSending ? "Processing..." : sendMode === "TEST" ? "Send Test Copy" : "Dispatch Campaign Now"}
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
