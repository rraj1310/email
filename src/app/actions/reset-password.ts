"use server"

import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { z } from "zod"
import { sendMail } from "@/lib/email"
import { headers } from "next/headers"

const requestSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
})

const resetSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
})

export async function requestPasswordReset(formData: { email: string }) {
  const result = requestSchema.safeParse(formData)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { email } = result.data

  try {
    const user = await db.user.findUnique({
      where: { email },
    })

    // Security practice: Don't reveal if user doesn't exist, but return success.
    if (!user) {
      return { success: true }
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 3600000) // 1 hour expiration

    const identifier = `password-reset:${email}`

    // Save token: clear previous tokens and save new one
    await db.verificationToken.deleteMany({
      where: { identifier }
    })

    await db.verificationToken.create({
      data: {
        identifier,
        token,
        expires,
      },
    })

    // Get origin/host from request headers
    const headersList = await headers()
    const host = headersList.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const resetUrl = `${protocol}://${host}/reset-password?token=${token}&email=${encodeURIComponent(email)}`

    // Render premium HTML template
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your password</title>
        <style>
          body {
            background-color: #f6f9fc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          .container {
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            margin: 40px auto;
            max-width: 500px;
            padding: 32px;
            text-align: center;
          }
          .logo {
            font-size: 24px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 24px;
            letter-spacing: -0.05em;
          }
          .logo span {
            color: #4f46e5;
          }
          h1 {
            color: #0f172a;
            font-size: 22px;
            font-weight: 600;
            margin-bottom: 16px;
          }
          p {
            color: #475569;
            font-size: 15px;
            line-height: 24px;
            margin-bottom: 24px;
          }
          .btn {
            background-color: #4f46e5;
            border-radius: 6px;
            color: #ffffff !important;
            display: inline-block;
            font-size: 15px;
            font-weight: 600;
            line-height: 48px;
            text-decoration: none;
            width: 100%;
            text-align: center;
            margin-bottom: 24px;
          }
          .btn:hover {
            background-color: #4338ca;
          }
          .footer {
            color: #94a3b8;
            font-size: 12px;
            line-height: 18px;
            border-top: 1px solid #f1f5f9;
            margin-top: 32px;
            padding-top: 16px;
          }
          .link {
            color: #4f46e5;
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Acme<span>Marketing</span></div>
          <h1>Reset your password</h1>
          <p>We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
          <a class="btn" href="${resetUrl}" target="_blank">Reset Password</a>
          <p style="font-size: 13px; color: #64748b;">If you did not request this, you can safely ignore this email.</p>
          <div class="footer">
            If you have trouble clicking the button, copy and paste this URL into your browser:<br>
            <a class="link" href="${resetUrl}">${resetUrl}</a>
          </div>
        </div>
      </body>
      </html>
    `

    await sendMail({
      to: email,
      subject: "Reset your Acme password",
      html: emailHtml,
    })

    return { success: true }
  } catch (error: any) {
    console.error("Forgot password request error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function resetPassword(formData: { email: string; token: string; password: string }) {
  const result = resetSchema.safeParse(formData)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { email, token, password } = result.data
  const identifier = `password-reset:${email}`

  try {
    // Check if the token exists and is valid
    const verificationRecord = await db.verificationToken.findFirst({
      where: {
        identifier,
        token,
      },
    })

    if (!verificationRecord) {
      return { error: "Invalid or expired password reset link." }
    }

    if (verificationRecord.expires < new Date()) {
      // Clean up expired token
      await db.verificationToken.deleteMany({
        where: { identifier, token },
      })
      return { error: "The password reset link has expired." }
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user) {
      return { error: "User associated with this token not found." }
    }

    // Update password
    const passwordHash = await bcrypt.hash(password, 10)
    await db.$transaction([
      db.user.update({
        where: { email },
        data: { passwordHash },
      }),
      db.verificationToken.deleteMany({
        where: { identifier, token },
      }),
      db.activityLog.create({
        data: {
          action: "PASSWORD_RESET",
          entityType: "SETTINGS",
          entityId: user.id,
          details: { message: "Password reset completed via email verification link" },
          userId: user.id,
          organizationId: user.organizationId,
        },
      }),
    ])

    return { success: true }
  } catch (error: any) {
    console.error("Reset password execution error:", error)
    return { error: "An unexpected error occurred during password reset." }
  }
}
