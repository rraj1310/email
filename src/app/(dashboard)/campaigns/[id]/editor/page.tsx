"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { EmailBuilder } from "@/components/campaigns/email-builder"

export default function CampaignEditorPage() {
  const params = useParams()
  const campaignId = params.id as string

  return (
    <div className="w-screen h-screen overflow-hidden bg-background">
      <EmailBuilder campaignId={campaignId} />
    </div>
  )
}
