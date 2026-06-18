export const dynamic = "force-dynamic"

import { getCampaigns } from "@/app/actions/campaigns"
import { getContacts } from "@/app/actions/contacts"
import { CampaignsClient } from "./campaigns-client"

export default async function CampaignsPage() {
  const campaignsResult = await getCampaigns()
  const contactsResult = await getContacts()
  const campaigns = "data" in campaignsResult ? campaignsResult.data : []
  const contacts = "data" in contactsResult ? contactsResult.data : []

  return <CampaignsClient initialCampaigns={campaigns} initialContacts={contacts} />
}
