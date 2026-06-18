"use server"

import { db as prisma } from "@/lib/db"
import { logActivity } from "./dashboard"
import { getActiveWorkspaceContext, enforceWorkspaceEditor, handleActionError } from "@/lib/tenant"

export async function getAutomations() {
  try {
    const { organizationId } = await getActiveWorkspaceContext()
    
    const list = await prisma.automationRule.findMany({
      where: { organizationId },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const enrichedList = await Promise.all(list.map(async (rule) => {
      const active = await prisma.contactAutomationState.count({
        where: { automationRuleId: rule.id, status: "ACTIVE" }
      })
      const completed = await prisma.contactAutomationState.count({
        where: { automationRuleId: rule.id, status: "COMPLETED" }
      })
      const exited = await prisma.contactAutomationState.count({
        where: { automationRuleId: rule.id, status: "EXITED" }
      })
      const entered = active + completed + exited

      // Extract campaign IDs
      const nodes = (rule.nodes as any[]) || []
      const campaignIds = nodes
        .filter(n => n.type === "actionNode" && n.data?.actionType === "SEND_EMAIL" && n.data?.campaignId)
        .map(n => n.data.campaignId as string)

      let totalSent = 0
      let totalOpens = 0
      let totalClicks = 0

      if (campaignIds.length > 0) {
        const campaignMetrics = await prisma.campaign.aggregate({
          where: {
            id: { in: campaignIds }
          },
          _sum: {
            sentCount: true,
            openCount: true,
            clickCount: true
          }
        })
        totalSent = campaignMetrics._sum.sentCount || 0
        totalOpens = campaignMetrics._sum.openCount || 0
        totalClicks = campaignMetrics._sum.clickCount || 0
      }

      const openRate = totalSent > 0 ? (totalOpens / totalSent) * 100 : 0
      const clickRate = totalSent > 0 ? (totalClicks / totalSent) * 100 : 0
      const conversionRate = entered > 0 ? (completed / entered) * 100 : 0
      const exitRate = entered > 0 ? (exited / entered) * 100 : 0

      return {
        ...rule,
        metrics: {
          entered,
          completed,
          active,
          exited,
          openRate,
          clickRate,
          conversionRate,
          exitRate
        }
      }
    }))

    return { success: true, data: enrichedList }
  } catch (error) {
    return handleActionError(error, "Failed to load workflows")
  }
}

export async function getAutomationById(id: string) {
  try {
    const { organizationId } = await getActiveWorkspaceContext()
    
    const rule = await prisma.automationRule.findFirst({
      where: { id, organizationId }
    })
    if (!rule) return { success: false, error: "Workflow not found" }
    return { success: true, data: rule }
  } catch (error) {
    return handleActionError(error, "Failed to load workflow details")
  }
}

export async function createAutomation(name: string, triggerType: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    // Default trigger configs
    const initialNodes = [
      {
        id: "trigger-node",
        type: "triggerNode",
        position: { x: 250, y: 100 },
        data: { label: `Trigger: ${triggerType}`, type: triggerType, config: {} }
      }
    ]

    const rule = await prisma.automationRule.create({
      data: {
        name,
        triggerType: triggerType as any,
        triggerConfig: { status: "ACTIVE", description: `Triggered when ${triggerType.toLowerCase()}` },
        actions: [],
        nodes: initialNodes,
        edges: [],
        isActive: false,
        organizationId
      }
    })

    await logActivity(`Created automation workflow "${name}"`, "SETTINGS")

    return { success: true, data: rule }
  } catch (error) {
    return handleActionError(error, "Failed to create workflow")
  }
}

export async function updateAutomationFlow(id: string, data: {
  nodes: any
  edges: any
  triggerType?: string
  triggerConfig?: any
  actions?: any
}) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    const existing = await prisma.automationRule.findFirst({
      where: { id, organizationId }
    })
    if (!existing) return { success: false, error: "Workflow not found" }

    const updated = await prisma.automationRule.update({
      where: { id },
      data: {
        nodes: data.nodes,
        edges: data.edges,
        triggerType: (data.triggerType as any) || existing.triggerType,
        triggerConfig: data.triggerConfig !== undefined ? data.triggerConfig : existing.triggerConfig,
        actions: data.actions !== undefined ? data.actions : existing.actions
      }
    })

    await logActivity(`Updated automation workflow flow graph for "${updated.name}"`, "SETTINGS")
    return { success: true, data: updated }
  } catch (error) {
    return handleActionError(error, "Failed to save workflow changes")
  }
}

export async function deleteAutomation(id: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    // Verify automation workspace ownership before delete
    const existing = await prisma.automationRule.findFirst({
      where: { id, organizationId }
    })
    if (!existing) return { success: false, error: "Workflow not found" }

    const rule = await prisma.automationRule.delete({
      where: { id }
    })

    await logActivity(`Deleted automation workflow "${rule.name}"`, "SETTINGS")

    return { success: true }
  } catch (error) {
    return handleActionError(error, "Failed to delete workflow")
  }
}

export async function toggleAutomationStatus(id: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    // Verify automation workspace ownership before updating
    const rule = await prisma.automationRule.findFirst({
      where: { id, organizationId }
    })
    if (!rule) return { success: false, error: "Workflow not found" }

    const nextState = !rule.isActive

    const updated = await prisma.automationRule.update({
      where: { id },
      data: {
        isActive: nextState
      }
    })

    await logActivity(`Toggled automation workflow "${rule.name}" to ${nextState ? "ACTIVE" : "PAUSED"}`, "SETTINGS")

    return { success: true, data: updated }
  } catch (error) {
    return handleActionError(error, "Failed to modify workflow state")
  }
}
