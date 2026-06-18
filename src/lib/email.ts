import nodemailer from "nodemailer"

interface EmailOptions {
  to: string
  subject: string
  html: string
  from?: string
  provider?: "SMTP" | "SENDGRID" | "SES"
  providerApiKey?: string
}

export async function sendMail({ to, subject, html, from, provider = "SMTP", providerApiKey }: EmailOptions) {
  const defaultFrom = from || process.env.EMAIL_FROM || "no-reply@marketing.acme.com"

  // 1. SendGrid Provider via API
  if (provider === "SENDGRID" || (providerApiKey && providerApiKey.startsWith("SG."))) {
    const apiKey = providerApiKey || process.env.SENDGRID_API_KEY
    if (!apiKey) {
      throw new Error("SendGrid API key not configured")
    }

    console.log(`[SendGrid] Sending to: ${to} | Subject: ${subject} | From: ${defaultFrom}`)

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
    })

    console.log(`[SMTP] ✅ Sent successfully to ${to} | MessageID: ${info.messageId}`)
    return { success: true, provider: "SMTP", messageId: info.messageId }
  } catch (smtpError: any) {
    console.error(`[SMTP] ❌ Failed to send to ${to}:`, smtpError.message || smtpError)
    throw new Error(`SMTP delivery failed: ${smtpError.message || "Unknown SMTP error"}`)
  }
}
