"use server"

import { db as prisma } from "@/lib/db"
import { logActivity } from "./dashboard"
import { getActiveWorkspaceContext, enforceWorkspaceEditor } from "@/lib/tenant"
import { inngest } from "@/inngest/client"

export async function getContacts() {
  try {
    const { organizationId } = await getActiveWorkspaceContext()
    
    const contacts = await prisma.contact.findMany({
      where: { organizationId },
      include: {
        tags: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return { success: true, data: contacts }
  } catch (error) {
    console.error("Failed to fetch contacts:", error)
    return { success: false, error: "Failed to fetch contacts" }
  }
}

export async function getContactById(id: string) {
  try {
    const { organizationId } = await getActiveWorkspaceContext()
    
    const contact = await prisma.contact.findFirst({
      where: { id, organizationId },
      include: {
        tags: true,
        automationStates: {
          include: {
            automationRule: {
              select: { name: true }
            }
          }
        }
      }
    })
    if (!contact) return { success: false, error: "Contact not found" }
    return { success: true, data: contact }
  } catch (error) {
    console.error("Failed to get contact by id:", error)
    return { success: false, error: "Failed to get contact details" }
  }
}

export async function getTags() {
  try {
    const { organizationId } = await getActiveWorkspaceContext()
    
    const tags = await prisma.tag.findMany({
      where: { organizationId },
      orderBy: {
        name: 'asc'
      }
    })
    return { success: true, data: tags }
  } catch (error) {
    console.error("Failed to fetch tags:", error)
    return { success: false, error: "Failed to fetch tags" }
  }
}

export async function createContact(data: {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  city?: string
  country?: string
  birthday?: string | null
  avatarUrl?: string | null
  status?: string
  tags?: string[] // tag names
}) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()
    const cleanEmail = data.email.trim().toLowerCase()

    // Check if email already exists inside this workspace
    const existing = await prisma.contact.findFirst({
      where: {
        email: cleanEmail,
        organizationId
      }
    })

    if (existing) {
      return { success: false, error: "A contact with this email already exists." }
    }

    const tagConnections = data.tags && data.tags.length > 0
      ? {
          connectOrCreate: data.tags.map(tagName => ({
            where: {
              organizationId_name: {
                organizationId,
                name: tagName.trim()
              }
            },
            create: {
              name: tagName.trim(),
              organizationId
            }
          }))
        }
      : undefined

    const contact = await prisma.contact.create({
      data: {
        email: cleanEmail,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        phone: data.phone || null,
        city: data.city || null,
        country: data.country || null,
        birthday: data.birthday ? new Date(data.birthday) : null,
        avatarUrl: data.avatarUrl || null,
        status: (data.status as any) || "ACTIVE",
        organizationId,
        tags: tagConnections,
        customFields: {}
      },
      include: {
        tags: true
      }
    })

    await logActivity(`Created contact ${cleanEmail}`, "CONTACT", contact.id)

    // Trigger automations
    try {
      await inngest.send({
        name: "contacts/created",
        data: {
          contactId: contact.id,
          email: contact.email,
          organizationId,
        }
      })
      if (data.tags && data.tags.length > 0) {
        for (const t of data.tags) {
          await inngest.send({
            name: "tags/added",
            data: {
              contactId: contact.id,
              tagName: t.trim(),
              organizationId,
            }
          })
        }
      }
    } catch (inngestErr) {
      console.error("Failed to trigger Inngest events in createContact:", inngestErr)
    }

    return { success: true, data: contact }
  } catch (error) {
    console.error("Failed to create contact:", error)
    return { success: false, error: "Failed to create contact" }
  }
}

export async function updateContact(id: string, data: {
  firstName?: string
  lastName?: string
  phone?: string
  city?: string
  country?: string
  birthday?: string | null
  avatarUrl?: string | null
  status?: string
  tags?: string[] // list of tag names
  customFields?: string // stringified json
}) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    // Verify contact workspace ownership before updates
    const currentContact = await prisma.contact.findFirst({
      where: { id, organizationId },
      include: { tags: true }
    })

    if (!currentContact) return { success: false, error: "Contact not found" }

    // Disconnect all current tags first
    await prisma.contact.update({
      where: { id },
      data: {
        tags: {
          disconnect: currentContact.tags.map(t => ({ id: t.id }))
        }
      }
    })

    // Prepare the update payload
    const tagConnections = data.tags && data.tags.length > 0
      ? {
          connectOrCreate: data.tags.map(tagName => ({
            where: {
              organizationId_name: {
                organizationId,
                name: tagName.trim()
              }
            },
            create: {
              name: tagName.trim(),
              organizationId
            }
          }))
        }
      : undefined

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        firstName: data.firstName !== undefined ? data.firstName : currentContact.firstName,
        lastName: data.lastName !== undefined ? data.lastName : currentContact.lastName,
        phone: data.phone !== undefined ? data.phone : currentContact.phone,
        city: data.city !== undefined ? data.city : currentContact.city,
        country: data.country !== undefined ? data.country : currentContact.country,
        birthday: data.birthday !== undefined ? (data.birthday ? new Date(data.birthday) : null) : currentContact.birthday,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : currentContact.avatarUrl,
        status: data.status !== undefined ? (data.status as any) : currentContact.status,
        customFields: data.customFields !== undefined ? JSON.parse(data.customFields || "{}") : currentContact.customFields as any,
        tags: tagConnections
      },
      include: {
        tags: true
      }
    })

    await logActivity(`Updated contact ${contact.email}`, "CONTACT", id)

    // Trigger automations
    try {
      await inngest.send({
        name: "contacts/updated",
        data: {
          contactId: contact.id,
          email: contact.email,
          organizationId,
        }
      })
      
      const oldTagNames = currentContact.tags.map(t => t.name)
      const newTagNames = data.tags || []
      const addedTags = newTagNames.filter(t => !oldTagNames.includes(t))

      for (const t of addedTags) {
        await inngest.send({
          name: "tags/added",
          data: {
            contactId: contact.id,
            tagName: t.trim(),
            organizationId,
          }
        })
      }
    } catch (inngestErr) {
      console.error("Failed to trigger Inngest events in updateContact:", inngestErr)
    }

    return { success: true, data: contact }
  } catch (error) {
    console.error("Failed to update contact:", error)
    return { success: false, error: "Failed to update contact details" }
  }
}

export async function deleteContact(id: string) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    // Verify contact workspace ownership before delete
    const existing = await prisma.contact.findFirst({
      where: { id, organizationId }
    })
    if (!existing) return { success: false, error: "Contact not found" }

    const contact = await prisma.contact.delete({
      where: { id },
    })

    await logActivity(`Deleted contact ${contact.email}`, "CONTACT", id)

    return { success: true }
  } catch (error) {
    console.error("Failed to delete contact:", error)
    return { success: false, error: "Failed to delete contact" }
  }
}

export async function importContactsAction(contactsList: Array<{
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  city?: string
  country?: string
  tags?: string // comma separated tag names
}>) {
  try {
    const { organizationId } = await enforceWorkspaceEditor()

    let importedCount = 0
    let duplicateUpdatedCount = 0
    let invalidCount = 0

    // Filter invalid emails upfront
    const validContacts: any[] = []
    for (const rawContact of contactsList) {
      const email = (rawContact.email || "").trim().toLowerCase()
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        invalidCount++
        continue
      }
      validContacts.push({ ...rawContact, email })
    }

    const contactsToCreateEvents: { id: string; email: string; tags: string[] }[] = []
    const contactsToUpdateEvents: { id: string; email: string; oldTags: string[]; tagList: string[] }[] = []

    // Execute in transaction
    await prisma.$transaction(async (tx) => {
      for (const rawContact of validContacts) {
        const email = rawContact.email
        const firstName = (rawContact.firstName || "").trim() || null
        const lastName = (rawContact.lastName || "").trim() || null
        const phone = (rawContact.phone || "").trim() || null
        const city = (rawContact.city || "").trim() || null
        const country = (rawContact.country || "").trim() || null
        const tagList = rawContact.tags
          ? rawContact.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
          : []

        const tagConnections = tagList.length > 0
          ? {
              connectOrCreate: tagList.map((tagName: string) => ({
                where: {
                  organizationId_name: {
                    organizationId,
                    name: tagName
                  }
                },
                create: {
                  name: tagName,
                  organizationId
                }
              }))
            }
          : undefined

        const existing = await tx.contact.findFirst({
          where: { email, organizationId },
          include: { tags: true }
        })

        if (existing) {
          // Disconnect existing tags
          await tx.contact.update({
            where: { id: existing.id },
            data: {
              tags: {
                disconnect: existing.tags.map((t: any) => ({ id: t.id }))
              }
            }
          })

          // Update details and link tags
          await tx.contact.update({
            where: { id: existing.id },
            data: {
              firstName: firstName || existing.firstName,
              lastName: lastName || existing.lastName,
              phone: phone || existing.phone,
              city: city || existing.city,
              country: country || existing.country,
              tags: tagConnections
            }
          })
          contactsToUpdateEvents.push({ id: existing.id, email: existing.email, oldTags: existing.tags.map(t => t.name), tagList })
          duplicateUpdatedCount++
        } else {
          // Create new contact
          const newContact = await tx.contact.create({
            data: {
              email,
              firstName,
              lastName,
              phone,
              city,
              country,
              status: "ACTIVE" as any,
              organizationId,
              tags: tagConnections,
              customFields: {}
            }
          })
          contactsToCreateEvents.push({ id: newContact.id, email: newContact.email, tags: tagList })
          importedCount++
        }
      }
    })

    // Dispatch Inngest events in background after transaction succeeds
    try {
      for (const ev of contactsToCreateEvents) {
        await inngest.send({
          name: "contacts/created",
          data: { contactId: ev.id, email: ev.email, organizationId }
        })
        for (const t of ev.tags) {
          await inngest.send({
            name: "tags/added",
            data: { contactId: ev.id, tagName: t, organizationId }
          })
        }
      }
      for (const ev of contactsToUpdateEvents) {
        await inngest.send({
          name: "contacts/updated",
          data: { contactId: ev.id, email: ev.email, organizationId }
        })
        const added = ev.tagList.filter(t => !ev.oldTags.includes(t))
        for (const t of added) {
          await inngest.send({
            name: "tags/added",
            data: { contactId: ev.id, tagName: t, organizationId }
          })
        }
      }
    } catch (inngestErr) {
      console.error("Failed to trigger Inngest events in importContactsAction:", inngestErr)
    }

    await logActivity(`Bulk imported contacts: ${importedCount} new, ${duplicateUpdatedCount} updated`, "CONTACT")

    return {
      success: true,
      data: {
        imported: importedCount,
        updated: duplicateUpdatedCount,
        invalid: invalidCount
      }
    }
  } catch (error) {
    console.error("Failed bulk importing contacts:", error)
    return { success: false, error: "Failed to complete CSV import" }
  }
}
