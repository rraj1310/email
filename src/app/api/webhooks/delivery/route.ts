import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    // 1. Process SendGrid Webhook Events
    if (Array.isArray(payload)) {
      for (const event of payload) {
        const email = event.email?.toLowerCase().trim()
        const sgEvent = event.event // "bounce", "spamreport", "unsubscribe", "dropped"
        
        if (!email) continue

        let reason = "UNSUBSCRIBED"
        if (sgEvent === "bounce" || sgEvent === "dropped") reason = "BOUNCED"
        if (sgEvent === "spamreport") reason = "COMPLAINED"

        await recordSuppression(email, reason)
      }
      return NextResponse.json({ success: true, message: "SendGrid webhooks processed" })
    }

    // 2. Process AWS SES SNS Webhooks
    if (payload.Type === "SubscriptionConfirmation") {
      // Auto-confirm AWS SNS subscriptions
      const confirmUrl = payload.SubscribeURL
      if (confirmUrl) {
        await fetch(confirmUrl)
      }
      return NextResponse.json({ success: true, message: "SNS subscription confirmed" })
    }

    if (payload.Type === "Notification") {
      const message = JSON.parse(payload.Message || "{}")
      const notificationType = message.notificationType // "Bounce", "Complaint", "Delivery"

      if (notificationType === "Bounce") {
        const recipients = message.bounce?.bouncedRecipients || []
        for (const r of recipients) {
          const email = r.emailAddress?.toLowerCase().trim()
          if (email) await recordSuppression(email, "BOUNCED")
        }
      } else if (notificationType === "Complaint") {
        const recipients = message.complaint?.complainedRecipients || []
        for (const r of recipients) {
          const email = r.emailAddress?.toLowerCase().trim()
          if (email) await recordSuppression(email, "COMPLAINED")
        }
      }
      return NextResponse.json({ success: true, message: "SES notifications processed" })
    }

    return NextResponse.json({ success: false, error: "Unrecognized webhook event format" }, { status: 400 })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ success: false, error: "Failed to process webhook" }, { status: 500 })
  }
}

async function recordSuppression(email: string, reason: string) {
  // Find organizations containing this contact to scope suppression correctly
  const contacts = await db.contact.findMany({
    where: { email }
  })

  for (const contact of contacts) {
    // Write to SuppressionList if not already present
    const existing = await db.suppressionList.findFirst({
      where: {
        email,
        organizationId: contact.organizationId
      }
    })

    if (!existing) {
      await db.suppressionList.create({
        data: {
          email,
          reason: reason as any,
          scope: "ORGANIZATION" as any,
          organizationId: contact.organizationId
        }
      })
    }

    // Update Contact status
    await db.contact.update({
      where: { id: contact.id },
      data: {
        status: reason as any
      }
    })
  }
}
