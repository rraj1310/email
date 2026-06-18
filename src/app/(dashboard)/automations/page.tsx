import { getAutomations } from "@/app/actions/automations"
import { AutomationsClient } from "./automations-client"

export default async function AutomationsPage() {
  const result = await getAutomations()
  const list = result.success && result.data ? result.data : []

  return <AutomationsClient initialAutomations={list} />
}
