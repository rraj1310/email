import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
import {
  csvImport,
  campaignDispatch,
  analyticsAggregate,
  automationRunJourney,
  onContactCreated,
  onContactUpdated,
  onCampaignOpened,
  onCampaignClicked,
  onTagAdded,
  onFormSubmitted,
  birthdayDailyCheck,
  personalizedDispatch,
  scheduledAutomationCheck,
} from "@/inngest/functions"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    csvImport,
    campaignDispatch,
    analyticsAggregate,
    automationRunJourney,
    onContactCreated,
    onContactUpdated,
    onCampaignOpened,
    onCampaignClicked,
    onTagAdded,
    onFormSubmitted,
    birthdayDailyCheck,
    personalizedDispatch,
    scheduledAutomationCheck,
  ],
})
