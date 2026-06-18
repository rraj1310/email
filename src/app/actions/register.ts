"use server"

import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

const registerSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  name: z.string().min(1, "Name is required"),
  workspaceName: z.string().min(1, "Workspace name is required"),
})

export type RegisterInput = z.infer<typeof registerSchema>

export async function registerUser(formData: RegisterInput) {
  const result = registerSchema.safeParse(formData)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { email, password, name, workspaceName } = result.data

  try {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return { error: "A user with this email address already exists." }
    }

    const passwordHash = await bcrypt.hash(password, 10)

    await db.$transaction(async (tx) => {
      // 1. Create Organization
      const org = await tx.organization.create({
        data: {
          name: workspaceName,
        },
      })

      // 2. Create User (Set role to OWNER)
      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: "OWNER",
          organizationId: org.id,
        },
      })

      // 3. Create Membership (Owner)
      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: "OWNER",
        },
      })

      // 4. Log initial activity
      await tx.activityLog.create({
        data: {
          action: "REGISTER",
          entityType: "SETTINGS",
          entityId: user.id,
          details: { message: "Account created and workspace initialized" },
          userId: user.id,
          organizationId: org.id,
        },
      })
    })

    return { success: true }
  } catch (error: any) {
    console.error("Registration failed:", error)
    return { error: "An unexpected error occurred during registration." }
  }
}
