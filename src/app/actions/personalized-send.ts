"use server"

import { generateText } from "@/lib/ai-provider"
import { getActiveWorkspaceContext, enforceWorkspaceEditor } from "@/lib/tenant"
import { inngest } from "@/inngest/client"

interface GenerationOptions {
  contactId: string
  contactName: string
  note: string
  systemPrompt?: string
}

export async function generatePersonalizedEmailAction({ contactId, contactName, note, systemPrompt }: GenerationOptions) {
  try {
    const { organizationId, userId } = await getActiveWorkspaceContext()

    const resolvedSystemPrompt = systemPrompt || 
      "You are a warm, professional, and knowledgeable financial and stock market advisor. " +
      "Write a short, engaging, personalized email message for the client in HTML-safe paragraph format (just paragraphs <p>, no HTML/body wrappers, no markdown headings). " +
      "Maintain a friendly but professional advisory tone, aligning with long-term investment principles."

    const resolvedUserPrompt = 
      `Write a personalized email to my client, ${contactName}.\n` +
      `Special context/notes to mention: "${note || "Just a general friendly financial check-in"}"\n` +
      `Generate only the body of the email in HTML paragraphs. Use warm placeholder salutations and signoffs.`

    const result = await generateText({
      organizationId,
      userId,
      feature: "CAMPAIGN_WRITER",
      prompt: resolvedUserPrompt,
      systemPrompt: resolvedSystemPrompt
    })

    if (result.success) {
      return { success: true, text: result.text }
    } else {
      return { success: false, error: result.error || "Failed to generate AI content" }
    }
  } catch (error: any) {
    console.error("Failed to generate personalized email action:", error)
    return { success: false, error: error.message || "An unexpected error occurred during email generation." }
  }
}

interface DispatchOptions {
  campaignName: string
  subject: string
  recipients: Array<{
    contactId: string
    email: string
    subject: string
    html: string
  }>
}

export async function startPersonalizedDispatchAction({ campaignName, subject, recipients }: DispatchOptions) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    if (!campaignName || !subject || !recipients || recipients.length === 0) {
      return { success: false, error: "Missing campaign dispatch properties." }
    }

    // Trigger Inngest background event
    await inngest.send({
      name: "personalized/dispatch",
      data: {
        recipients,
        campaignName,
        subject,
        organizationId
      }
    })

    return { success: true }
  } catch (error: any) {
    console.error("Failed to enqueue personalized campaign dispatch:", error)
    return { success: false, error: error.message || "Failed to dispatch campaign to background queue." }
  }
}
