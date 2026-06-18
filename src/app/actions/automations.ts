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

// Pre-built email HTML template generator for automations
function buildAutomationEmailHtml(
  subject: string,
  bodyText: string,
  accentFrom: string,
  accentTo: string,
  emoji: string
) {
  const formattedBody = bodyText.replace(/\n/g, '<br />')
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
      body {
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background-color: #f8fafc;
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
        border: 1px solid #e2e8f0;
      }
      .header-bar {
        height: 100px;
        background: linear-gradient(135deg, ${accentFrom} 0%, ${accentTo} 100%);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .content {
        padding: 40px 30px;
      }
      .title {
        font-size: 24px;
        font-weight: 800;
        color: #0f172a;
        margin-top: 0;
        margin-bottom: 20px;
        text-align: center;
      }
      .message {
        font-size: 15px;
        line-height: 1.8;
        color: #334155;
        margin-bottom: 30px;
      }
      .footer {
        padding: 20px;
        background-color: #f8fafc;
        border-top: 1px solid #e2e8f0;
        text-align: center;
        font-size: 12px;
        color: #64748b;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header-bar">
        <span style="font-size: 42px;">${emoji}</span>
      </div>
      <div class="content">
        <h1 class="title">${subject}</h1>
        <div class="message">
          ${formattedBody}
        </div>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} Your Workspace. All rights reserved.
      </div>
    </div>
  </body>
</html>`
}

// Trigger-specific default email templates
function getTemplateDefaults(triggerType: string, workflowName: string) {
  const templates: Record<string, {
    campaignName: string
    subject: string
    bodyText: string
    accentFrom: string
    accentTo: string
    emoji: string
  }> = {
    NEW_CONTACT: {
      campaignName: `${workflowName} — Welcome Email`,
      subject: "Welcome aboard! 👋",
      bodyText: "Hi {{firstName}},\n\nThank you for joining us! We're thrilled to have you on board.\n\nIf you need any assistance, don't hesitate to reach out. We're here to help!\n\nWarm regards,\nThe Team",
      accentFrom: "#3b82f6",
      accentTo: "#06b6d4",
      emoji: "👋"
    },
    TAG_ADDED: {
      campaignName: `${workflowName} — Tag Notification`,
      subject: "You've been added to a special group! ⭐",
      bodyText: "Hi {{firstName}},\n\nGreat news! You've been selected for a special group in our community.\n\nStay tuned for exclusive updates and offers coming your way.\n\nBest regards,\nThe Team",
      accentFrom: "#8b5cf6",
      accentTo: "#a855f7",
      emoji: "🏷️"
    },
    CAMPAIGN_OPENED: {
      campaignName: `${workflowName} — Follow-Up Email`,
      subject: "Thanks for reading! Here's more for you 📬",
      bodyText: "Hi {{firstName}},\n\nWe noticed you checked out our recent email — thank you!\n\nHere's some additional information we thought you'd find valuable.\n\nFeel free to reply if you have any questions!\n\nBest,\nThe Team",
      accentFrom: "#f59e0b",
      accentTo: "#ef4444",
      emoji: "📬"
    },
    LINK_CLICKED: {
      campaignName: `${workflowName} — Engagement Email`,
      subject: "We're glad you're interested! 🔗",
      bodyText: "Hi {{firstName}},\n\nThanks for your interest! Since you clicked, we wanted to share more details.\n\nWe'd love to help you take the next step. Reply to this email or visit our website for more.\n\nCheers,\nThe Team",
      accentFrom: "#10b981",
      accentTo: "#059669",
      emoji: "🔗"
    },
    BIRTHDAY: {
      campaignName: `${workflowName} — Birthday Greeting`,
      subject: "Happy Birthday! 🎂",
      bodyText: "Dear {{firstName}},\n\nWishing you a wonderful birthday filled with happiness and success!\n\nHere's to an amazing year ahead. 🎉\n\nWarm wishes,\nThe Team",
      accentFrom: "#f59e0b",
      accentTo: "#ec4899",
      emoji: "🎂"
    }
  }

  return templates[triggerType] || {
    campaignName: `${workflowName} — Automated Email`,
    subject: "Hello from us! ✉️",
    bodyText: "Hi {{firstName}},\n\nThis is an automated message from our team.\n\nWe appreciate your continued support!\n\nBest regards,\nThe Team",
    accentFrom: "#6366f1",
    accentTo: "#8b5cf6",
    emoji: "✉️"
  }
}

export async function createAutomation(name: string, triggerType: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    // Get trigger labels for clean displaying
    const triggerLabels: Record<string, string> = {
      NEW_CONTACT: "When: Contact Created",
      TAG_ADDED: "When: Tag Added",
      CAMPAIGN_OPENED: "When: Campaign Opened",
      LINK_CLICKED: "When: Link Clicked",
      BIRTHDAY: "When: Contact's Birthday"
    }

    const triggerLabel = triggerLabels[triggerType] || `Trigger: ${triggerType}`

    // 1. Auto-generate an email campaign template with pre-filled content
    const tpl = getTemplateDefaults(triggerType, name)
    const htmlContent = buildAutomationEmailHtml(
      tpl.subject,
      tpl.bodyText,
      tpl.accentFrom,
      tpl.accentTo,
      tpl.emoji
    )

    const campaign = await prisma.campaign.create({
      data: {
        name: tpl.campaignName,
        subject: tpl.subject,
        htmlContent,
        designContent: {
          subject: tpl.subject,
          bodyText: tpl.bodyText,
          bannerUrl: ""
        } as any,
        status: "DRAFT",
        organizationId
      }
    })

    // 2. Create trigger + action nodes already linked to the campaign template
    const initialNodes = [
      {
        id: "trigger-node",
        type: "triggerNode",
        position: { x: 250, y: 100 },
        data: { label: triggerLabel, type: triggerType, config: {} }
      },
      {
        id: "action-node-1",
        type: "actionNode",
        position: { x: 250, y: 280 },
        data: { actionType: "SEND_EMAIL", label: "Send Email Campaign", campaignId: campaign.id }
      }
    ]

    const initialEdges = [
      {
        id: "e-trigger-action",
        source: "trigger-node",
        target: "action-node-1"
      }
    ]

    const actionsJson = [
      {
        nodeId: "action-node-1",
        actionType: "SEND_EMAIL",
        campaignId: campaign.id,
        waitDays: 0,
        tagName: ""
      }
    ]

    const rule = await prisma.automationRule.create({
      data: {
        name,
        triggerType: triggerType as any,
        triggerConfig: { status: "ACTIVE", description: `Triggered when ${triggerType.toLowerCase()}` },
        actions: actionsJson,
        nodes: initialNodes,
        edges: initialEdges,
        isActive: false,
        organizationId
      }
    })

    await logActivity(`Created automation workflow "${name}" with template "${tpl.campaignName}"`, "SETTINGS")

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
