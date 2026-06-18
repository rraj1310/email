import { db as prisma } from "./lib/db"

async function main() {
  try {
    // Let's find the first automation rule
    const rule = await prisma.automationRule.findFirst()
    if (!rule) {
      console.log("No automation rules found.")
      return
    }
    console.log("Found rule:", rule.name, rule.id)
    
    // Try to delete it
    await prisma.automationRule.delete({
      where: { id: rule.id }
    })
    console.log("Successfully deleted rule!")
  } catch (error: any) {
    console.error("Prisma Error Deleting Automation Rule:", error)
  }
}

main()
