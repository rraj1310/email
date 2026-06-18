"use server"

import { db as prisma } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { logActivity } from "./dashboard"
import { revalidatePath } from "next/cache"

import { PLANS, PlanType } from "@/lib/plans"

// Session helper
async function getSession() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    throw new Error("Unauthorized")
  }
  return session as any
}

// Get all workspaces user belongs to
export async function getWorkspaces() {
  try {
    const session = await getSession()
    const userId = session.user.id

    // Ensure user has a membership record for their active workspace (for legacy seed users)
    const activeOrgId = session.user.organizationId
    if (activeOrgId) {
      const existingMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: activeOrgId
          }
        }
      })
      if (!existingMembership) {
        await prisma.membership.create({
          data: {
            userId,
            organizationId: activeOrgId,
            role: session.user.role || "ADMIN"
          }
        })
      }
    }

    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            plan: true,
            brandColorPrimary: true,
            logoUrl: true
          }
        }
      }
    })

    return {
      success: true,
      data: memberships.map(m => ({
        id: m.organization.id,
        name: m.organization.name,
        plan: m.organization.plan as PlanType,
        role: m.role,
        color: m.organization.brandColorPrimary,
        logo: m.organization.logoUrl
      }))
    }
  } catch (error: any) {
    console.error("Failed to load workspaces:", error)
    return { success: false, error: error.message || "Failed to load workspaces" }
  }
}

// Create workspace
export async function createWorkspace(name: string) {
  try {
    const session = await getSession()
    const userId = session.user.id

    // Create the organization
    const org = await prisma.organization.create({
      data: {
        name,
        plan: "FREE",
        brandColorPrimary: "#3b82f6"
      }
    })

    // Create the membership (Owner role)
    await prisma.membership.create({
      data: {
        userId,
        organizationId: org.id,
        role: "OWNER"
      }
    })

    // Set as active workspace
    await prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: org.id,
        role: "OWNER"
      }
    })

    await logActivity(`Created new workspace: ${name}`, "SETTINGS")
    revalidatePath("/settings")

    return { success: true, data: org }
  } catch (error: any) {
    console.error("Failed to create workspace:", error)
    return { success: false, error: error.message || "Failed to create workspace" }
  }
}

// Switch active workspace
export async function switchWorkspace(organizationId: string) {
  try {
    const session = await getSession()
    const userId = session.user.id

    // Verify user belongs to this workspace
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId
        }
      }
    })

    if (!membership) {
      return { success: false, error: "Access Denied to this workspace" }
    }

    // Update User's active organizationId and role
    await prisma.user.update({
      where: { id: userId },
      data: {
        organizationId,
        role: membership.role
      }
    })

    await logActivity(`Switched to workspace: ${organizationId}`, "SETTINGS")
    revalidatePath("/")

    return { success: true }
  } catch (error: any) {
    console.error("Failed to switch workspace:", error)
    return { success: false, error: error.message || "Failed to switch workspace" }
  }
}

// Get workspace members
export async function getWorkspaceMembers() {
  try {
    const session = await getSession()
    const orgId = session.user.organizationId

    const memberships = await prisma.membership.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: "asc" }
    })

    return {
      success: true,
      data: memberships.map(m => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        createdAt: m.createdAt
      }))
    }
  } catch (error: any) {
    console.error("Failed to fetch members:", error)
    return { success: false, error: error.message || "Failed to fetch team members" }
  }
}

// Invite new member
export async function inviteMember(email: string, role: "OWNER" | "ADMIN" | "EDITOR" | "ANALYST" | "VIEWER") {
  try {
    const session = await getSession()
    const orgId = session.user.organizationId

    // Check RBAC limits: only OWNER or ADMIN can invite
    if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
      return { success: false, error: "Only workspace Owners and Admins can invite team members" }
    }

    // Get current org plan limits
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            users: true,
            invites: true
          }
        }
      }
    })

    if (!org) return { success: false, error: "Workspace not found" }

    const planName = (org.plan || "FREE") as PlanType
    const limit = PLANS[planName]?.maxSeats || 3
    const currentSeats = org._count.users + org._count.invites

    if (currentSeats >= limit) {
      return {
        success: false,
        error: `Workspace size limit reached for the ${planName} plan (${limit} seats). Upgrade your subscription to add more members.`
      }
    }

    const cleanEmail = email.trim().toLowerCase()

    // Check if user is already a member
    const existingMember = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        memberships: {
          some: {
            organizationId: orgId
          }
        }
      }
    })

    if (existingMember) {
      return { success: false, error: "User is already a member of this workspace" }
    }

    // Generate token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const invite = await prisma.workspaceInvite.upsert({
      where: {
        organizationId_email: {
          organizationId: orgId,
          email: cleanEmail
        }
      },
      update: {
        role,
        token,
        expiresAt
      },
      create: {
        email: cleanEmail,
        role,
        token,
        organizationId: orgId,
        expiresAt
      }
    })

    await logActivity(`Invited ${cleanEmail} to the workspace`, "SETTINGS")

    // Mock send invitation link
    console.log(`INVITATION SENT! Link: http://localhost:3000/onboarding?invite=${token}`)

    return { success: true, data: invite }
  } catch (error: any) {
    console.error("Failed to send invite:", error)
    return { success: false, error: error.message || "Failed to invite member" }
  }
}

// Get invites
export async function getPendingInvites() {
  try {
    const session = await getSession()
    const orgId = session.user.organizationId

    const invites = await prisma.workspaceInvite.findMany({
      where: {
        organizationId: orgId,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    })

    return { success: true, data: invites }
  } catch (error: any) {
    console.error("Failed to load invites:", error)
    return { success: false, error: error.message || "Failed to load invites" }
  }
}

// Cancel invite
export async function cancelInvite(inviteId: string) {
  try {
    const session = await getSession()
    const orgId = session.user.organizationId

    if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
      return { success: false, error: "Access Denied" }
    }

    await prisma.workspaceInvite.delete({
      where: {
        id: inviteId,
        organizationId: orgId
      }
    })

    return { success: true }
  } catch (error: any) {
    console.error("Failed to cancel invite:", error)
    return { success: false, error: error.message || "Failed to cancel invitation" }
  }
}

// Remove member
export async function removeMember(membershipId: string) {
  try {
    const session = await getSession()
    const orgId = session.user.organizationId
    const currentUserId = session.user.id

    if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
      return { success: false, error: "Access Denied" }
    }

    const membership = await prisma.membership.findUnique({
      where: { id: membershipId }
    })

    if (!membership || membership.organizationId !== orgId) {
      return { success: false, error: "Membership not found" }
    }

    // Owner protection: cannot remove themselves or other owners if they are only admin
    if (membership.role === "OWNER" && session.user.role !== "OWNER") {
      return { success: false, error: "Admins cannot remove workspace Owners" }
    }

    if (membership.userId === currentUserId) {
      return { success: false, error: "You cannot remove yourself. Switch workspace or delete account." }
    }

    await prisma.membership.delete({
      where: { id: membershipId }
    })

    // If user's active workspace was this org, assign them another one
    const userToCleanup = await prisma.user.findUnique({
      where: { id: membership.userId },
      include: { memberships: true }
    })

    if (userToCleanup && userToCleanup.organizationId === orgId) {
      const remainingOrg = userToCleanup.memberships[0]
      if (remainingOrg) {
        await prisma.user.update({
          where: { id: userToCleanup.id },
          data: {
            organizationId: remainingOrg.organizationId,
            role: remainingOrg.role
          }
        })
      } else {
        // No remaining orgs, create a fallback personal workspace
        const personalOrg = await prisma.organization.create({
          data: {
            name: "Personal Workspace",
            plan: "FREE",
            brandColorPrimary: "#6366f1"
          }
        })
        await prisma.membership.create({
          data: {
            userId: userToCleanup.id,
            organizationId: personalOrg.id,
            role: "OWNER"
          }
        })
        await prisma.user.update({
          where: { id: userToCleanup.id },
          data: {
            organizationId: personalOrg.id,
            role: "OWNER"
          }
        })
      }
    }

    await logActivity(`Removed member from workspace`, "SETTINGS")

    return { success: true }
  } catch (error: any) {
    console.error("Failed to remove member:", error)
    return { success: false, error: error.message || "Failed to remove member" }
  }
}

// Accept invite by token
export async function acceptInvite(token: string) {
  try {
    const session = await getSession()
    const userId = session.user.id
    const userEmail = session.user.email

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token }
    })

    if (!invite) {
      return { success: false, error: "Invitation link is invalid" }
    }

    if (invite.expiresAt < new Date()) {
      return { success: false, error: "Invitation link has expired" }
    }

    // Verify email matches the invite (case-insensitive)
    if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
      return { success: false, error: `This invite was sent to ${invite.email}, but you are logged in as ${userEmail}` }
    }

    // Create membership
    await prisma.membership.upsert({
      where: {
        userId_organizationId: {
          userId,
          organizationId: invite.organizationId
        }
      },
      update: {
        role: invite.role
      },
      create: {
        userId,
        organizationId: invite.organizationId,
        role: invite.role
      }
    })

    // Set user's active organization to this one
    await prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: invite.organizationId,
        role: invite.role
      }
    })

    // Delete the invite
    await prisma.workspaceInvite.delete({
      where: { id: invite.id }
    })

    await logActivity(`Accepted invitation to workspace`, "SETTINGS")

    return { success: true, organizationId: invite.organizationId }
  } catch (error: any) {
    console.error("Failed to accept invite:", error)
    return { success: false, error: error.message || "Failed to accept invitation" }
  }
}
