import { getOnboardingState } from "@/app/actions/onboarding"
import { OnboardingClient } from "./onboarding-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
  const result = await getOnboardingState()
  
  if (!result.success || !result.data) {
    redirect("/login")
  }
  
  return (
    <OnboardingClient 
      initialData={result.data}
    />
  )
}
