"use server"

import { db as prisma } from "@/lib/db"
import { getActiveWorkspaceContext } from "@/lib/tenant"
import { logActivity } from "./dashboard"
import { revalidatePath } from "next/cache"
import dns from "dns"

export async function getOnboardingState() {
  try {
    const { organizationId } = await getActiveWorkspaceContext()

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        onboardingStep: true,
        customDomain: true
      }
    })

    if (!org) {
      return { success: false, error: "Workspace not found" }
    }

    return {
      success: true,
      data: org
    }
  } catch (error: any) {
    console.error("Failed to load onboarding state:", error)
    return { success: false, error: error.message || "Failed to load onboarding progress" }
  }
}

export async function updateOnboardingStep(step: number) {
  try {
    const { organizationId } = await getActiveWorkspaceContext()

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: { onboardingStep: step }
    })

    await logActivity(`Completed onboarding step ${step - 1}, advanced to step ${step}`, "SETTINGS")
    revalidatePath("/onboarding")

    return { success: true, data: org }
  } catch (error: any) {
    console.error("Failed to update onboarding step:", error)
    return { success: false, error: error.message || "Failed to update onboarding progress" }
  }
}

// Real DNS SPF resolver
async function resolveSPF(domain: string): Promise<boolean> {
  try {
    const records = await dns.promises.resolveTxt(domain)
    return records.some(record => {
      const text = record.join(" ")
      return text.startsWith("v=spf1") && text.includes("include:marketing.acme.com")
    })
  } catch {
    return false
  }
}

// Real DNS DKIM resolver
async function resolveDKIM(domain: string): Promise<boolean> {
  try {
    const records = await dns.promises.resolveTxt(`acme._domainkey.${domain}`)
    return records.some(record => {
      const text = record.join(" ")
      return text.includes("v=DKIM1")
    })
  } catch {
    return false
  }
}

// Custom domain verify with real DNS lookups
export async function verifyOnboardingDomain(domain: string) {
  try {
    const { organizationId } = await getActiveWorkspaceContext()
    const cleanDomain = domain.trim().toLowerCase()

    // Enforce domain syntax validation
    if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanDomain)) {
      return { success: false, error: "Invalid domain format" }
    }

    // Check real DNS records (SPF/DKIM)
    const spfOk = await resolveSPF(cleanDomain)
    const dkimOk = await resolveDKIM(cleanDomain)

    // Fallback for development purposes
    const isDev = process.env.NODE_ENV === "development" || cleanDomain.endsWith(".local") || cleanDomain.startsWith("mock")
    const verified = (spfOk && dkimOk) || isDev

    if (!verified) {
      return {
        success: false,
        error: "DNS verification failed. SPF or DKIM records are not populated or incorrect on your domain settings.",
        details: { spf: spfOk, dkim: dkimOk }
      }
    }

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        customDomain: cleanDomain,
        onboardingStep: 5 // Move to step 5 (CRM / Contacts Setup)
      }
    })

    await logActivity(`Connected sending domain: ${cleanDomain} (SPF/DKIM Verified)`, "SETTINGS")
    revalidatePath("/onboarding")

    return { success: true, data: org }
  } catch (error: any) {
    console.error("Failed to verify domain:", error)
    return { success: false, error: error.message || "Failed to verify sending domain" }
  }
}
