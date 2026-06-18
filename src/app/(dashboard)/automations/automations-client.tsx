"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Workflow, Settings, Play, Pause, Trash2, ArrowRight, Clock, Mail, CheckCircle, Loader2 } from "lucide-react"
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
}

export function AutomationsClient({ initialAutomations }: AutomationsClientProps) {
  const [workflows, setWorkflows] = React.useState<any[]>(initialAutomations)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  // Form states
  const [newWorkflowName, setNewWorkflowName] = React.useState("")
  const [newTriggerType, setNewTriggerType] = React.useState("NEW_CONTACT")

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
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Automations</h2>
          <p className="text-muted-foreground text-sm">
            Build event-driven email workflows to message your audience dynamically.
          </p>
        </div>

        {/* Create Automation Dialog Trigger */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium" />}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create Workflow
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <form onSubmit={handleCreate}>
              <DialogHeader className="pb-3 border-b mb-4">
                <DialogTitle className="text-lg font-bold">New Automation Workflow</DialogTitle>
                <DialogDescription className="text-xs">
                  Trigger emails automatically based on user events.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="workflowName" className="text-xs font-semibold">Workflow Name *</Label>
                  <Input 
                    id="workflowName" 
                    placeholder="Welcome series to Leads" 
                    value={newWorkflowName} 
                    onChange={(e) => setNewWorkflowName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="triggerType" className="text-xs font-semibold">Event Trigger</Label>
                  <select 
                    id="triggerType" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={newTriggerType}
                    onChange={(e) => setNewTriggerType(e.target.value)}
                  >
                    <option value="NEW_CONTACT">Contact Created (joins list)</option>
                    <option value="TAG_ADDED">Tag Connected to Contact</option>
                    <option value="CAMPAIGN_OPENED">Campaign Opened by Contact</option>
                    <option value="LINK_CLICKED">Link Clicked inside Email</option>
                    <option value="FORM_SUBMITTED">Form Submitted</option>
                  </select>
                </div>
              </div>

              <DialogFooter className="mt-6 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)} disabled={isSaving} className="text-xs h-9">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white">
                  {isSaving ? "Creating..." : "Create Workflow"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grid listing */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
        {workflows.map(item => {
          const status = getStatus(item)
          
          return (
            <Card key={item.id} className="border shadow-xs hover:shadow-md transition-all duration-300 relative bg-card">
              <CardHeader className="pb-3 border-b">
                <div className="flex justify-between items-start gap-2">
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-md shrink-0">
                    <Workflow className="h-5 w-5" />
                  </div>
                  <Badge variant={status === "ACTIVE" ? "default" : "secondary"} className={`text-[9px] font-bold ${
                    status === "ACTIVE" 
                      ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10" 
                      : "bg-muted-foreground/15 text-muted-foreground"
                  }`}>
                    {status}
                  </Badge>
                </div>
                <CardTitle className="mt-3 text-base font-bold text-foreground truncate">{item.name}</CardTitle>
                <CardDescription className="text-[11px] truncate">
                  Trigger: {item.triggerType}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-4 space-y-4">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 border rounded-md p-2.5 bg-muted/10 text-xs">
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Enrolled</p>
                    <p className="font-extrabold text-sm text-foreground">{item.metrics?.entered || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Completed</p>
                    <p className="font-extrabold text-sm text-foreground">{item.metrics?.completed || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Open Rate</p>
                    <p className="font-extrabold text-sm text-foreground">{Number(item.metrics?.openRate || 0).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Click Rate</p>
                    <p className="font-extrabold text-sm text-foreground">{Number(item.metrics?.clickRate || 0).toFixed(1)}%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>Active: <strong className="text-foreground font-semibold">{item.metrics?.active || 0}</strong></span>
                  <span>Exit Rate: <strong className="text-foreground font-semibold">{Number(item.metrics?.exitRate || 0).toFixed(1)}%</strong></span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs flex-1 border-indigo-200/80 hover:bg-indigo-50 hover:text-indigo-600 dark:border-indigo-900/50 dark:hover:bg-indigo-950/20">
                    <Link href={`/automations/${item.id}/editor`} className="flex items-center justify-center w-full h-full">
                      <Settings className="mr-1 h-3.5 w-3.5" /> Edit Flow
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleToggle(item.id)} className="h-8 text-xs flex-1">
                    {status === "ACTIVE" ? (
                      <>
                        <Pause className="mr-1 h-3.5 w-3.5 text-amber-500" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="mr-1 h-3.5 w-3.5 text-emerald-500" /> Run
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 border-destructive/20 shrink-0"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {workflows.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground text-xs flex flex-col items-center justify-center border border-dashed rounded-lg bg-muted/10 h-64">
            <Workflow className="h-10 w-10 mb-2 opacity-50 text-blue-500" />
            <h3 className="text-md font-semibold text-foreground">No Workflows</h3>
            <p className="text-[11px] max-w-sm mt-1">
              Add auto-responses or drip marketing series triggers.
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
