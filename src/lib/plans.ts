// Shared plan constants — NOT a "use server" file so we can export types and objects

export type PlanType = "FREE" | "STARTER" | "PRO" | "ENTERPRISE"

export const PLANS: Record<string, { name: string; maxContacts: number; maxSeats: number; features: string[] }> = {
  FREE: {
    name: "Free",
    maxContacts: 1000,
    maxSeats: 3,
    features: ["Basic Email Campaigns", "Contact Management"]
  },
  STARTER: {
    name: "Starter",
    maxContacts: 5000,
    maxSeats: 5,
    features: ["Standard Contacts Limit", "Standard SMTP Support"]
  },
  PRO: {
    name: "Pro",
    maxContacts: 25000,
    maxSeats: 15,
    features: ["Automation Builder", "Advanced Reports & CRM"]
  },
  ENTERPRISE: {
    name: "Enterprise",
    maxContacts: 1000000,
    maxSeats: 100,
    features: ["SAML SSO", "Audit Logs", "White Label Custom Domains"]
  }
}
