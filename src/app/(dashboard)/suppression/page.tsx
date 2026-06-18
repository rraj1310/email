export const dynamic = "force-dynamic"

import { getSuppressionList, getSuppressionStats } from "@/app/actions/suppression"
import { SuppressionClient } from "./suppression-client"

export default async function SuppressionPage() {
  const listResult = await getSuppressionList()
  const statsResult = await getSuppressionStats()

  const list = listResult.success && listResult.data ? listResult.data : []
  const stats = statsResult.success && statsResult.data ? statsResult.data : {
    unsubscribed: 0,
    bounced: 0,
    complained: 0,
    total: 0
  }

  return <SuppressionClient initialList={list} stats={stats} />
}
