import { db as prisma } from "./lib/db"

async function main() {
  try {
    const org = await prisma.organization.findFirst()
    if (!org) {
      console.log("No organization found")
      return
    }
    console.log("Found organization:", org.id)

    // Get trigger labels for clean displaying
    const triggerLabels: Record<string, string> = {
      NEW_CONTACT: "When: Contact Created",
      TAG_ADDED: "When: Tag Added",
      CAMPAIGN_OPENED: "When: Campaign Opened",
      LINK_CLICKED: "When: Link Clicked",
      BIRTHDAY: "When: Contact's Birthday"
    }

    const triggerLabel = triggerLabels["NEW_CONTACT"]

    // Default trigger and connected action node configs to make it simple for non-tech users
    const initialNodes = [
      {
        id: "trigger-node",
        type: "triggerNode",
        position: { x: 250, y: 100 },
        data: { label: triggerLabel, type: "NEW_CONTACT", config: {} }
      },
      {
        id: "action-node-1",
        type: "actionNode",
        position: { x: 250, y: 280 },
        data: { actionType: "SEND_EMAIL", label: "Send Email Campaign", campaignId: "" }
      }
    ]

    const initialEdges = [
      {
        id: "e-trigger-action",
        source: "trigger-node",
        target: "action-node-1"
      }
    ]

    const actionsJson = [
      {
        nodeId: "action-node-1",
        actionType: "SEND_EMAIL",
        campaignId: "",
        waitDays: 0,
        tagName: ""
      }
    ]

    const rule = await prisma.automationRule.create({
      data: {
        name: "Test Automation",
        triggerType: "NEW_CONTACT",
        triggerConfig: { status: "ACTIVE", description: "Triggered when new contact is added" },
        actions: actionsJson,
        nodes: initialNodes,
        edges: initialEdges,
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
