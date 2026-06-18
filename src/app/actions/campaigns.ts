"use server"

import { db as prisma } from "@/lib/db"
import { logActivity } from "./dashboard"
import { getActiveWorkspaceContext, enforceWorkspaceEditor } from "@/lib/tenant"
import { inngest } from "@/inngest/client"

export async function getCampaigns() {
  try {
    const { organizationId } = await getActiveWorkspaceContext()
    
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return { success: true, data: campaigns }
  } catch (error) {
    console.error("Failed to fetch campaigns:", error)
    return { success: false, error: "Failed to fetch campaigns" }
  }
}

export async function getCampaignById(id: string) {
  try {
    const { organizationId } = await getActiveWorkspaceContext()
    
    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId },
    })
    if (!campaign) return { success: false, error: "Campaign not found" }
    return { success: true, data: campaign }
  } catch (error) {
    console.error("Failed to fetch campaign details:", error)
    return { success: false, error: "Failed to fetch campaign details" }
  }
}

export async function createCampaign(name: string, subject: string, previewText?: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    const newCampaign = await prisma.campaign.create({
      data: {
        name,
        subject,
        previewText: previewText || "",
        status: "DRAFT",
        organizationId,
      },
    })

    await logActivity(`Created campaign "${name}"`, "CAMPAIGN", newCampaign.id)

    return { success: true, data: newCampaign }
  } catch (error) {
    console.error("Failed to create campaign:", error)
    return { success: false, error: "Failed to create campaign" }
  }
}

export async function updateCampaignDesign(id: string, htmlContent: string, designContent: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    // Verify campaign ownership before update
    const existing = await prisma.campaign.findFirst({
      where: { id, organizationId }
    })
    if (!existing) return { success: false, error: "Campaign not found" }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        htmlContent,
        designContent: designContent ? JSON.parse(designContent) : null,
      },
    })

    await logActivity(`Updated email template for "${campaign.name}"`, "CAMPAIGN", id)

    return { success: true, data: campaign }
  } catch (error) {
    console.error("Failed to update campaign design:", error)
    return { success: false, error: "Failed to save design draft" }
  }
}

export async function cloneCampaign(id: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    const original = await prisma.campaign.findFirst({
      where: { id, organizationId },
    })
    if (!original) return { success: false, error: "Original campaign not found" }

    const cloned = await prisma.campaign.create({
      data: {
        name: `${original.name} (Clone)`,
        subject: original.subject,
        previewText: original.previewText,
        htmlContent: original.htmlContent,
        designContent: original.designContent as any,
        status: "DRAFT",
        organizationId,
      },
    })

    await logActivity(`Cloned campaign "${original.name}"`, "CAMPAIGN", cloned.id)

    return { success: true, data: cloned }
  } catch (error) {
    console.error("Failed to clone campaign:", error)
    return { success: false, error: "Failed to clone campaign" }
  }
}

export async function deleteCampaign(id: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    // Verify campaign ownership before delete
    const existing = await prisma.campaign.findFirst({
      where: { id, organizationId }
    })
    if (!existing) return { success: false, error: "Campaign not found" }

    const campaign = await prisma.campaign.delete({
      where: { id },
    })

    await logActivity(`Deleted campaign "${campaign.name}"`, "CAMPAIGN", id)

    return { success: true }
  } catch (error) {
    console.error("Failed to delete campaign:", error)
    return { success: false, error: "Failed to delete campaign" }
  }
}

export async function toggleCampaignStatus(id: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    // Verify campaign ownership before updates
    const campaign = await prisma.campaign.findFirst({ 
      where: { id, organizationId } 
    })
    if (!campaign) return { success: false, error: "Campaign not found" }

    let newStatus = "DRAFT"
    if (campaign.status === "DRAFT") newStatus = "SCHEDULED"
    else if (campaign.status === "SCHEDULED") newStatus = "PAUSED"
    else if (campaign.status === "PAUSED") newStatus = "ACTIVE"
    else if (campaign.status === "ACTIVE") newStatus = "PAUSED"

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: newStatus as any },
    })

    await logActivity(`Changed status of campaign "${campaign.name}" to ${newStatus}`, "CAMPAIGN", id)

    return { success: true, data: updated }
  } catch (error) {
    console.error("Failed to toggle campaign status:", error)
    return { success: false, error: "Failed to update campaign state" }
  }
}

export async function sendTestCampaign(id: string, recipientEmail: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    // Verify campaign ownership
    const campaign = await prisma.campaign.findFirst({ 
      where: { id, organizationId } 
    })
    if (!campaign) return { success: false, error: "Campaign not found" }

    // Count contacts in the active workspace to simulate realistic counts
    const totalContacts = await prisma.contact.count({
      where: { organizationId }
    })
    const simulatedSent = totalContacts > 0 ? totalContacts : 120
    const simulatedOpens = Math.floor(simulatedSent * (0.3 + Math.random() * 0.4))
    const simulatedClicks = Math.floor(simulatedOpens * (0.1 + Math.random() * 0.3))
    const simulatedBounces = Math.floor(simulatedSent * 0.02)

    await prisma.campaign.update({
      where: { id },
      data: {
        status: "COMPLETED",
        sentCount: simulatedSent,
        openCount: simulatedOpens,
        clickCount: simulatedClicks,
        bounceCount: simulatedBounces,
      },
    })

    await logActivity(`Sent campaign "${campaign.name}" to ${simulatedSent} recipients (Test target: ${recipientEmail})`, "CAMPAIGN", id)

    // Trigger simulated automations for target contacts in this organization
    try {
      const orgContacts = await prisma.contact.findMany({
        where: { organizationId, status: "ACTIVE" },
        take: 10
      })
      for (const c of orgContacts) {
        if (Math.random() < 0.6) {
          await inngest.send({
            name: "campaigns/opened",
            data: { contactId: c.id, campaignId: id, organizationId }
          })
          if (Math.random() < 0.5) {
            await inngest.send({
              name: "campaigns/clicked",
              data: { contactId: c.id, campaignId: id, linkUrl: "https://example.com/promo-link", organizationId }
            })
          }
        }
      }
    } catch (inngestErr) {
      console.error("Failed to send inngest events in sendTestCampaign:", inngestErr)
    }

    return { success: true, sentCount: simulatedSent }
  } catch (error) {
    console.error("Failed to send test campaign:", error)
    return { success: false, error: "Failed to complete email simulation" }
  }
}

export async function updateCampaignMetadata(id: string, subject: string, previewText: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    // Verify campaign ownership before updating
    const existing = await prisma.campaign.findFirst({
      where: { id, organizationId }
    })
    if (!existing) return { success: false, error: "Campaign not found" }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        subject,
        previewText
      }
    })

    await logActivity(`Updated subject and preview text for "${campaign.name}"`, "CAMPAIGN", id)

    return { success: true, data: campaign }
  } catch (error) {
    console.error("Failed to update campaign metadata:", error)
    return { success: false, error: "Failed to update campaign details" }
  }
}

