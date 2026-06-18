"use server"

import { db as prisma } from "@/lib/db"
import { getActiveWorkspaceContext, enforceWorkspaceEditor } from "@/lib/tenant"
import { logActivity } from "./dashboard"
import { inngest } from "@/inngest/client"
import { enrollContactInWorkflow } from "@/lib/automation-engine"

// Helper to get today's month and day in Asia/Kolkata timezone
export async function getTodayIST() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    month: "numeric",
    day: "numeric",
    year: "numeric"
  })
  const parts = formatter.formatToParts(new Date())
  const month = parseInt(parts.find(p => p.type === "month")!.value, 10)
  const day = parseInt(parts.find(p => p.type === "day")!.value, 10)
  const year = parseInt(parts.find(p => p.type === "year")!.value, 10)
  return { month, day, year }
}

// Helper to get start of today in IST as a UTC date boundary
export async function getStartOfTodayIST() {
  const { year, month, day } = await getTodayIST()
  const monthStr = String(month).padStart(2, '0')
  const dayStr = String(day).padStart(2, '0')
  return new Date(`${year}-${monthStr}-${dayStr}T00:00:00+05:30`)
}

// Shared core logic for birthday checks, scoped to single organization
export async function runBirthdayCheckForOrg(organizationId: string, ignoreTimeCheck = false) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId }
  })
  if (!org) return { success: false, error: "Organization not found" }

  // 1. Time Check
  if (!ignoreTimeCheck) {
    const istHourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    }).format(new Date());
    const currentHour = parseInt(istHourStr, 10);

    const [configHour] = org.birthdayEmailTime.split(":")
    if (currentHour !== parseInt(configHour, 10)) {
      return { success: true, reason: `Skipping. Current hour ${currentHour} != configured hour ${configHour}` }
    }
  }

  // 2. Fetch active rules for trigger BIRTHDAY
  const activeRules = await prisma.automationRule.findMany({
    where: {
      organizationId,
      isActive: true,
      triggerType: "BIRTHDAY"
    }
  })
  if (activeRules.length === 0) {
    return { success: true, reason: "No active birthday automation rules found" }
  }

  // 3. Find contacts whose birthdays match today (IST)
  const { month: todayMonth, day: todayDay } = await getTodayIST()
  const allContacts = await prisma.contact.findMany({
    where: {
      organizationId,
      status: "ACTIVE"
    }
  })

  const bdayContacts = allContacts.filter(c => {
    if (!c.birthday) return false
    const bdate = new Date(c.birthday)
    const bMonth = bdate.getUTCMonth() + 1
    const bDay = bdate.getUTCDate()
    return bMonth === todayMonth && bDay === todayDay
  })

  if (bdayContacts.length === 0) {
    return { success: true, reason: "No birthdays today" }
  }

  let processedCount = 0
  const startOfTodayIST = await getStartOfTodayIST()

  for (const contact of bdayContacts) {
    for (const rule of activeRules) {
      // Guard against duplicate same-day enrollments
      const alreadyEnrolledToday = await prisma.automationLog.findFirst({
        where: {
          contactId: contact.id,
          automationRuleId: rule.id,
          action: "ENTERED",
          createdAt: { gte: startOfTodayIST }
        }
      })

      if (alreadyEnrolledToday) {
        console.log(`Skipping duplicate birthday run for ${contact.email} today.`)
        continue
      }

      // Enroll in workflow
      const state = await enrollContactInWorkflow(contact.id, rule.id, organizationId)
      if (state) {
        await inngest.send({
          name: "automation/run-journey",
          data: {
            contactId: contact.id,
            automationRuleId: rule.id,
            organizationId,
            currentStateId: "trigger-node"
          }
        })
        processedCount++
      }
    }
  }

  if (processedCount > 0) {
    // Log workspace activity feed
    await logActivity(
      `Dispatched birthday emails to ${processedCount} client(s)`,
      "CAMPAIGN",
      undefined,
      { count: processedCount },
      organizationId
    )
  }

  return { success: true, count: processedCount }
}

// Action: Fetch settings & today's birthday preview
export async function getBirthdaySettings() {
  try {
    const { organizationId } = await getActiveWorkspaceContext()

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        birthdayAutomationEnabled: true,
        birthdayEmailTime: true
      }
    })

    if (!org) return { success: false, error: "Workspace settings not found" }

    // Fetch list of today's birthdays for preview
    const { month: todayMonth, day: todayDay } = await getTodayIST()
    const allContacts = await prisma.contact.findMany({
      where: {
        organizationId,
        status: "ACTIVE"
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        birthday: true
      }
    })

    const todayBirthdays = allContacts.filter(c => {
      if (!c.birthday) return false
      const bdate = new Date(c.birthday)
      return (bdate.getUTCMonth() + 1) === todayMonth && bdate.getUTCDate() === todayDay
    }).map(c => ({
      id: c.id,
      name: [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed Contact",
      email: c.email
    }))

    return {
      success: true,
      data: {
        birthdayAutomationEnabled: org.birthdayAutomationEnabled,
        birthdayEmailTime: org.birthdayEmailTime,
        todayBirthdays
      }
    }
  } catch (error: any) {
    console.error("Failed to load birthday settings:", error)
    return { success: false, error: error.message || "Failed to load birthday automation settings" }
  }
}

// Action: Update configuration settings
export async function updateBirthdaySettings(enabled: boolean, time: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        birthdayAutomationEnabled: enabled,
        birthdayEmailTime: time
      }
    })

    await logActivity(
      `Updated birthday automation preferences to: ${enabled ? 'ENABLED' : 'DISABLED'} at ${time}`,
      "SETTINGS",
      undefined,
      undefined,
      organizationId
    )

    return { success: true, data: updated }
  } catch (error: any) {
    console.error("Failed to save birthday settings:", error)
    return { success: false, error: error.message || "Failed to save settings changes" }
  }
}

// Action: Trigger birthday checks for active workspace manually immediately
export async function triggerBirthdayCheckNow() {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    // Bypasses the time check since manual trigger was requested
    const result = await runBirthdayCheckForOrg(organizationId, true)
    
    if (result.success) {
      return { success: true, count: result.count || 0 }
    } else {
      return { success: false, error: result.error || "Failed to run check" }
    }
  } catch (error: any) {
    console.error("Manual birthday trigger failed:", error)
    return { success: false, error: error.message || "Failed manual trigger execution" }
  }
}
