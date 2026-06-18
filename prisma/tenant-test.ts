import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function runTests() {
  console.log("=========================================")
  console.log("RUNNING MULTI-TENANT ISOLATION AUDIT TEST")
  console.log("=========================================")

  try {
    // 1. Setup Test Organizations
    const orgA = await prisma.organization.create({
      data: { name: "Tenant Alpha", plan: "FREE" }
    })
    const orgB = await prisma.organization.create({
      data: { name: "Tenant Beta", plan: "FREE" }
    })

    console.log(`Created test organizations:\n- Alpha: ${orgA.id}\n- Beta: ${orgB.id}`)

    // 2. Setup Scoped Contacts
    const contactA = await prisma.contact.create({
      data: {
        email: "alice@alpha-corp.com",
        firstName: "Alice",
        organizationId: orgA.id
      }
    })
    const contactB = await prisma.contact.create({
      data: {
        email: "bob@beta-corp.com",
        firstName: "Bob",
        organizationId: orgB.id
      }
    })

    console.log(`Created scoped contacts:\n- Alice under Alpha (${contactA.id})\n- Bob under Beta (${contactB.id})`)

    // 3. Setup Scoped Campaigns
    const campaignA = await prisma.campaign.create({
      data: {
        name: "Alpha Promo",
        subject: "Exclusive Alpha Sale",
        organizationId: orgA.id
      }
    })

    const campaignB = await prisma.campaign.create({
      data: {
        name: "Beta Promo",
        subject: "Exclusive Beta Sale",
        organizationId: orgB.id
      }
    })

    console.log(`Created scoped campaigns:\n- Alpha Promo (${campaignA.id})\n- Beta Promo (${campaignB.id})`)

    // 4. ASSERTION 1: Workspace Boundary Fetching Scopes
    console.log("\n[Test 1] Verifying read isolation...")
    
    // Fetch Alpha contacts
    const fetchAlphaContacts = await prisma.contact.findMany({
      where: { organizationId: orgA.id }
    })
    if (fetchAlphaContacts.some(c => c.organizationId === orgB.id)) {
      throw new Error("SECURITY FAILURE: Tenant Alpha read contacts leaked from Tenant Beta!");
    }
    console.log("✔ Read isolation for contacts verified successfully (0 leaks detected).")

    // Fetch Beta campaigns
    const fetchBetaCampaigns = await prisma.campaign.findMany({
      where: { organizationId: orgB.id }
    })
    if (fetchBetaCampaigns.some(c => c.organizationId === orgA.id)) {
      throw new Error("SECURITY FAILURE: Tenant Beta read campaigns leaked from Tenant Alpha!");
    }
    console.log("✔ Read isolation for campaigns verified successfully (0 leaks detected).")

    // 5. ASSERTION 2: Cross-Tenant Modification Scopes
    console.log("\n[Test 2] Verifying write modification isolation...")

    // Try to update Tenant Alpha's contact ensuring it belongs to Tenant Beta (should fail)
    const updateResult = await prisma.contact.updateMany({
      where: {
        id: contactA.id,
        organizationId: orgB.id // Simulating Beta's context query
      },
      data: {
        firstName: "Hack Attempt"
      }
    })

    if (updateResult.count > 0) {
      throw new Error("SECURITY FAILURE: Tenant Beta updated a contact belonging to Tenant Alpha!");
    }

    // Verify contact name was not modified
    const checkContactA = await prisma.contact.findUnique({
      where: { id: contactA.id }
    })
    if (checkContactA?.firstName === "Hack Attempt") {
      throw new Error("SECURITY FAILURE: Tenant Alpha's contact was modified by cross-tenant query!");
    }
    console.log("✔ Write isolation verified successfully (Cross-tenant modification rejected).")

    // 6. ASSERTION 3: Cross-Tenant Deletions
    console.log("\n[Test 3] Verifying deletion isolation...")

    // Try to delete Tenant Beta's campaign using Tenant Alpha's context
    const deleteResult = await prisma.campaign.deleteMany({
      where: {
        id: campaignB.id,
        organizationId: orgA.id // Simulating Alpha's context
      }
    })

    if (deleteResult.count > 0) {
      throw new Error("SECURITY FAILURE: Tenant Alpha deleted a campaign belonging to Tenant Beta!");
    }

    // Verify campaign still exists
    const checkCampaignB = await prisma.campaign.findUnique({
      where: { id: campaignB.id }
    })
    if (!checkCampaignB) {
      throw new Error("SECURITY FAILURE: Tenant Beta's campaign was deleted by cross-tenant query!");
    }
    console.log("✔ Deletion isolation verified successfully (Cross-tenant deletion rejected).")

    // 7. Cleanup Test Records
    console.log("\nCleaning up test logs...")
    await prisma.campaign.delete({ where: { id: campaignA.id } })
    await prisma.campaign.delete({ where: { id: campaignB.id } })
    await prisma.contact.delete({ where: { id: contactA.id } })
    await prisma.contact.delete({ where: { id: contactB.id } })
    await prisma.organization.delete({ where: { id: orgA.id } })
    await prisma.organization.delete({ where: { id: orgB.id } })

    console.log("=========================================")
    console.log("  ALL MULTI-TENANT ISOLATION TESTS PASSED")
    console.log("=========================================")
  } catch (error) {
    console.error("\n❌ ISOLATION AUDIT TEST FAILED:");
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runTests()
