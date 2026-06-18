export const dynamic = "force-dynamic"

import { getContacts } from "@/app/actions/contacts"
import { ContactsClient } from "./contacts-client"

export default async function ContactsPage() {
  const result = await getContacts()
  const contacts = "data" in result ? result.data : []

  return <ContactsClient initialContacts={contacts} />
}

