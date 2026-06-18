import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { UserRole } from "@prisma/client"

export interface WorkspaceContext {
  userId: string
  organizationId: string
  role: UserRole
}

/**
 * Retrieves the authenticated session and returns the active workspace context.
 * Throws an explicit error if session is missing or organization ID is unassigned.
 */
export async function getActiveWorkspaceContext(): Promise<WorkspaceContext> {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    throw new Error("UNAUTHORIZED")
  }
  
  const user = session.user as any
  if (!user.organizationId) {
    throw new Error("WORKSPACE_NOT_FOUND")
  }

  return {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role as UserRole
  }
}

/**
 * Enforces that the current user's role is one of the allowed roles.
 */
export async function enforceRole(allowedRoles: UserRole[]): Promise<WorkspaceContext> {
  const ctx = await getActiveWorkspaceContext()
  if (!allowedRoles.includes(ctx.role)) {
    throw new Error("FORBIDDEN")
  }
  return ctx
}

/**
 * Enforces that the current user is an Owner or Admin.
 */
export async function enforceWorkspaceAdmin(): Promise<WorkspaceContext> {
  return enforceRole([UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN])
}

/**
 * Enforces that the current user is an Owner, Admin, or Editor (i.e. has write access).
 */
export async function enforceWorkspaceEditor(): Promise<WorkspaceContext> {
  return enforceRole([UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR, UserRole.SUPER_ADMIN])
}
