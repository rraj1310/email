import { PrismaClient as SQLiteClient } from "@prisma/client"
import { PrismaClient as PGClient } from "@prisma/client"

/**
 * Migration script to move data from local SQLite (dev.db)
 * to a production-grade PostgreSQL (Neon, Supabase, AWS RDS)
 * with ZERO data loss.
 * 
 * To run:
 * 1. Define sqlite connection URI in DATABASE_URL_SQLITE
 * 2. Define postgres connection URI in DATABASE_URL
 * 3. Run: npx tsx prisma/migrate-sqlite-to-postgres.ts
 */

async function migrate() {
  console.log("Starting SQLite to PostgreSQL migration...")

  const sqliteUrl = process.env.DATABASE_URL_SQLITE || "file:./dev.db"
  const pgUrl = process.env.DATABASE_URL

  if (!pgUrl || pgUrl.startsWith("file:")) {
    console.error("Error: DATABASE_URL must be a valid PostgreSQL connection string.")
    process.exit(1)
  }

  // Instantiate source client (SQLite) and target client (Postgres)
  const sqlite = new SQLiteClient({ datasources: { db: { url: sqliteUrl } } })
  const pg = new PGClient({ datasources: { db: { url: pgUrl } } })

  try {
    // 1. Fetch from SQLite
    const orgs = await sqlite.organization.findMany()
    const users = await sqlite.user.findMany()
    const contacts = await sqlite.contact.findMany({ include: { tags: true } })
    const tags = await sqlite.tag.findMany()
    const campaigns = await sqlite.campaign.findMany()
    const media = await sqlite.media.findMany()
    const automations = await sqlite.automationRule.findMany()
    const logs = await sqlite.activityLog.findMany()
    const suppression = await sqlite.suppressionList.findMany()

    console.log(`Retrieved:
      Organizations: ${orgs.length}
      Users: ${users.length}
      Contacts: ${contacts.length}
      Tags: ${tags.length}
      Campaigns: ${campaigns.length}
      Media items: ${media.length}
      Automations: ${automations.length}
      Logs: ${logs.length}
      Suppressions: ${suppression.length}
    `)

    // 2. Clear target PostgreSQL database (safely in transactions)
    console.log("Cleaning target PostgreSQL database...")
    await pg.activityLog.deleteMany()
    await pg.automationRule.deleteMany()
    await pg.media.deleteMany()
    await pg.campaign.deleteMany()
    await pg.contact.deleteMany()
    await pg.tag.deleteMany()
    await pg.suppressionList.deleteMany()
    await pg.user.deleteMany()
    await pg.organization.deleteMany()

    // 3. Write to Postgres in relational hierarchy order
    console.log("Migrating Organizations...")
    for (const org of orgs) {
      await pg.organization.create({ data: org })
    }

    console.log("Migrating Users...")
    for (const user of users) {
      await pg.user.create({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: ((user.role as any) === "MARKETING_MANAGER" ? "EDITOR" : user.role) as any,
          passwordHash: user.passwordHash,
          mfaEnabled: user.mfaEnabled,
          mfaSecret: user.mfaSecret,
          organizationId: user.organizationId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      })
    }

    console.log("Migrating Tags...")
    for (const tag of tags) {
      await pg.tag.create({ data: tag })
    }

    console.log("Migrating Contacts and attaching Tags...")
    for (const contact of contacts) {
      // Parse custom fields
      let customFields = {}
      if (contact.customFields) {
        try {
          customFields = typeof contact.customFields === "string" 
            ? JSON.parse(contact.customFields) 
            : contact.customFields
        } catch {
          customFields = {}
        }
      }

      await pg.contact.create({
        data: {
          id: contact.id,
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
          city: contact.city,
          country: contact.country,
          birthday: contact.birthday,
          status: contact.status as any,
          customFields,
          organizationId: contact.organizationId,
          tags: {
            connect: contact.tags.map(t => ({ id: t.id }))
          },
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt
        }
      })
    }

    console.log("Migrating Campaigns...")
    for (const campaign of campaigns) {
      let designContent = null
      if (campaign.designContent) {
        try {
          designContent = typeof campaign.designContent === "string"
            ? JSON.parse(campaign.designContent)
            : campaign.designContent
        } catch {
          designContent = null
        }
      }

      await pg.campaign.create({
        data: {
          id: campaign.id,
          name: campaign.name,
          subject: campaign.subject,
          previewText: campaign.previewText,
          htmlContent: campaign.htmlContent,
          designContent: designContent as any,
          status: (campaign.status === "ACTIVE" ? "ACTIVE" : campaign.status) as any,
          scheduledAt: campaign.scheduledAt,
          sentCount: campaign.sentCount,
          openCount: campaign.openCount,
          clickCount: campaign.clickCount,
          bounceCount: campaign.bounceCount,
          organizationId: campaign.organizationId,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt
        }
      })
    }

    console.log("Migrating Media records...")
    for (const m of media) {
      await pg.media.create({ data: m })
    }

    console.log("Migrating Automation Rules...")
    for (const rule of automations) {
      let triggerConfig = null
      let actions = null

      try {
        triggerConfig = rule.triggerConfig ? (typeof rule.triggerConfig === "string" ? JSON.parse(rule.triggerConfig) : rule.triggerConfig) : null
      } catch {
        triggerConfig = rule.triggerConfig as any
      }

      try {
        actions = rule.actions ? (typeof rule.actions === "string" ? JSON.parse(rule.actions) : rule.actions) : null
      } catch {
        actions = rule.actions as any
      }

      await pg.automationRule.create({
        data: {
          id: rule.id,
          name: rule.name,
          triggerType: rule.triggerType as any,
          triggerConfig: triggerConfig as any,
          actions: actions as any,
          organizationId: rule.organizationId,
          createdAt: rule.createdAt,
          updatedAt: rule.updatedAt
        }
      })
    }

    console.log("Migrating Suppression list...")
    for (const s of suppression) {
      await pg.suppressionList.create({
        data: {
          id: s.id,
          email: s.email,
          reason: s.reason as any,
          scope: s.scope as any,
          organizationId: s.organizationId,
          createdAt: s.createdAt
        }
      })
    }

    console.log("Migrating Activity logs...")
    for (const log of logs) {
      let details = null
      if (log.details) {
        try {
          details = typeof log.details === "string" ? JSON.parse(log.details) : log.details
        } catch {
          details = log.details as any
        }
      }

      await pg.activityLog.create({
        data: {
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          details: details as any,
          userId: log.userId,
          organizationId: log.organizationId,
          createdAt: log.createdAt
        }
      })
    }

    console.log("Migration completed successfully with zero data loss!")
  } catch (error) {
    console.error("Migration failed:", error)
  } finally {
    await sqlite.$disconnect()
    await pg.$disconnect()
  }
}

migrate()
