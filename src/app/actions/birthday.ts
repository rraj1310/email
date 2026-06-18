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

    // Load active Birthday template fields
    const campaign = await prisma.campaign.findFirst({
      where: {
        organizationId,
        name: "Birthday Greeting Template"
      }
    })

    let templateConfig = {
      subject: "Happy Birthday! 🎂",
      bodyText: "Wishing you a wonderful year ahead filled with happiness and success!",
      bannerUrl: ""
    }

    if (campaign && campaign.designContent) {
      try {
        const parsed = typeof campaign.designContent === "string"
          ? JSON.parse(campaign.designContent)
          : campaign.designContent
        if (parsed && typeof parsed === "object") {
          templateConfig = {
            subject: parsed.subject || templateConfig.subject,
            bodyText: parsed.bodyText || templateConfig.bodyText,
            bannerUrl: parsed.bannerUrl || ""
          }
        }
      } catch (e) {
        console.error("Failed to parse campaign designContent:", e)
      }
    }

    return {
      success: true,
      data: {
        birthdayAutomationEnabled: org.birthdayAutomationEnabled,
        birthdayEmailTime: org.birthdayEmailTime,
        todayBirthdays,
        templateConfig
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

// Action: Save simple birthday automation configuration
export async function saveSimpleBirthdayConfig(campaignId: string, enabled: boolean, time: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    // 1. Update organization settings
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        birthdayAutomationEnabled: enabled,
        birthdayEmailTime: time
      }
    })

    // 2. Find or create the birthday automation rule
    let rule = await prisma.automationRule.findFirst({
      where: {
        organizationId,
        triggerType: "BIRTHDAY"
      }
    })

    const initialNodes = [
      {
        id: "trigger-node",
        type: "triggerNode",
        position: { x: 250, y: 100 },
        data: { label: "When: Contact's Birthday", type: "BIRTHDAY", config: {} }
      },
      {
        id: "action-node-1",
        type: "actionNode",
        position: { x: 250, y: 280 },
        data: { actionType: "SEND_EMAIL", label: "Send Email Campaign", campaignId }
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
        campaignId,
        waitDays: 0,
        tagName: ""
      }
    ]

    if (rule) {
      // Update existing
      rule = await prisma.automationRule.update({
        where: { id: rule.id },
        data: {
          isActive: enabled,
          nodes: initialNodes,
          edges: initialEdges,
          actions: actionsJson
        }
      })
    } else {
      // Create new
      rule = await prisma.automationRule.create({
        data: {
          name: "Automatic Birthday Greeting",
          triggerType: "BIRTHDAY",
          triggerConfig: { status: "ACTIVE", description: "Triggered on contact's birthday" },
          actions: actionsJson,
          nodes: initialNodes,
          edges: initialEdges,
          isActive: enabled,
          organizationId
        }
      })
    }

    await logActivity(
      `Configured simple birthday automation: ${enabled ? 'ENABLED' : 'DISABLED'} at ${time} with template ID ${campaignId}`,
      "SETTINGS",
      undefined,
      undefined,
      organizationId
    )

    return { success: true, data: rule }
  } catch (error: any) {
    console.error("Failed to save simple birthday config:", error)
    return { success: false, error: error.message || "Failed to save configuration" }
  }
}

function buildBirthdayEmailHtml(subject: string, bodyText: string, bannerUrl: string | null) {
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
      .banner-container {
        width: 100%;
        text-align: center;
        background: linear-gradient(135deg, #a78bfa 0%, #ec4899 100%);
      }
      .banner-img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0 auto;
      }
      .content {
        padding: 40px 30px;
      }
      .title {
        font-size: 26px;
        font-weight: 800;
        color: #0f172a;
        margin-top: 0;
        margin-bottom: 20px;
        text-align: center;
      }
      .message {
        font-size: 16px;
        line-height: 1.8;
        color: #334155;
        margin-bottom: 30px;
      }
      .footer {
        padding: 25px;
        background-color: #f8fafc;
        border-top: 1px solid #e2e8f0;
        text-align: center;
        font-size: 12px;
        color: #64748b;
      }
      .tag-note {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 15px;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      \${bannerUrl ? \`
      <div class="banner-container">
        <img class="banner-img" src="\${bannerUrl}" alt="Birthday Celebration" />
      </div>
      \` : \`
      <div style="height: 120px; background: linear-gradient(135deg, #a78bfa 0%, #ec4899 100%); display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 42px;">🎂</span>
      </div>
      \`}
      <div class="content">
        <h1 class="title">Happy Birthday!</h1>
        <div class="message">
          \${formattedBody}
        </div>
        <div class="tag-note">
          Sent automatically on your special day.
        </div>
      </div>
      <div class="footer">
        © \${new Date().getFullYear()} Workspace Automations. All rights reserved.
      </div>
    </div>
  </body>
</html>`
}

export async function saveSimpleBirthdayMessage(
  subject: string,
  bodyText: string,
  bannerUrl: string | null,
  enabled: boolean,
  time: string
) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    // 1. Create or update campaign
    let campaign = await prisma.campaign.findFirst({
      where: {
        organizationId,
        name: "Birthday Greeting Template"
      }
    })

    const htmlContent = buildBirthdayEmailHtml(subject, bodyText, bannerUrl)
    const designContent = { subject, bodyText, bannerUrl }

    if (campaign) {
      campaign = await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          subject,
          htmlContent,
          designContent: designContent as any
        }
      })
    } else {
      campaign = await prisma.campaign.create({
        data: {
          name: "Birthday Greeting Template",
          subject,
          htmlContent,
          designContent: designContent as any,
          status: "DRAFT",
          organizationId
        }
      })
    }

    // 2. Setup the Automation Rule flow linking to this campaign
    return await saveSimpleBirthdayConfig(campaign.id, enabled, time)
  } catch (error: any) {
    console.error("Failed to save simple birthday message:", error)
    return { success: false, error: error.message || "Failed to save settings" }
  }
}

