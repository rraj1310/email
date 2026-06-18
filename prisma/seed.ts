import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Clearing old database entries...')
  
  await prisma.membership.deleteMany()
  await prisma.account.deleteMany()
  await prisma.session.deleteMany()
  await prisma.activityLog.deleteMany()
  await prisma.aiUsageLog.deleteMany()
  await prisma.contactAutomationState.deleteMany()
  await prisma.automationLog.deleteMany()
  await prisma.campaign.deleteMany()
  await prisma.media.deleteMany()
  await prisma.automationRule.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.suppressionList.deleteMany()
  await prisma.workspaceInvite.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()

  console.log('Seeding super admin account...')
  
  // 1. Create Default Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Workspace',
      brandColorPrimary: '#4f46e5',
    },
  })

  // Hash password
  const passwordHash = bcrypt.hashSync('test@#12', 10)

  // 2. Create User
  const user = await prisma.user.create({
    data: {
      email: 'test@mail.com',
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      passwordHash: passwordHash,
      organizationId: org.id,
    },
  })

  // 3. Create Membership
  await prisma.membership.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      role: 'SUPER_ADMIN',
    },
  })

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
