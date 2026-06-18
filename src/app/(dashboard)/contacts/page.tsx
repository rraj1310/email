export const dynamic = "force-dynamic"

import { getContacts } from "@/app/actions/contacts"
import { ContactsClient } from "./contacts-client"

export default async function ContactsPage() {
  const result = await getContacts()
  const contacts = (result.success && result.data) ? result.data : []

  return <ContactsClient initialContacts={contacts} />
}

