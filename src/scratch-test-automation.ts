import { db as prisma } from "./lib/db"

async function main() {
  try {
    const org = await prisma.organization.findFirst()
    if (!org) {
      console.log("No organization found")
      return
    }
    console.log("Found organization:", org.id)

    const rule = await prisma.automationRule.create({
      data: {
        name: "Test Automation",
        triggerType: "NEW_CONTACT",
        triggerConfig: { status: "ACTIVE", description: "Triggered when new contact is added" },
        actions: [],
        nodes: [
          {
            id: "trigger-node",
            type: "triggerNode",
            position: { x: 250, y: 100 },
            data: { label: "Trigger: NEW_CONTACT", type: "NEW_CONTACT", config: {} }
          }
        ],
        edges: [],
        isActive: false,
        organizationId: org.id
      }
    })
    console.log("Successfully created rule:", rule.id)
  } catch (error) {
    console.error("Prisma error details:", error)
  }
}

main()
