"use server"

import { db as prisma } from "@/lib/db"
import { logActivity } from "./dashboard"
import { getActiveWorkspaceContext, enforceWorkspaceAdmin } from "@/lib/tenant"

export async function getSettings() {
  try {
    const { organizationId, role, userId } = await getActiveWorkspaceContext()
    
    let org = await prisma.organization.findUnique({
      where: { id: organizationId }
    })
    
    if (!org) {
      // Fallback: If no org is found, create the default one (e.g. if database is reset)
      org = await prisma.organization.create({
        data: {
          id: organizationId,
          name: "Acme Corp",
          brandColorPrimary: "#0f172a",
          customDomain: "marketing.acme.com",
          customEmailFooter: "© Acme Corp. All rights reserved. You received this email because you subscribed to our list."
        }
      })
    }

    // Ensure user has a membership record for their active workspace (for legacy seed users)
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: org.id
        }
      }
    })
    if (!existingMembership) {
      await prisma.membership.create({
        data: {
          userId,
          organizationId: org.id,
          role
        }
      })
    }

    const memberships = await prisma.membership.findMany({
      where: { organizationId: org.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    const users = memberships.map(m => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      createdAt: m.createdAt
    }))

    return {
      success: true,
      data: {
        organization: org,
        users: users
      }
    }
  } catch (error: any) {
    console.error("Failed to load settings:", error)
    return { success: false, error: error.message || "Failed to load settings profile" }
  }
}

export async function updateOrganizationSettings(data: {
  name: string
  brandColorPrimary?: string
  customDomain?: string
  customEmailFooter?: string
  aiProvider?: string
  aiApiKey?: string
  aiModelOverride?: string
}) {
  try {
    const { organizationId } = await enforceWorkspaceAdmin()

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: data.name,
        brandColorPrimary: data.brandColorPrimary,
        customDomain: data.customDomain,
        customEmailFooter: data.customEmailFooter,
        aiProvider: data.aiProvider,
        aiApiKey: data.aiApiKey,
        aiModelOverride: data.aiModelOverride
      }
    })

    await logActivity(`Updated organization branding and AI configurations`, "SETTINGS")

    return { success: true, data: org }
  } catch (error: any) {
    console.error("Failed to update organization settings:", error)
    return { success: false, error: error.message || "Failed to save organization changes" }
  }
}
