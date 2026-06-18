import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/db"
import { PlanType } from "@/lib/plans"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature") || ""
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event;

  try {
    if (!webhookSecret || !sig) {
      if (process.env.NODE_ENV === "development" || !process.env.STRIPE_SECRET_KEY) {
        console.warn("⚠️ STRIPE_WEBHOOK_SECRET or stripe-signature is missing. Processing event without signature verification (Developer Mode).")
        event = JSON.parse(body)
      } else {
        throw new Error("Missing signature or webhook secret in production.")
      }
    } else {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    }
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  const session = event.data.object as any;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const orgId = session.metadata?.organizationId
        const plan = session.metadata?.plan as PlanType
        
        if (orgId && plan) {
          const subscriptionId = session.subscription as string
          const customerId = session.customer as string

          // Retrieve full subscription to get period dates
          let currentPeriodEnd = new Date()
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1) // safe fallback

          try {
            if (subscriptionId && !subscriptionId.startsWith("sub_mock") && !subscriptionId.startsWith("mock")) {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId)
              currentPeriodEnd = new Date((subscription as any).current_period_end * 1000)
            }
          } catch (err) {
            console.error("Failed to retrieve subscription from Stripe API:", err)
          }

          await db.organization.update({
            where: { id: orgId },
            data: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              plan,
              subscriptionStatus: "active",
              currentPeriodEnd
            }
          })
          console.log(`Successfully completed Stripe checkout for org ${orgId} to ${plan}`)
        }
        break
      }

      case "customer.subscription.updated": {
        const subscriptionId = session.id
        const customerId = session.customer as string
        const status = session.status
        const currentPeriodEnd = new Date(session.current_period_end * 1000)
        const priceId = session.items?.data?.[0]?.price?.id

        // Map priceId back to PlanType
        let plan: PlanType = "FREE"
        if (priceId) {
          if (priceId === process.env.STRIPE_PRICE_STARTER || priceId === "price_1StarterMockId") {
            plan = "STARTER"
          } else if (priceId === process.env.STRIPE_PRICE_PRO || priceId === "price_1ProMockId") {
            plan = "PRO"
          } else if (priceId === process.env.STRIPE_PRICE_ENTERPRISE || priceId === "price_1EnterpriseMockId") {
            plan = "ENTERPRISE"
          }
        }

        // Find organization by subscriptionId or customerId
        const org = await db.organization.findFirst({
          where: {
            OR: [
              { stripeSubscriptionId: subscriptionId },
              { stripeCustomerId: customerId }
            ]
          }
        })

        if (org) {
          await db.organization.update({
            where: { id: org.id },
            data: {
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: customerId,
              plan: plan !== "FREE" ? plan : (org.plan as PlanType),
              subscriptionStatus: status,
              currentPeriodEnd
            }
          })
          console.log(`Updated subscription state for org ${org.id}`)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscriptionId = session.id
        
        const org = await db.organization.findFirst({
          where: { stripeSubscriptionId: subscriptionId }
        })

        if (org) {
          await db.organization.update({
            where: { id: org.id },
            data: {
              plan: "FREE",
              subscriptionStatus: "canceled",
              currentPeriodEnd: null,
              stripeSubscriptionId: null
            }
          })
          console.log(`Canceled subscription for org ${org.id}`)
        }
        break
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error("Webhook processing failure:", err)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
