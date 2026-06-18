export const dynamic = "force-dynamic"

import { getSettings } from "@/app/actions/settings"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
  const result = await getSettings()
  
  const org = result.success && result.data?.organization ? result.data.organization : {
    id: "",
    name: "Acme Corp",
    logoUrl: null,
    brandColorPrimary: "#0f172a",
    customDomain: "marketing.acme.com",
    customEmailFooter: "© Acme Corp. All rights reserved.",
    aiProvider: "GEMINI",
    aiApiKey: "",
    aiModelOverride: ""
  }
  
  const users = result.success && result.data?.users ? result.data.users : []

  return (
    <SettingsClient 
      organization={org} 
      users={users} 
    />
  )
}
