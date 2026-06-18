"use server"

import { db as prisma } from "@/lib/db"
import { logActivity } from "./dashboard"
import { revalidatePath } from "next/cache"
import { PLANS, PlanType } from "@/lib/plans"
import { getActiveWorkspaceContext, enforceWorkspaceAdmin } from "@/lib/tenant"

import { stripe, PLAN_PRICE_IDS } from "@/lib/stripe"

// Retrieve billing details and current workspace usage metrics
export async function getBillingDetails() {
  try {
    const { organizationId } = await getActiveWorkspaceContext()

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            contacts: true,
            users: true
          }
        }
      }
    })

    if (!org) {
      return { success: false, error: "Workspace not found" }
    }

    // Get number of campaigns sent this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const campaignsSentCount = await prisma.campaign.aggregate({
      where: {
        organizationId: organizationId,
        status: "COMPLETED",
        createdAt: { gte: startOfMonth }
      },
      _sum: {
        sentCount: true
      }
    })

    const emailsSentCount = campaignsSentCount._sum.sentCount || 0
    const activePlan = (org.plan || "FREE") as PlanType
    const planLimits = PLANS[activePlan]

    return {
      success: true,
      data: {
        plan: activePlan,
        subscriptionStatus: org.subscriptionStatus || "active",
        currentPeriodEnd: org.currentPeriodEnd,
        usage: {
          contactsCount: org._count.contacts,
          contactsLimit: planLimits.maxContacts,
          contactsUsagePercent: Math.min(Math.round((org._count.contacts / planLimits.maxContacts) * 100), 100),
          
          seatsCount: org._count.users,
          seatsLimit: planLimits.maxSeats,
          seatsUsagePercent: Math.min(Math.round((org._count.users / planLimits.maxSeats) * 100), 100),
          
          emailsCount: emailsSentCount,
          emailsLimit: activePlan === "FREE" ? 5000 : activePlan === "STARTER" ? 20000 : activePlan === "PRO" ? 100000 : 10000000,
          emailsUsagePercent: Math.min(Math.round((emailsSentCount / (activePlan === "FREE" ? 5000 : activePlan === "STARTER" ? 20000 : activePlan === "PRO" ? 100000 : 10000000)) * 100), 100)
        }
      }
    }
  } catch (error: any) {
    console.error("Failed to load billing details:", error)
    return { success: false, error: error.message || "Failed to load billing info" }
  }
}

// Real Stripe checkout flow
export async function createCheckoutSession(plan: PlanType) {
  try {
    const { organizationId, userId } = await enforceWorkspaceAdmin()

    if (plan === "FREE") {
      // Free plan requires resetting subscription status
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          plan: "FREE",
          subscriptionStatus: null,
          currentPeriodEnd: null,
          stripeSubscriptionId: null,
          stripePriceId: null
        }
      })
      await logActivity("Downgraded workspace subscription to Free", "SETTINGS")
      revalidatePath("/settings")
      return { success: true, data: { checkoutUrl: "/settings?tab=billing" } }
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId }
    })

    if (!org) {
      return { success: false, error: "Workspace not found" }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    })

    const priceId = PLAN_PRICE_IDS[plan]
    if (!priceId) {
      return { success: false, error: "Invalid plan selected" }
    }

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

    const session = await stripe.checkout.sessions.create({
      customer: org.stripeCustomerId || undefined,
      customer_email: org.stripeCustomerId ? undefined : user?.email,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${appUrl}/settings?tab=billing&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/settings?tab=billing`,
      metadata: {
        organizationId,
        plan
      },
    })

    return { success: true, data: { checkoutUrl: session.url } }
  } catch (error: any) {
    console.error("Failed to create Stripe checkout session:", error)
    return { success: false, error: error.message || "Failed to initialize subscription purchase" }
  }
}
