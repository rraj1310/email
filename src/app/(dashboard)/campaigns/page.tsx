export const dynamic = "force-dynamic"

import { getCampaigns } from "@/app/actions/campaigns"
import { CampaignsClient } from "./campaigns-client"

export default async function CampaignsPage() {
  const result = await getCampaigns()
  const campaigns = result.success && result.data ? result.data : []

  return <CampaignsClient initialCampaigns={campaigns} />
}
