"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useParams } from "next/navigation"

const GrapesJSEditor = dynamic(() => import("@/components/campaigns/grapesjs-editor").then(mod => mod.GrapesJSEditor), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-screen bg-background text-sm text-muted-foreground">Loading Designer Workspace...</div>
})

export default function CampaignEditorPage() {
  const params = useParams()
  const campaignId = params.id as string

  return (
    <div className="w-screen h-screen overflow-hidden bg-background">
      <GrapesJSEditor campaignId={campaignId} />
    </div>
  )
}
