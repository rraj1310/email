"use server"

import { db as prisma } from "@/lib/db"
import { logActivity } from "./dashboard"
import { getActiveWorkspaceContext, enforceWorkspaceEditor } from "@/lib/tenant"
import fs from "fs"
import path from "path"

export async function getMediaFiles() {
  try {
    const { organizationId } = await getActiveWorkspaceContext()
    
    const files = await prisma.media.findMany({
      where: { organizationId },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return { success: true, data: files }
  } catch (error) {
    console.error("Failed to fetch media files:", error)
    return { success: false, error: "Failed to load media gallery" }
  }
}

export async function renameMediaFile(id: string, newName: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    // Verify media file workspace ownership before update
    const existing = await prisma.media.findFirst({
      where: { id, organizationId }
    })
    if (!existing) return { success: false, error: "File not found" }

    const file = await prisma.media.update({
      where: { id },
      data: { name: newName },
    })

    await logActivity(`Renamed media file to "${newName}"`, "SETTINGS")

    return { success: true, data: file }
  } catch (error) {
    console.error("Failed to rename media file:", error)
    return { success: false, error: "Failed to rename file" }
  }
}

export async function deleteMediaFile(id: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    // Verify media file workspace ownership before delete
    const file = await prisma.media.findFirst({
      where: { id, organizationId }
    })
    if (!file) return { success: false, error: "File not found" }

    // delete from physical disk if under public/uploads
    if (file.url.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", file.url)
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath)
        } catch (err) {
          console.error("Failed to delete physical file:", err)
        }
      }
    }

    await prisma.media.delete({
      where: { id }
    })

    await logActivity(`Deleted media file "${file.name}"`, "SETTINGS")

    return { success: true }
  } catch (error) {
    console.error("Failed to delete media file:", error)
    return { success: false, error: "Failed to delete file" }
  }
}

export async function createMediaRecord(name: string, url: string, size: number) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    const file = await prisma.media.create({
      data: {
        name,
        url,
        size,
        organizationId
      }
    })

    await logActivity(`Uploaded media file "${name}"`, "SETTINGS")

    return { success: true, data: file }
  } catch (error) {
    console.error("Failed to create media record:", error)
    return { success: false, error: "Failed to catalog uploaded file" }
  }
}
