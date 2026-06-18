import { getContacts, getTags } from "@/app/actions/contacts"
import { PersonalizedClient } from "./personalized-client"

export default async function PersonalizedCampaignPage() {
  const contactsRes = await getContacts()
  const tagsRes = await getTags()

  const contacts = contactsRes.success && contactsRes.data ? contactsRes.data : []
  const tags = tagsRes.success && tagsRes.data ? tagsRes.data : []

  return <PersonalizedClient initialContacts={contacts} initialTags={tags} />
}
