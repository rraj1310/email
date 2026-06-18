"use server"

import { db as prisma } from "@/lib/db"
import { getActiveWorkspaceContext } from "@/lib/tenant"

export async function getDashboardStats() {
  try {
    const { organizationId } = await getActiveWorkspaceContext()

    // 1. Total Contacts count in this workspace
    const totalContacts = await prisma.contact.count({
      where: { organizationId }
    })

    // 2. Aggregate Campaign Metrics in this workspace
    const campaignsMetrics = await prisma.campaign.aggregate({
      where: { organizationId },
      _sum: {
        sentCount: true,
        openCount: true,
        clickCount: true,
        bounceCount: true,
      }
    })

    const totalSent = campaignsMetrics._sum.sentCount || 0
    const totalOpens = campaignsMetrics._sum.openCount || 0
    const totalClicks = campaignsMetrics._sum.clickCount || 0
    const totalBounces = campaignsMetrics._sum.bounceCount || 0

    // Calculate rates
    const openRate = totalSent > 0 ? (totalOpens / totalSent) * 100 : 0
    const clickRate = totalSent > 0 ? (totalClicks / totalSent) * 100 : 0
    const bounceRate = totalSent > 0 ? (totalBounces / totalSent) * 100 : 0

    // 3. Get Recent Campaigns for Engagement chart in this workspace
    const recentCampaigns = await prisma.campaign.findMany({
      where: { organizationId },
      take: 6,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        name: true,
        sentCount: true,
        openCount: true,
        clickCount: true,
      }
    })

    // Prepare chart data format
    const chartData = recentCampaigns.map(c => ({
      name: c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name,
      opens: c.openCount,
      clicks: c.clickCount,
      sent: c.sentCount,
    })).reverse()

    // 4. Get suppression counts for rates in this workspace
    const unsubscribedCount = await prisma.suppressionList.count({
      where: { organizationId, reason: "UNSUBSCRIBED" }
    })
    const totalSuppressed = await prisma.suppressionList.count({
      where: { organizationId }
    })
    const unsubscribeRate = totalContacts > 0 ? (unsubscribedCount / totalContacts) * 100 : 0

    // 5. Fetch recent activity logs in this workspace
    const recentActivities = await prisma.activityLog.findMany({
      where: { organizationId },
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true
          }
        },
      }
    })

    const formattedActivities = recentActivities.map(act => {
      let timeString = "Just now"
      const diffMs = Date.now() - new Date(act.createdAt).getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) timeString = "Just now"
      else if (diffMins < 60) timeString = `${diffMins}m ago`
      else if (diffHours < 24) timeString = `${diffHours}h ago`
      else timeString = `${diffDays}d ago`

      return {
        id: act.id,
        action: act.action,
        entityType: act.entityType,
        details: act.details,
        user: act.user?.name || "System",
        time: timeString,
      }
    })

    return {
      success: true,
      data: {
        totalContacts,
        totalSent,
        openRate: Number(openRate.toFixed(1)),
        clickRate: Number(clickRate.toFixed(1)),
        bounceRate: Number(bounceRate.toFixed(1)),
        unsubscribeRate: Number(unsubscribeRate.toFixed(1)),
        totalSuppressed,
        chartData,
        activities: formattedActivities,
      }
    }
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error)
    return {
      success: false,
      error: "Failed to load dashboard metrics"
    }
  }
}

export async function logActivity(
  action: string, 
  entityType: string, 
  entityId?: string, 
  details?: Record<string, unknown>,
  overrideOrgId?: string,
  overrideUserId?: string
) {
  try {
    let orgId = overrideOrgId
    let userId = overrideUserId

    // If not overridden, retrieve from session context
    if (!orgId) {
      try {
        const context = await getActiveWorkspaceContext()
        orgId = context.organizationId
        userId = context.userId
      } catch (err) {
        // Log locally or handle fallback quietly for background queues
      }
    }

    if (!orgId) {
      console.warn(`logActivity failed: No organizationId provided for action "${action}"`)
      return { success: false, error: "Organization context not found" }
    }

    await prisma.activityLog.create({
      data: {
        action,
        entityType,
        entityId,
        details: (details as any) || undefined,
        organizationId: orgId,
        userId: userId || null,
      }
    })
    return { success: true }
  } catch (error) {
    console.error("Failed to log activity:", error)
    return { success: false }
  }
}
