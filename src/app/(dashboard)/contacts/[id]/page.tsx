export const dynamic = "force-dynamic"

import { getContactById } from "@/app/actions/contacts"
import { notFound } from "next/navigation"
import { ContactDetailsClient } from "./contact-details-client"
import { db as prisma } from "@/lib/db"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ContactDetailsPage({ params }: PageProps) {
  const resolvedParams = await params
  const result = await getContactById(resolvedParams.id)

  if (!result.success || !result.data) {
    notFound()
  }

  const contact = result.data

  // Fetch real activity logs for this contact
  const activityLogs = await prisma.activityLog.findMany({
    where: {
      entityId: contact.id
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 30
  })

  // Fetch automation logs for this contact
  const automationLogs = await prisma.automationLog.findMany({
    where: {
      contactId: contact.id
    },
    include: {
      automationRule: {
        select: { name: true }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 30
  })

  // Combine and format logs
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const combinedActivities = [
    ...activityLogs.map(log => {
      let detailsText = null
      if (log.details) {
        if (typeof log.details === 'string') {
          detailsText = log.details
        } else {
          detailsText = (log.details as any).message || JSON.stringify(log.details)
        }
      }

      return {
        id: log.id,
        type: "activity" as const,
        action: log.action,
        details: detailsText,
        time: formatTime(log.createdAt),
        rawTime: log.createdAt
      }
    }),
    ...automationLogs.map(log => {
      let actionTitle = log.action
      let detailsText = null

      if (log.details) {
        if (typeof log.details === 'string') {
          detailsText = log.details
        } else {
          detailsText = (log.details as any).message || (log.details as any).error || JSON.stringify(log.details)
        }
      }

      if (log.action === "ENTERED") {
        actionTitle = `Entered Automation`
        detailsText = `Enrolled in workflow: "${log.automationRule?.name || 'Unknown'}"`
      } else if (log.action === "EXITED") {
        actionTitle = `Completed Automation`
        detailsText = `Successfully finished workflow: "${log.automationRule?.name || 'Unknown'}"`
      } else if (log.action === "EXECUTED") {
        actionTitle = `Automation Step Run`
      } else if (log.action === "FAILED") {
        actionTitle = `Automation Step Failed`
      }

      return {
        id: log.id,
        type: "automation" as const,
        action: actionTitle,
        details: detailsText,
        time: formatTime(log.createdAt),
        rawTime: log.createdAt
      }
    })
  ].sort((a, b) => b.rawTime.getTime() - a.rawTime.getTime())

  return (
    <ContactDetailsClient 
      contact={contact} 
      activities={combinedActivities} 
      automationStates={contact.automationStates || []} // Note: getContactById includes tags, let's also pass states if needed
    />
  )
}
