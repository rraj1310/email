import { getAutomations } from "@/app/actions/automations"
import { getBirthdaySettings } from "@/app/actions/birthday"
import { AutomationsClient } from "./automations-client"

export default async function AutomationsPage() {
  const result = await getAutomations()
  const list = result.success && result.data ? result.data : []

  const bdayResult = await getBirthdaySettings()
  const birthdaySettings = bdayResult.success && bdayResult.data ? bdayResult.data : {
    birthdayAutomationEnabled: false,
    birthdayEmailTime: "09:00",
    todayBirthdays: [] as Array<{ id: string; name: string; email: string }>
  }

  return (
    <AutomationsClient 
      initialAutomations={list} 
      birthdaySettings={birthdaySettings} 
    />
  )
}
