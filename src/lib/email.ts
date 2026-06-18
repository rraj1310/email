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
      throw new Error(`SendGrid API error: ${errText}`)
    }

    return { success: true, provider: "SENDGRID", messageId: response.headers.get("x-message-id") || "sg-id" }
  }

  // 2. SMTP / SES SMTP Provider
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10)
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS

  // Fallback: If not configured, simulate delivery
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log(`[Email Dispatch Simulation] From: ${defaultFrom} | To: ${to} | Subject: ${subject}`)
    return { success: true, provider: "SIMULATOR", messageId: `sim-${Date.now()}` }
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })

  const info = await transporter.sendMail({
    from: defaultFrom,
    to,
    subject,
    html,
  })

  return { success: true, provider: "SMTP", messageId: info.messageId }
}
