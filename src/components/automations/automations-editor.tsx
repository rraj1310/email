"use client"

import * as React from "react"
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  Panel,
  Node,
  Edge,
  Handle,
  Position,
  ReactFlowProvider
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useAutomationStore } from "./store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { 
  Save, 
  Trash2, 
  Plus, 
  Undo, 
  Redo, 
  Mail,
  Clock,
  Tag,
  GitBranch,
  Settings,
  Sparkles,
  ArrowLeft,
  Edit2
} from "lucide-react"
import { updateAutomationFlow, toggleAutomationStatus } from "@/app/actions/automations"
import { suggestAutomationImprovements } from "@/app/actions/copilot"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

// --- CUSTOM NODES ---

// Trigger Node
function CustomTriggerNode({ id, data, selected }: any) {
  const updateNodeData = useAutomationStore((s) => s.updateNodeData)
  
  return (
    <div className={`w-60 rounded-xl border-2 bg-white/95 dark:bg-slate-900/95 shadow-lg backdrop-blur-sm transition-all duration-200 ${
      selected ? "border-amber-500 ring-2 ring-amber-500/20" : "border-amber-200 dark:border-amber-900/50"
    }`}>
      <div className="flex items-center justify-between rounded-t-lg bg-amber-500/10 px-3 py-2 border-b border-amber-500/20">
        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" /> Trigger
        </span>
      </div>
      <div className="p-3.5 space-y-2">
        <div className="text-sm font-semibold text-foreground">{data.label}</div>
        <select
          value={data.type || "NEW_CONTACT"}
          onChange={(e) => {
            const val = e.target.value
            let label = "Trigger"
            if (val === "NEW_CONTACT") label = "Contact Created"
            else if (val === "TAG_ADDED") label = "Tag Added"
            else if (val === "CAMPAIGN_OPENED") label = "Campaign Opened"
            else if (val === "LINK_CLICKED") label = "Link Clicked"
            else if (val === "FORM_SUBMITTED") label = "Form Submitted"
            else if (val === "BIRTHDAY") label = "Contact's Birthday"
            updateNodeData(id, { type: val, label: `When: ${label}` })
          }}
          className="w-full text-xs bg-muted/50 border border-muted/80 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 text-foreground"
        >
          <option value="NEW_CONTACT">Contact Created</option>
          <option value="TAG_ADDED">Tag Added</option>
          <option value="CAMPAIGN_OPENED">Campaign Opened</option>
          <option value="LINK_CLICKED">Link Clicked</option>
          <option value="FORM_SUBMITTED">Form Submitted</option>
          <option value="BIRTHDAY">🎂 Contact's Birthday</option>
        </select>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-amber-500 border-2 border-white dark:border-slate-900" />
    </div>
  )
}

// Action Node
function CustomActionNode({ id, data, selected }: any) {
  const updateNodeData = useAutomationStore((s) => s.updateNodeData)
  const deleteNode = useAutomationStore((s) => s.deleteNode)

  const renderIcon = () => {
    switch (data.actionType) {
      case "SEND_EMAIL": return <Mail className="h-3.5 w-3.5 text-indigo-500" />
      case "WAIT": return <Clock className="h-3.5 w-3.5 text-indigo-500" />
      default: return <Tag className="h-3.5 w-3.5 text-indigo-500" />
    }
  }
  
  return (
    <div className={`w-60 rounded-xl border-2 bg-white/95 dark:bg-slate-900/95 shadow-lg backdrop-blur-sm transition-all duration-200 ${
      selected ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-indigo-200 dark:border-indigo-900/50"
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-indigo-400 border-2 border-white dark:border-slate-900" />
      <div className="flex items-center justify-between rounded-t-lg bg-indigo-500/10 px-3 py-2 border-b border-indigo-500/20">
        <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
          {renderIcon()} Action
        </span>
        <button onClick={() => deleteNode(id)} className="text-muted-foreground hover:text-red-500">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-3.5 space-y-2">
        <div className="text-sm font-semibold text-foreground">{data.label}</div>
        <select
          value={data.actionType || "SEND_EMAIL"}
          onChange={(e) => {
            const val = e.target.value
            let label = "Action"
            if (val === "SEND_EMAIL") label = "Send Email Campaign"
            else if (val === "WAIT") label = "Wait Delay"
            else if (val === "ADD_TAG") label = "Add Workspace Tag"
            else if (val === "REMOVE_TAG") label = "Remove Workspace Tag"
            else if (val === "UPDATE_CONTACT") label = "Update Contact Field"
            updateNodeData(id, { actionType: val, label })
          }}
          className="w-full text-xs bg-muted/50 border border-muted/80 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-foreground"
        >
          <option value="SEND_EMAIL">Send Email</option>
          <option value="WAIT">Wait / Delay</option>
          <option value="ADD_TAG">Add Tag</option>
          <option value="REMOVE_TAG">Remove Tag</option>
          <option value="UPDATE_CONTACT">Update Contact</option>
        </select>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-indigo-500 border-2 border-white dark:border-slate-900" />
    </div>
  )
}

// Condition Node
function CustomConditionNode({ id, data, selected }: any) {
  const updateNodeData = useAutomationStore((s) => s.updateNodeData)
  const deleteNode = useAutomationStore((s) => s.deleteNode)
  
  return (
    <div className={`w-64 rounded-xl border-2 bg-white/95 dark:bg-slate-900/95 shadow-lg backdrop-blur-sm transition-all duration-200 ${
      selected ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-emerald-200 dark:border-emerald-900/50"
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-emerald-400 border-2 border-white dark:border-slate-900" />
      <div className="flex items-center justify-between rounded-t-lg bg-emerald-500/10 px-3 py-2 border-b border-emerald-500/20">
        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
          <GitBranch className="h-3.5 w-3.5" /> Condition
        </span>
        <button onClick={() => deleteNode(id)} className="text-muted-foreground hover:text-red-500">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-3.5 space-y-2">
        <div className="text-sm font-semibold text-foreground">{data.label}</div>
        <select
          value={data.conditionType || "IF_ELSE"}
          onChange={(e) => {
            const val = e.target.value
            let label = "Condition"
            if (val === "IF_ELSE") label = "Boolean Check"
            else if (val === "CONTACT_PROPERTY") label = "Contact Property Filter"
            else if (val === "CAMPAIGN_BEHAVIOR") label = "Campaign Behavior Route"
            updateNodeData(id, { conditionType: val, label })
          }}
          className="w-full text-xs bg-muted/50 border border-muted/80 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-foreground"
        >
          <option value="IF_ELSE">If / Else Check</option>
          <option value="CONTACT_PROPERTY">Contact Property</option>
          <option value="CAMPAIGN_BEHAVIOR">Campaign Behaviour</option>
        </select>
      </div>
      
      <div className="flex justify-between px-3 pb-1.5 text-[10px] font-bold text-muted-foreground">
        <span>YES</span>
        <span>NO</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: "25%" }}
        className="w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: "75%" }}
        className="w-3.5 h-3.5 bg-red-500 border-2 border-white dark:border-slate-900"
      />
    </div>
  )
}

const nodeTypes = {
  triggerNode: CustomTriggerNode,
  actionNode: CustomActionNode,
  conditionNode: CustomConditionNode
}

// --- MAIN WRAPPER COMPONENT ---

interface AutomationsEditorProps {
  automationId: string
  initialRule: any
  campaigns: any[]
}

function FlowCanvas({ automationId, initialRule, campaigns }: AutomationsEditorProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, updateNodeData, validateFlow, setInitialState, undo, redo, historyIndex, history } = useAutomationStore()
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null)
  const [isActiveState, setIsActiveState] = React.useState(initialRule.isActive)
  const [isSaving, setIsSaving] = React.useState(false)

  // AI Automation Assistant states
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false)
  const [assistantData, setAssistantData] = React.useState<{
    brokenLogicDetected: boolean
    warnings: string[]
    recommendations: string[]
    proposedChangesSummary: string
  } | null>(null)

  const handleAiAssistant = async () => {
    setIsAnalyzing(true)
    setAssistantData(null)
    try {
      const res = await suggestAutomationImprovements(automationId) as any
      if (res.success && res.data) {
        setAssistantData(res.data)
        setIsAssistantOpen(true)
        toast.success("Workflow design optimized by AI!")
      } else {
        toast.error(res.error || "Failed to analyze workflow flow.")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reach AI optimizer.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  React.useEffect(() => {
    const rawNodes = initialRule.nodes ? (initialRule.nodes as Node[]) : [
      {
        id: "trigger-node",
        type: "triggerNode",
        position: { x: 250, y: 100 },
        data: { label: `When: Contact Created`, type: initialRule.triggerType || "CONTACT_CREATED", config: {} }
      }
    ]
    const rawEdges = initialRule.edges ? (initialRule.edges as Edge[]) : []
    setInitialState(rawNodes, rawEdges)
  }, [initialRule])

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  const spawnNode = (type: "actionNode" | "conditionNode") => {
    const id = `${type}-${Date.now()}`
    const label = type === "actionNode" ? "Send Email Campaign" : "Boolean Check"
    const dataObj = type === "actionNode" 
      ? { actionType: "SEND_EMAIL", label, campaignId: "", waitDays: 0, tagName: "" }
      : { conditionType: "IF_ELSE", label, variable: "email", operator: "CONTAINS", value: "" }

    addNode({
      id,
      type,
      position: { x: 250 + Math.random() * 80, y: 250 + Math.random() * 80 },
      data: dataObj
    })
    setSelectedNodeId(id)
  }

  const handleSave = async () => {
    const check = validateFlow()
    if (!check.isValid) {
      check.errors.forEach((err) => toast.error(err))
      return
    }

    setIsSaving(true)
    try {
      const trigger = nodes.find((n) => n.type === "triggerNode")
      const result = await updateAutomationFlow(automationId, {
        nodes,
        edges,
        triggerType: trigger?.data.type as string,
        triggerConfig: trigger?.data.config,
        actions: nodes.filter((n) => n.type === "actionNode").map((n) => ({
          nodeId: n.id,
          actionType: n.data.actionType,
          campaignId: n.data.campaignId,
          waitDays: n.data.waitDays,
          tagName: n.data.tagName
        }))
      })

      if ("data" in result) {
        toast.success("Workflow flow successfully saved!")
      } else {
        toast.error(result.error || "Failed to save workflow changes")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to complete save operation.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async () => {
    try {
      const res = await toggleAutomationStatus(automationId)
      if ("data" in res) {
        setIsActiveState(res.data?.isActive)
        toast.success(`Automation ${res.data?.isActive ? "activated" : "paused"} successfully.`)
      } else {
        toast.error(res.error || "Failed to change workflow state")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to toggle status.")
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] border border-muted/50 rounded-xl overflow-hidden bg-muted/10">
      
      {/* Visual Canvas Block */}
      <div className="flex-1 h-full relative bg-muted/5">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          fitView
        >
          <Controls className="bg-white dark:bg-slate-900 border-muted text-foreground" />
          <MiniMap className="bg-white/90 dark:bg-slate-900/90 border-muted" />
          <Background color="#cbd5e1" gap={16} />
          
          <Panel position="top-left" className="flex flex-col gap-2 pointer-events-auto bg-white/95 dark:bg-slate-900/95 p-3 rounded-xl shadow-lg border border-muted/80 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-6 pb-2 border-b border-muted">
              <Link href="/automations" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Link>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Flow Canvas</h2>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => spawnNode("actionNode")} className="h-8 gap-1 border-indigo-200/60 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/20 dark:border-indigo-900/40 text-xs">
                <Plus className="h-3.5 w-3.5" /> Action Node
              </Button>
              <Button variant="outline" onClick={() => spawnNode("conditionNode")} className="h-8 gap-1 border-emerald-200/60 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-xs">
                <Plus className="h-3.5 w-3.5" /> Condition Node
              </Button>
            </div>
            
            <div className="flex items-center gap-1.5 border-t border-muted pt-2 mt-1">
              <Button size="icon" variant="ghost" onClick={undo} disabled={historyIndex <= 0} className="h-7 w-7">
                <Undo className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={redo} disabled={historyIndex >= history.length - 1} className="h-7 w-7">
                <Redo className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[10px] text-muted-foreground ml-1">History: {historyIndex + 1}/{history.length}</span>
            </div>
          </Panel>

          <Panel position="top-right" className="flex items-center gap-2 pointer-events-auto bg-white/95 dark:bg-slate-900/95 p-3 rounded-xl shadow-lg border border-muted/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 mr-3 border-r border-muted pr-3">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                {isActiveState ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Active
                  </>
                ) : (
                  <>
                    <span className="inline-flex rounded-full h-2 w-2 bg-red-400"></span>
                    Paused
                  </>
                )}
              </span>
              <Switch checked={isActiveState} onCheckedChange={handleToggleActive} disabled={isSaving} />
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleAiAssistant}
              disabled={isAnalyzing || isSaving}
              className="gap-1.5 border-violet-200/60 text-violet-700 bg-violet-50/50 hover:bg-violet-100 dark:text-violet-400 dark:bg-violet-950/20 dark:border-violet-900/40 font-semibold"
            >
              {isAnalyzing ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5" /> AI Audit</>
              )}
            </Button>
            
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
              {isSaving ? "Saving..." : <><Save className="mr-1.5 h-4 w-4" /> Save Graph</>}
            </Button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Editor Configuration Sidebar Panel */}
      <div className="w-80 h-full border-l border-muted/50 bg-white dark:bg-slate-900 p-4 overflow-y-auto">
        {selectedNode ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-muted">
              <Settings className="h-5 w-5 text-indigo-500" />
              <div>
                <h3 className="font-bold text-sm text-foreground">Node Configurator</h3>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">{selectedNode.type}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Label</Label>
              <Input
                type="text"
                value={selectedNode.data.label as string}
                onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                className="h-9"
              />
            </div>

            {selectedNode.type === "triggerNode" && (
              <div className="space-y-4 border-t border-muted/60 pt-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Trigger Settings</h4>
                <div className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/30">
                  This trigger starts the workflow sequence for a contact immediately when the selected event occurs in the workspace.
                </div>
              </div>
            )}

            {selectedNode.type === "actionNode" && (
              <div className="space-y-4 border-t border-muted/60 pt-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Action Settings</h4>
                
                {selectedNode.data.actionType === "SEND_EMAIL" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground">Select Campaign Template</Label>
                    <select
                      value={selectedNode.data.campaignId as string || ""}
                      onChange={(e) => updateNodeData(selectedNode.id, { campaignId: e.target.value })}
                      className="w-full text-xs bg-muted/30 border border-muted rounded p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-foreground"
                    >
                      <option value="">-- Choose template --</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.subject || "No Subject"})</option>
                      ))}
                    </select>

                    {!!(selectedNode.data as any).campaignId && (
                      <div className="pt-2">
                        <Link
                          href={`/campaigns/${(selectedNode.data as any).campaignId}/editor`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-full px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md dark:text-indigo-400 dark:bg-indigo-950/30 dark:border-indigo-900/40 transition-colors cursor-pointer"
                        >
                          <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                          Edit Selected Template Content
                        </Link>
                        <p className="text-[10px] text-muted-foreground mt-1.5 leading-normal">
                          Opens the email composer in a new tab. You can use personalization tags like <code className="bg-muted px-1 py-0.5 rounded font-mono text-[9px]">{"{{firstName}}"}</code> or <code className="bg-muted px-1 py-0.5 rounded font-mono text-[9px]">{"{{email}}"}</code> inside your template.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedNode.data.actionType === "WAIT" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground">Wait Duration (Days)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={selectedNode.data.waitDays as number || 0}
                      onChange={(e) => updateNodeData(selectedNode.id, { waitDays: parseInt(e.target.value) || 0 })}
                      className="h-9"
                    />
                  </div>
                )}

                {(selectedNode.data.actionType === "ADD_TAG" || selectedNode.data.actionType === "REMOVE_TAG") && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground">Tag Identifier</Label>
                    <Input
                      type="text"
                      placeholder="e.g. VIP-Status"
                      value={selectedNode.data.tagName as string || ""}
                      onChange={(e) => updateNodeData(selectedNode.id, { tagName: e.target.value.trim() })}
                      className="h-9"
                    />
                  </div>
                )}

                {selectedNode.data.actionType === "UPDATE_CONTACT" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground">Custom Property (Field Name)</Label>
                    <Input
                      type="text"
                      placeholder="e.g. city"
                      value={selectedNode.data.updateField as string || ""}
                      onChange={(e) => updateNodeData(selectedNode.id, { updateField: e.target.value.trim() })}
                      className="h-9"
                    />
                    <Label className="text-[10px] font-semibold text-muted-foreground mt-1 block">New Value</Label>
                    <Input
                      type="text"
                      placeholder="e.g. San Francisco"
                      value={selectedNode.data.updateValue as string || ""}
                      onChange={(e) => updateNodeData(selectedNode.id, { updateValue: e.target.value })}
                      className="h-9"
                    />
                  </div>
                )}
              </div>
            )}

            {selectedNode.type === "conditionNode" && (
              <div className="space-y-4 border-t border-muted/60 pt-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Branching Logic</h4>
                
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">If Contact Variable</Label>
                  <select
                    value={selectedNode.data.variable as string || "email"}
                    onChange={(e) => updateNodeData(selectedNode.id, { variable: e.target.value })}
                    className="w-full text-xs bg-muted/30 border border-muted rounded p-2 text-foreground focus:outline-none"
                  >
                    <option value="email">Email Address</option>
                    <option value="firstName">First Name</option>
                    <option value="lastName">Last Name</option>
                    <option value="city">City</option>
                    <option value="country">Country</option>
                    <option value="status">Status</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Operator</Label>
                  <select
                    value={selectedNode.data.operator as string || "EQUALS"}
                    onChange={(e) => updateNodeData(selectedNode.id, { operator: e.target.value })}
                    className="w-full text-xs bg-muted/30 border border-muted rounded p-2 text-foreground focus:outline-none"
                  >
                    <option value="EQUALS">Equals</option>
                    <option value="CONTAINS">Contains</option>
                    <option value="STARTS_WITH">Starts With</option>
                    <option value="ENDS_WITH">Ends With</option>
                    <option value="IS_EMPTY">Is Empty</option>
                  </select>
                </div>

                {selectedNode.data.operator !== "IS_EMPTY" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground">Compare Value</Label>
                    <Input
                      type="text"
                      placeholder="value"
                      value={selectedNode.data.value as string || ""}
                      onChange={(e) => updateNodeData(selectedNode.id, { value: e.target.value })}
                      className="h-9"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
            <Settings className="h-8 w-8 text-muted-foreground/30 animate-pulse mb-3" />
            <h3 className="font-semibold text-sm">No node selected</h3>
            <p className="text-xs text-muted-foreground/80 mt-1 max-w-[200px]">
              Click on any canvas node to configure its variables and parameters.
            </p>

            {/* AI Assistant CTA in empty sidebar */}
            <div className="mt-6 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAiAssistant}
                disabled={isAnalyzing}
                className="w-full gap-1.5 border-violet-200/60 text-violet-700 bg-violet-50/50 hover:bg-violet-100 dark:text-violet-400 dark:bg-violet-950/20 dark:border-violet-900/40 text-xs font-semibold"
              >
                {isAnalyzing ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5" /> AI Workflow Audit</>
                )}
              </Button>
              <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                Detect broken logic, missing paths, and get optimization suggestions.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AI Automation Assistant Dialog */}
      <Dialog open={isAssistantOpen} onOpenChange={setIsAssistantOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              AI Workflow Audit
            </DialogTitle>
            <DialogDescription>
              Automated analysis of your automation graph for broken logic, warnings, and improvement recommendations.
            </DialogDescription>
          </DialogHeader>

          {assistantData && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Status Banner */}
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${
                assistantData.brokenLogicDetected
                  ? "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
              }`}>
                {assistantData.brokenLogicDetected ? (
                  <><AlertTriangle className="h-4 w-4 flex-shrink-0" /> Broken logic detected — review warnings below</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 flex-shrink-0" /> No critical logic issues found</>
                )}
              </div>

              {/* Warnings Section */}
              {assistantData.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Warnings ({assistantData.warnings.length})
                  </h4>
                  <ul className="space-y-1.5">
                    {assistantData.warnings.map((w: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground bg-amber-50/60 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations Section */}
              {assistantData.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" /> Recommendations ({assistantData.recommendations.length})
                  </h4>
                  <ul className="space-y-1.5">
                    {assistantData.recommendations.map((r: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground bg-indigo-50/60 dark:bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-200/50 dark:border-indigo-900/30">
                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Summary */}
              {assistantData.proposedChangesSummary && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" /> Summary
                  </h4>
                  <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-muted/50 leading-relaxed">
                    {assistantData.proposedChangesSummary}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAssistantOpen(false)}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleAiAssistant}
              disabled={isAnalyzing}
              className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
            >
              {isAnalyzing ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Re-analyzing…</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5" /> Re-analyze</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

export default function AutomationsEditor(props: AutomationsEditorProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  )
}
