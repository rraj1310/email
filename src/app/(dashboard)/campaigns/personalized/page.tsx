export const dynamic = "force-dynamic"

import { getContacts, getTags } from "@/app/actions/contacts"
import { PersonalizedClient } from "./personalized-client"

export default async function PersonalizedCampaignPage() {
  const contactsRes = await getContacts()
  const tagsRes = await getTags()

  const contacts = "data" in contactsRes ? contactsRes.data : []
  const tags = "data" in tagsRes ? tagsRes.data : []

  return <PersonalizedClient initialContacts={contacts} initialTags={tags} />
}
