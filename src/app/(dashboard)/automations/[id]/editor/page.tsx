import { getAutomationById } from "@/app/actions/automations"
import { getCampaigns } from "@/app/actions/campaigns"
import AutomationsEditor from "@/components/automations/automations-editor"
import { redirect } from "next/navigation"

interface EditorPageProps {
  params: Promise<{ id: string }>
}

export default async function EditorPage({ params }: EditorPageProps) {
  const resolvedParams = await params
  const id = resolvedParams.id

  const ruleResult = await getAutomationById(id)
  if (!ruleResult.success || !ruleResult.data) {
    redirect("/automations")
  }

  const campaignsResult = await getCampaigns()
  const campaigns = campaignsResult.success && campaignsResult.data ? campaignsResult.data : []

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Workflow Designer: {ruleResult.data.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            Configure visual marketing triggers, delays, condition statements and actions.
          </p>
        </div>
      </div>
      <AutomationsEditor
        automationId={id}
        initialRule={ruleResult.data}
        campaigns={campaigns}
      />
    </div>
  )
}
