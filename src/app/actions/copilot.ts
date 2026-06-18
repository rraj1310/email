"use server"

import { db as prisma } from "@/lib/db"
import { getActiveWorkspaceContext, enforceWorkspaceEditor } from "@/lib/tenant"
import { generateText } from "@/lib/ai-provider"

// -------------------------------------------------------------
// 1. AI INSIGHTS ENGINE (Campaigns, Automations, Trends, Timing)
// -------------------------------------------------------------

export async function getCampaignInsights(campaignId: string) {
  try {
    const { organizationId } = await getActiveWorkspaceContext()

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, organizationId }
    })

    if (!campaign) {
      return { success: false, error: "Campaign not found" }
    }

    const { sentCount, openCount, clickCount, bounceCount, name, subject } = campaign
    const openRate = sentCount > 0 ? (openCount / sentCount) * 100 : 0
    const clickRate = sentCount > 0 ? (clickCount / sentCount) * 100 : 0

    const prompt = `
      Analyze the performance metrics of the email campaign "${name}" with subject "${subject || 'No Subject'}":
      - Emails Sent: ${sentCount}
      - Email Opens: ${openCount} (${openRate.toFixed(1)}% Open Rate)
      - Email Clicks: ${clickCount} (${clickRate.toFixed(1)}% Click Rate)
      - Bounces: ${bounceCount}

      Please generate 3 brief, actionable insights (maximum 2 sentences per bullet point) highlighting trends, potential content flaws, or suggestions for the next send.
      Format the response as a plain text bulleted list (using "* " for bullets).
    `

    const response = await generateText({
      organizationId,
      feature: "INSIGHTS",
      prompt,
      systemPrompt: "You are a professional email marketing analyst. Provide clear, data-driven narrative insights based on the provided stats."
    })

    return response
  } catch (error: any) {
    console.error("Failed to generate campaign insights:", error)
    return { success: false, error: error.message || "Failed to compile campaign performance insights." }
  }
}

export async function getAutomationInsights(ruleId: string) {
  try {
    const { organizationId } = await getActiveWorkspaceContext()

    const rule = await prisma.automationRule.findFirst({
      where: { id: ruleId, organizationId }
    })

    if (!rule) {
      return { success: false, error: "Automation rule not found" }
    }

    // Get contact states
    const active = await prisma.contactAutomationState.count({
      where: { automationRuleId: ruleId, status: "ACTIVE" }
    })
    const completed = await prisma.contactAutomationState.count({
      where: { automationRuleId: ruleId, status: "COMPLETED" }
    })
    const exited = await prisma.contactAutomationState.count({
      where: { automationRuleId: ruleId, status: "EXITED" }
    })
    const totalEnrolled = active + completed + exited

    // Fetch exit log messages
    const failLogs = await prisma.automationLog.findMany({
      where: { automationRuleId: ruleId, action: "FAILED" },
      take: 5,
      select: { details: true }
    })

    const parsedFailures = failLogs.map(log => {
      const d = log.details as any
      return d?.message || d?.error || JSON.stringify(log.details)
    }).join("; ")

    const prompt = `
      Analyze this marketing automation workflow: "${rule.name}"
      - Trigger: ${rule.triggerType}
      - Total Contacts Enrolled: ${totalEnrolled}
      - Contacts Currently Active in Queue: ${active}
      - Contacts Completed Journey: ${completed}
      - Contacts Exited Prematurely: ${exited}
      - Recent Failures/Exit Details: ${parsedFailures || "None recorded"}

      Provide 3 narrative suggestions on how to improve this workflow journey. Address drop-offs (exited vs completed ratios), connection warnings, and potential delay optimizations.
      Format the response as a plain text bulleted list (using "* " for bullets).
    `

    const response = await generateText({
      organizationId,
      feature: "INSIGHTS",
      prompt,
      systemPrompt: "You are a senior marketing operations engineer. Provide concise suggestions to optimize drip campaigns and automations."
    })

    return response
  } catch (error: any) {
    console.error("Failed to generate automation insights:", error)
    return { success: false, error: error.message || "Failed to generate workflow drop-off analytics." }
  }
}

export async function getEngagementTrends() {
  try {
    const { organizationId } = await getActiveWorkspaceContext()

    // Fetch campaigns
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { name: true, sentCount: true, openCount: true, clickCount: true }
    })

    // Fetch contact growth
    const totalContacts = await prisma.contact.count({
      where: { organizationId }
    })
    const lastWeekContacts = await prisma.contact.count({
      where: {
        organizationId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    })

    const campaignStatsText = campaigns.map(c => 
      `Campaign: "${c.name}", Sent: ${c.sentCount}, Opens: ${c.openCount}, Clicks: ${c.clickCount}`
    ).join("\n")

    const prompt = `
      Examine these workspace-wide engagement parameters:
      - Total Contacts database size: ${totalContacts} (${lastWeekContacts} added in the last 7 days)
      - Performance logs of recent campaigns:
      ${campaignStatsText || "No completed campaigns recorded yet."}

      Provide a high-level summary (3 bullet points, maximum 2 sentences each) representing the overall list health and engagement trend.
      Format the response as a plain text bulleted list (using "* " for bullets).
    `

    const response = await generateText({
      organizationId,
      feature: "INSIGHTS",
      prompt,
      systemPrompt: "You are a customer retention analyst. Summarize growth, active list health, and messaging fatigue indicator trends."
    })

    return response
  } catch (error: any) {
    console.error("Failed to compile engagement trends:", error)
    return { success: false, error: error.message || "Failed to calculate list engagement trends." }
  }
}

export async function getSendTimeRecommendations() {
  try {
    const { organizationId } = await getActiveWorkspaceContext()

    // Fetch log timestamps of contact activities (opens, clicks)
    const activeLogs = await prisma.activityLog.findMany({
      where: {
        organizationId,
        action: { in: ["Email Opened", "Link Clicked"] }
      },
      select: { createdAt: true },
      take: 100
    })

    const timestampsText = activeLogs.map(log => log.createdAt.toISOString()).join("\n")

    const prompt = `
      Here are the ISO timestamps of recent contact interactions (opens/clicks) in this workspace:
      ${timestampsText || "No historical event activities available."}

      Identify the optimal day of the week and hour of the day to send email blasts. If no timestamps are provided, output a generic industry-standard recommendation (e.g. Tuesday at 10:00 AM) with a brief note that stats are currently baseline.
      Limit response to 2 sentences detailing the Best Day, Best Hour, and the rationale.
    `

    const response = await generateText({
      organizationId,
      feature: "INSIGHTS",
      prompt,
      systemPrompt: "You are a send-time optimization coordinator. Provide a single best-day and best-hour scheduling recommendation based on the data."
    })

    return response
  } catch (error: any) {
    console.error("Failed to generate send time recommendations:", error)
    return { success: false, error: error.message || "Failed to compile schedule recommendation stats." }
  }
}

// -------------------------------------------------------------
// 2. AI CAMPAIGN AUDITOR
// -------------------------------------------------------------

export async function auditCampaign(campaignId: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, organizationId }
    })

    if (!campaign) {
      return { success: false, error: "Campaign not found" }
    }

    const prompt = `
      Perform an exhaustive pre-send audit on this email campaign structure:
      - Subject Line: "${campaign.subject || 'No Subject'}"
      - Preview Text: "${campaign.previewText || 'No Preview Text'}"
      - HTML Content:
      ${(campaign.htmlContent || "").slice(0, 4000)}

      Analyze the copywriting, spam triggers, links, personalization placeholders, and readability.
      You MUST return your audit strictly as a JSON object matching this schema:
      {
        "spamScore": 85, // 0 to 100 (where 0 means extreme spam risk, 100 means zero risk)
        "readabilityScore": 90, // 0 to 100 (readability grade)
        "subjectQuality": 80, // 0 to 100
        "ctaQuality": 75, // 0 to 100 (call to action strength)
        "personalizationScore": 60, // 0 to 100 (placeholder usage)
        "suggestions": ["suggestion 1", "suggestion 2"] // list of deliverability or styling improvements (max 4)
      }
    `

    const response = await generateText({
      organizationId,
      feature: "CAMPAIGN_AUDITOR",
      prompt,
      systemPrompt: "You are an advanced email deliverability checker. Always output a valid JSON object matching the requested schema and nothing else.",
      jsonMode: true
    })

    if (response.success && response.text) {
      return { success: true, data: JSON.parse(response.text) }
    }
    return response
  } catch (error: any) {
    console.error("Failed to audit campaign:", error)
    return { success: false, error: error.message || "Failed to audit campaign copy." }
  }
}

// -------------------------------------------------------------
// 3. AI SEGMENT GENERATOR
// -------------------------------------------------------------

export async function generateSegmentRules(promptText: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    const prompt = `
      Translate this natural language request into a database filter segment rule:
      Query: "${promptText}"

      Supported Schema Parameters:
      - fields: "email", "firstName", "lastName", "tags", "status", "city", "country"
      - operators: "equals", "not_equals", "contains", "starts_with"
      - join: "AND", "OR"
      - values: appropriate search strings

      Examples:
      - "VIP customers" -> [{"field": "tags", "operator": "contains", "value": "VIP", "join": "AND"}]
      - "Inactive subscribers" -> [{"field": "status", "operator": "equals", "value": "UNSUBSCRIBED", "join": "AND"}]
      - "Contacts from Seattle or Portland" -> [{"field": "city", "operator": "equals", "value": "Seattle", "join": "OR"}, {"field": "city", "operator": "equals", "value": "Portland", "join": "OR"}]

      You MUST return your answer strictly as a JSON object containing a "rules" key mapping to an array of FilterRule items:
      {
        "rules": [
          { "field": "tags", "operator": "contains", "value": "VIP", "join": "AND" }
        ]
      }
    `

    const response = await generateText({
      organizationId,
      feature: "SEGMENT_GENERATOR",
      prompt,
      systemPrompt: "You are an automated segmentation compiler. Translate prompts to JSON rules arrays and return nothing else.",
      jsonMode: true
    })

    if (response.success && response.text) {
      return { success: true, data: JSON.parse(response.text).rules }
    }
    return response
  } catch (error: any) {
    console.error("Failed to generate segment rules:", error)
    return { success: false, error: error.message || "Failed to generate filter segment rules." }
  }
}

// -------------------------------------------------------------
// 4. AI CAMPAIGN WRITER
// -------------------------------------------------------------

export async function generateCampaignContent(options: {
  goal: string
  audience: string
  brandVoice: string
}) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()
    const { goal, audience, brandVoice } = options

    const prompt = `
      Write an email marketing campaign based on the following input parameters:
      - Campaign Goal: "${goal}"
      - Target Audience: "${audience}"
      - Brand Voice/Tone: "${brandVoice}"

      You MUST return a JSON object containing:
      - A list of 3 "subjectLines" variations.
      - A list of 3 "previewTexts" matching those subjects.
      - A markdown/HTML structured email body "content" (including headers, greetings, body, and CTA suggestions).
      - An array of "ctaSuggestions" (max 3 buttons text).

      Schema format:
      {
        "subjectLines": ["Subject Option A", "Subject Option B", "Subject Option C"],
        "previewTexts": ["Preview Option A", "Preview Option B", "Preview Option C"],
        "content": "<h1>Hello...</h1>...",
        "ctaSuggestions": ["Claim Your Free Trial Now", "Unlock Offer", "Get Started"]
      }
    `

    const response = await generateText({
      organizationId,
      feature: "CAMPAIGN_WRITER",
      prompt,
      systemPrompt: "You are an expert copywriter specializing in conversion rate optimization (CRO) marketing campaigns. Output valid JSON and nothing else.",
      jsonMode: true
    })

    if (response.success && response.text) {
      return { success: true, data: JSON.parse(response.text) }
    }
    return response
  } catch (error: any) {
    console.error("Failed to generate campaign content:", error)
    return { success: false, error: error.message || "Failed to generate campaign assets." }
  }
}

// -------------------------------------------------------------
// 5. AI AUTOMATION ASSISTANT
// -------------------------------------------------------------

export async function suggestAutomationImprovements(ruleId: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    const rule = await prisma.automationRule.findFirst({
      where: { id: ruleId, organizationId }
    })

    if (!rule) {
      return { success: false, error: "Workflow not found" }
    }

    const nodesText = JSON.stringify(rule.nodes || [])
    const edgesText = JSON.stringify(rule.edges || [])

    const prompt = `
      Review the visual graph layout representing our marketing automation rule "${rule.name}":
      - Trigger Node: ${rule.triggerType}
      - Nodes array: ${nodesText}
      - Edges array: ${edgesText}

      Inspect the connections for:
      1. Broken nodes (disconnected actions).
      2. Missing follow-ups (e.g. If/Else split conditions without both true/false outgoing connected paths).
      3. Timing logic (e.g., recommend delay steps between actions instead of sending consecutive emails instantly).
      4. Suggestions on what templates to send.

      You MUST return a JSON object matching this schema:
      {
        "brokenLogicDetected": false, // true or false
        "warnings": ["Warning 1", "Warning 2"], // empty if none
        "recommendations": ["Recommendation 1", "Recommendation 2"],
        "proposedChangesSummary": "Brief overview of what should change"
      }
    `

    const response = await generateText({
      organizationId,
      feature: "AUTOMATION_ASSISTANT",
      prompt,
      systemPrompt: "You are an expert automation auditor. Review the graph nodes layout and return suggestions as valid JSON.",
      jsonMode: true
    })

    if (response.success && response.text) {
      return { success: true, data: JSON.parse(response.text) }
    }
    return response
  } catch (error: any) {
    console.error("Failed to suggest automation improvements:", error)
    return { success: false, error: error.message || "Failed to parse workflow diagram configurations." }
  }
}

// -------------------------------------------------------------
// 6. AI USAGE DASHBOARD STATS
// -------------------------------------------------------------

export async function getAiDashboardStats() {
  try {
    const { organizationId } = await getActiveWorkspaceContext()

    const org = await prisma.organization.findUnique({
      where: { id: organizationId }
    })

    if (!org) {
      return { success: false, error: "Organization not found" }
    }

    // Define quota limits based on tier
    const isCustomKey = !!org.aiApiKey
    const dailyLimit = org.plan === "FREE" ? 15 : org.plan === "STARTER" ? 100 : org.plan === "PRO" ? 500 : 5000

    // Fetch usage stats
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const monthlyLogs = await prisma.aiUsageLog.findMany({
      where: {
        organizationId,
        createdAt: { gte: startOfMonth }
      }
    })

    const requestsUsedThisMonth = monthlyLogs.length
    let totalTokensThisMonth = 0
    let totalSpendThisMonth = 0

    for (const log of monthlyLogs) {
      totalTokensThisMonth += log.totalTokens
      totalSpendThisMonth += log.estimatedCost
    }

    // Daily usages
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const todayCount = await prisma.aiUsageLog.count({
      where: {
        organizationId,
        createdAt: { gte: startOfToday }
      }
    })

    return {
      success: true,
      data: {
        plan: org.plan,
        provider: org.aiProvider || "GEMINI",
        isCustomKey,
        dailyLimit: isCustomKey ? "Unlimited (Custom Key)" : dailyLimit.toString(),
        todayUsed: todayCount,
        todayRemaining: isCustomKey ? "Unlimited" : Math.max(0, dailyLimit - todayCount).toString(),
        monthlyRequests: requestsUsedThisMonth,
        monthlyTokens: totalTokensThisMonth,
        monthlySpend: totalSpendThisMonth,
        apiKeyConfigured: isCustomKey
      }
    }
  } catch (error: any) {
    console.error("Failed to load AI dashboard stats:", error)
    return { success: false, error: error.message || "Failed to compute copilot usage indicators." }
  }
}
