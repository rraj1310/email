export const dynamic = "force-dynamic"

import { getAutomations } from "@/app/actions/automations"
import { getBirthdaySettings } from "@/app/actions/birthday"
import { getCampaigns } from "@/app/actions/campaigns"
import { AutomationsClient } from "./automations-client"

export default async function AutomationsPage() {
  const result = await getAutomations()
  const list = ("data" in result && result.data) ? result.data : []

  const bdayResult = await getBirthdaySettings()
  const birthdaySettings = ("data" in bdayResult && bdayResult.data) ? bdayResult.data : {
    birthdayAutomationEnabled: false,
    birthdayEmailTime: "09:00",
    todayBirthdays: [] as Array<{ id: string; name: string; email: string }>,
    templateConfig: {
      subject: "Happy Birthday! 🎂",
      bodyText: "Wishing you a wonderful year ahead filled with happiness and success!",
      bannerUrl: ""
    }
  }

  const campaignsResult = await getCampaigns()
  const campaigns = ("data" in campaignsResult && campaignsResult.data) ? campaignsResult.data : []

  return (
    <AutomationsClient 
      initialAutomations={list} 
      birthdaySettings={birthdaySettings} 
      campaigns={campaigns}
    />
  )
}
