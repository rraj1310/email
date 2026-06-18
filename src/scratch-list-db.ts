import { db as prisma } from "./lib/db"

async function main() {
  const users = await prisma.user.findMany()
  console.log("Users:", users.map(u => ({ id: u.id, email: u.email, role: u.role, orgId: u.organizationId })))

  const orgs = await prisma.organization.findMany()
  console.log("Orgs:", orgs.map(o => ({ id: o.id, name: o.name })))

  const rules = await prisma.automationRule.findMany()
  console.log("Rules Count:", rules.length)
  if (rules.length > 0) {
    console.log("First Rule:", JSON.stringify(rules[0], null, 2))
  }
}

main()
