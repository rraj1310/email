import { create } from "zustand"
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react"

export interface AutomationStore {
  nodes: Node[]
  edges: Edge[]
  history: { nodes: Node[]; edges: Edge[] }[]
  historyIndex: number
  
  setInitialState: (nodes: Node[], edges: Edge[]) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (node: Node) => void
  deleteNode: (id: string) => void
  updateNodeData: (id: string, data: any) => void
  
  saveToHistory: () => void
  undo: () => void
  redo: () => void
  
  validateFlow: () => { isValid: boolean; errors: string[] }
}

export const useAutomationStore = create<AutomationStore>((set, get) => ({
  nodes: [],
  edges: [],
  history: [],
  historyIndex: -1,

  setInitialState: (nodes, edges) => {
    set({
      nodes,
      edges,
      history: [{ nodes, edges }],
      historyIndex: 0,
    })
  },

  onNodesChange: (changes) => {
    set((state) => {
      const nextNodes = applyNodeChanges(changes, state.nodes)
      return { nodes: nextNodes }
    })
  },

  onEdgesChange: (changes) => {
    set((state) => {
      const nextEdges = applyEdgeChanges(changes, state.edges)
      return { edges: nextEdges }
    })
  },

  onConnect: (connection) => {
    set((state) => {
      const nextEdges = addEdge(connection, state.edges)
      const nextState = { nodes: state.nodes, edges: nextEdges }
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      return {
        edges: nextEdges,
        history: [...newHistory, nextState],
        historyIndex: newHistory.length,
      }
    })
  },

  addNode: (node) => {
    set((state) => {
      const nextNodes = [...state.nodes, node]
      const nextState = { nodes: nextNodes, edges: state.edges }
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      return {
        nodes: nextNodes,
        history: [...newHistory, nextState],
        historyIndex: newHistory.length,
      }
    })
  },

  deleteNode: (id) => {
    set((state) => {
      if (id === "trigger-node") return {}
      const nextNodes = state.nodes.filter((n) => n.id !== id)
      const nextEdges = state.edges.filter((e) => e.source !== id && e.target !== id)
      const nextState = { nodes: nextNodes, edges: nextEdges }
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      return {
        nodes: nextNodes,
        edges: nextEdges,
        history: [...newHistory, nextState],
        historyIndex: newHistory.length,
      }
    })
  },

  updateNodeData: (id, data) => {
    set((state) => {
      const nextNodes = state.nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...data,
            },
          }
        }
        return node
      })
      const nextState = { nodes: nextNodes, edges: state.edges }
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      return {
        nodes: nextNodes,
        history: [...newHistory, nextState],
        historyIndex: newHistory.length,
      }
    })
  },

  saveToHistory: () => {
    const { nodes, edges, history, historyIndex } = get()
    const nextState = { nodes, edges }
    const newHistory = history.slice(0, historyIndex + 1)
    set({
      history: [...newHistory, nextState],
      historyIndex: newHistory.length,
    })
  },

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1
      const prevState = history[nextIndex]
      set({
        nodes: prevState.nodes,
        edges: prevState.edges,
        historyIndex: nextIndex,
      })
    }
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1
      const nextState = history[nextIndex]
      set({
        nodes: nextState.nodes,
        edges: nextState.edges,
        historyIndex: nextIndex,
      })
    }
  },

  validateFlow: () => {
    const { nodes, edges } = get()
    const errors: string[] = []

    // 1. Check if trigger exists
    const triggerNodes = nodes.filter((n) => n.type === "triggerNode")
    if (triggerNodes.length === 0) {
      errors.push("Workflow must contain a trigger node.")
    } else if (triggerNodes.length > 1) {
      errors.push("Workflow cannot contain more than one trigger node.")
    }

    // 2. Check connections
    nodes.forEach((node) => {
      if (node.id === "trigger-node") return

      const incoming = edges.some((e) => e.target === node.id)
      if (!incoming) {
        errors.push(`Node "${node.data.label || node.type}" has no incoming connection.`)
      }

      if (node.type === "conditionNode") {
        const hasTrueOutput = edges.some((e) => e.source === node.id && e.sourceHandle === "true")
        const hasFalseOutput = edges.some((e) => e.source === node.id && e.sourceHandle === "false")
        if (!hasTrueOutput || !hasFalseOutput) {
          errors.push(`Condition Node "${node.data.label}" must connect to both True and False paths.`)
        }
      }

      if (node.type === "actionNode") {
        const actionType = node.data.actionType
        if (actionType === "SEND_EMAIL" && !node.data.campaignId) {
          errors.push(`Action "${node.data.label}": You must select a campaign template to send.`)
        }
        if (actionType === "WAIT") {
          const waitDays = Number(node.data.waitDays)
          if (isNaN(waitDays) || waitDays < 0) {
            errors.push(`Action "${node.data.label}": Wait time must be a valid number of days (>= 0).`)
          }
        }
        if (actionType === "ADD_TAG" && !node.data.tagName) {
          errors.push(`Action "${node.data.label}": Please specify a tag name to add.`)
        }
        if (actionType === "REMOVE_TAG" && !node.data.tagName) {
          errors.push(`Action "${node.data.label}": Please specify a tag name to remove.`)
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
    }
  },
}))
