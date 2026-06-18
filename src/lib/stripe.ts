import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "mock_stripe_secret_key", {
  // @ts-ignore
  apiVersion: "2023-10-16",
})

export const PLAN_PRICE_IDS = {
  STARTER: process.env.STRIPE_PRICE_STARTER || "price_1StarterMockId",
  PRO: process.env.STRIPE_PRICE_PRO || "price_1ProMockId",
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || "price_1EnterpriseMockId",
}
