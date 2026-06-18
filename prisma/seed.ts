import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clean up existing data (optional, but good for idempotent seeds)
  await prisma.activityLog.deleteMany()
  await prisma.automationRule.deleteMany()
  await prisma.media.deleteMany()
  await prisma.campaign.deleteMany()
  // Disconnect tags from contacts to avoid constraint issues before deleting
  await prisma.contact.updateMany({
    data: {
      // Tags cannot be updated directly with updateMany, so we just clear everything.
    }
  })
  await prisma.tag.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.suppressionList.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()

  // 1. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Corp',
      customDomain: 'marketing.acme.com',
      brandColorPrimary: '#0f172a',
    },
  })

  // 2. Create Users
  await prisma.user.createMany({
    data: [
      { email: 'admin@acme.com', name: 'Alice Admin', role: 'ADMIN', organizationId: org.id },
      { email: 'manager@acme.com', name: 'Bob Manager', role: 'EDITOR', organizationId: org.id },
      { email: 'viewer@acme.com', name: 'Charlie Viewer', role: 'VIEWER', organizationId: org.id },
    ],
  })

  // 3. Create Tags
  const vipTag = await prisma.tag.create({ data: { name: 'VIP', organizationId: org.id } })
  await prisma.tag.create({ data: { name: 'Leads', organizationId: org.id } })
  await prisma.tag.create({ data: { name: 'Customers', organizationId: org.id } })

  // 4. Create Contacts (Generate 100 sample contacts)
  const contactsData = Array.from({ length: 100 }).map((_, i) => ({
    email: `contact${i + 1}@example.com`,
    firstName: `First${i + 1}`,
    lastName: `Last${i + 1}`,
    city: i % 2 === 0 ? 'New York' : 'London',
    country: i % 2 === 0 ? 'USA' : 'UK',
    status: (i < 5 ? 'UNSUBSCRIBED' : (i < 10 ? 'BOUNCED' : 'ACTIVE')) as any,
    organizationId: org.id,
    customFields: { industry: i % 3 === 0 ? 'Tech' : 'Retail' },
  }))

  await prisma.contact.createMany({ data: contactsData })
  const allContacts = await prisma.contact.findMany()

  // Assign tags to some contacts
  for (let i = 0; i < 20; i++) {
    await prisma.contact.update({
      where: { id: allContacts[i].id },
      data: { tags: { connect: [{ id: vipTag.id }] } },
    })
  }

  // 5. Create Campaigns
  await prisma.campaign.create({
    data: {
      name: 'Welcome Series - Email 1',
      subject: 'Welcome to Acme!',
      status: 'COMPLETED',
      sentCount: 500,
      openCount: 250,
      clickCount: 50,
      bounceCount: 2,
      organizationId: org.id,
    },
  })

  await prisma.campaign.create({
    data: {
      name: 'Summer Sale Promo',
      subject: 'Don\'t miss out on our summer sale!',
      status: 'SCHEDULED',
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
      organizationId: org.id,
    },
  })

  // 6. Create Automation Rules
  await prisma.automationRule.create({
    data: {
      name: 'Birthday Greeting',
      triggerType: 'BIRTHDAY',
      organizationId: org.id,
    },
  })

  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
