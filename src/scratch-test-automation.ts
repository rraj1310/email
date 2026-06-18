import { db as prisma } from "./lib/db"

async function main() {
  try {
    const list = await prisma.organization.findMany({
      select: {
        id: true,
        name: true
      }
    })
    console.log("Database Organizations:", list)
  } catch (error) {
    console.error("Error listing orgs:", error)
  }
}

main()
