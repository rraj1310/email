import { getDashboardStats } from "@/app/actions/dashboard"
import { getCampaigns } from "@/app/actions/campaigns"
import { ReportsClient } from "./reports-client"

export default async function ReportsPage() {
  const statsResult = await getDashboardStats()
  const campaignsResult = await getCampaigns()

  const stats = statsResult.success && statsResult.data ? statsResult.data : {
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
    unsubscribeRate: 0,
    chartData: []
  }

  const campaigns = campaignsResult.success && campaignsResult.data ? campaignsResult.data : []
  
  // Format comparison data for chart: only SENT or COMPLETED campaigns that have dispatched
  const campaignData = campaigns
    .filter(c => c.sentCount > 0)
    .map(c => ({
      name: c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name,
      opens: c.openCount,
      clicks: c.clickCount,
      sent: c.sentCount
    }))
    .reverse()

  return (
    <ReportsClient 
      campaignData={campaignData} 
      stats={{
        openRate: stats.openRate,
        clickRate: stats.clickRate,
        bounceRate: stats.bounceRate,
        unsubscribeRate: stats.unsubscribeRate
      }} 
    />
  )
}
