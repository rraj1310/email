export const dynamic = "force-dynamic"

import { getSuppressionList, getSuppressionStats } from "@/app/actions/suppression"
import { SuppressionClient } from "./suppression-client"

export default async function SuppressionPage() {
  const listResult = await getSuppressionList()
  const statsResult = await getSuppressionStats()

  const list = ("data" in listResult && listResult.data) ? listResult.data : []
  const stats = ("data" in statsResult && statsResult.data) ? statsResult.data : {
    unsubscribed: 0,
    bounced: 0,
    complained: 0,
    total: 0
  }

  return <SuppressionClient initialList={list} stats={stats} />
}
