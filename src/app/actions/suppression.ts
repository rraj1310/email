"use server"

import { db as prisma } from "@/lib/db"
import { logActivity } from "./dashboard"
import { getActiveWorkspaceContext, enforceWorkspaceEditor } from "@/lib/tenant"

export async function getSuppressionList() {
  try {
    const { organizationId } = await getActiveWorkspaceContext()
    
    const list = await prisma.suppressionList.findMany({
      where: { organizationId },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return { success: true, data: list }
  } catch (error) {
    console.error("Failed to fetch suppression list:", error)
    return { success: false, error: "Failed to fetch suppression list" }
  }
}

export async function addSuppressedEmail(email: string, reason: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    // Normalize email
    const cleanEmail = email.trim().toLowerCase()

    // Check if already in list for this organization
    const existing = await prisma.suppressionList.findFirst({
      where: {
        email: cleanEmail,
        organizationId
      }
    })

    if (existing) {
      return { success: false, error: "Email is already on the suppression list" }
    }

    const entry = await prisma.suppressionList.create({
      data: {
        email: cleanEmail,
        reason: reason.toUpperCase() as any, // UNSUBSCRIBED, BOUNCED, COMPLAINED
        scope: "ORGANIZATION" as any,
        organizationId
      }
    })

    // Also update any matching contact's status to UNSUBSCRIBED/BOUNCED in this workspace
    await prisma.contact.updateMany({
      where: {
        email: cleanEmail,
        organizationId
      },
      data: {
        status: reason.toUpperCase() === "UNSUBSCRIBED" ? "UNSUBSCRIBED" as any : "BOUNCED" as any
      }
    })

    await logActivity(`Added "${cleanEmail}" to suppression list (${reason})`, "SETTINGS")

    return { success: true, data: entry }
  } catch (error) {
    console.error("Failed to add to suppression list:", error)
    return { success: false, error: "Failed to add email to suppression list" }
  }
}

export async function removeSuppressedEmail(id: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    // Verify workspace ownership before delete
    const existing = await prisma.suppressionList.findFirst({
      where: { id, organizationId }
    })
    if (!existing) return { success: false, error: "Suppression record not found" }

    await prisma.suppressionList.delete({
      where: { id }
    })

    // Re-activate contact if they are suppressed in this organization
    await prisma.contact.updateMany({
      where: {
        email: existing.email,
        organizationId,
        status: { in: ["UNSUBSCRIBED", "BOUNCED", "COMPLAINED"] }
      },
      data: {
        status: "ACTIVE"
      }
    })

    await logActivity(`Removed "${existing.email}" from suppression list`, "SETTINGS")

    return { success: true }
  } catch (error) {
    console.error("Failed to remove from suppression list:", error)
    return { success: false, error: "Failed to remove email from suppression list" }
  }
}

export async function getSuppressionStats() {
  try {
    const { organizationId } = await getActiveWorkspaceContext()

    const unsubscribed = await prisma.suppressionList.count({
      where: { organizationId, reason: "UNSUBSCRIBED" }
    })

    const bounced = await prisma.suppressionList.count({
      where: { organizationId, reason: { in: ["BOUNCED", "HARD_BOUNCE"] } }
    })

    const complained = await prisma.suppressionList.count({
      where: { organizationId, reason: "COMPLAINED" }
    })

    return {
      success: true,
      data: {
        unsubscribed,
        bounced,
        complained,
        total: unsubscribed + bounced + complained
      }
    }
  } catch (error) {
    console.error("Failed to fetch suppression stats:", error)
    return { success: false, error: "Failed to fetch stats" }
  }
}
