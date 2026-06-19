import nodemailer from "nodemailer"

interface EmailOptions {
  to: string
  subject: string
  html: string
  from?: string
  provider?: "SMTP" | "SENDGRID" | "SES"
  providerApiKey?: string
  attachments?: Array<{ filename: string; path: string }>
}

export async function sendMail({ to, subject, html, from, provider = "SMTP", providerApiKey, attachments }: EmailOptions) {
  const defaultFrom = from || process.env.EMAIL_FROM || "no-reply@marketing.acme.com"

  // 1. SendGrid Provider via API
  if (provider === "SENDGRID" || (providerApiKey && providerApiKey.startsWith("SG."))) {
    const apiKey = providerApiKey || process.env.SENDGRID_API_KEY
    if (!apiKey) {
      throw new Error("SendGrid API key not configured")
    }

    console.log(`[SendGrid] Sending to: ${to} | Subject: ${subject} | From: ${defaultFrom}`)

    let sendgridAttachments: any[] = []
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        try {
          const res = await fetch(att.path)
          const buffer = await res.arrayBuffer()
          const base64Content = Buffer.from(buffer).toString("base64")
          sendgridAttachments.push({
            content: base64Content,
            filename: att.filename,
            type: res.headers.get("content-type") || "application/octet-stream",
            disposition: "attachment",
          })
        } catch (err) {
          console.error("Failed to fetch email attachment for SendGrid:", err)
        }
      }
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: defaultFrom },
        subject,
        content: [{ type: "text/html", value: html }],
        attachments: sendgridAttachments.length > 0 ? sendgridAttachments : undefined,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[SendGrid] FAILED: ${response.status} — ${errText}`)
      throw new Error(`SendGrid API error: ${errText}`)
    }

    console.log(`[SendGrid] ✅ Sent successfully to ${to}`)
    return { success: true, provider: "SENDGRID", messageId: response.headers.get("x-message-id") || "sg-id" }
  }

  // 2. SMTP / SES SMTP Provider
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10)
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.error(`[Email] ❌ SMTP not configured! SMTP_HOST=${smtpHost ? "SET" : "MISSING"}, SMTP_USER=${smtpUser ? "SET" : "MISSING"}, SMTP_PASS=${smtpPass ? "SET" : "MISSING"}`)
    throw new Error("Email delivery failed: SMTP credentials are not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.")
  }

  console.log(`[SMTP] Sending to: ${to} | Subject: ${subject} | From: ${defaultFrom} | Host: ${smtpHost}:${smtpPort}`)

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })

  try {
    const info = await transporter.sendMail({
      from: defaultFrom,
      to,
      subject,
      html,
      attachments: attachments ? attachments.map(att => ({
        filename: att.filename,
        path: att.path,
      })) : undefined,
    })

    console.log(`[SMTP] ✅ Sent successfully to ${to} | MessageID: ${info.messageId}`)
    return { success: true, provider: "SMTP", messageId: info.messageId }
  } catch (smtpError: any) {
    console.error(`[SMTP] ❌ Failed to send to ${to}:`, smtpError.message || smtpError)
    throw new Error(`SMTP delivery failed: ${smtpError.message || "Unknown SMTP error"}`)
  }
}

// Case-insensitive dynamic template personalization helper
export function personalizeHtml(
  htmlContent: string, 
  target: { email: string; firstName?: string | null; lastName?: string | null }
) {
  const email = target.email
  const firstName = target.firstName || "Subscriber"
  const lastName = target.lastName || ""
  const fullName = [target.firstName, target.lastName].filter(Boolean).join(" ") || "Subscriber"

  return htmlContent
    .replace(/\{\{\s*name\s*\}\}/gi, fullName)
    .replace(/\{\{\s*firstName\s*\}\}/gi, firstName)
    .replace(/\{\{\s*lastName\s*\}\}/gi, lastName)
    .replace(/\{\{\s*email\s*\}\}/gi, email)
}

