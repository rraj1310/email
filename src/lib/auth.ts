import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import AzureADProvider from "next-auth/providers/azure-ad"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import EmailProvider from "next-auth/providers/email"
import { sendMail } from "@/lib/email"

function htmlVerificationTemplate({ url, host }: { url: string; host: string }) {
  const escapedHost = host.replace(/\./g, "&#8203;.");
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sign in to ${escapedHost}</title>
      <style>
        body {
          background-color: #f6f9fc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        .container {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          margin: 40px auto;
          max-width: 500px;
          padding: 32px;
          text-align: center;
        }
        .logo {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 24px;
          letter-spacing: -0.05em;
        }
        .logo span {
          color: #4f46e5;
        }
        h1 {
          color: #0f172a;
          font-size: 22px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        p {
          color: #475569;
          font-size: 15px;
          line-height: 24px;
          margin-bottom: 24px;
        }
        .btn {
          background-color: #4f46e5;
          border-radius: 6px;
          color: #ffffff !important;
          display: inline-block;
          font-size: 15px;
          font-weight: 600;
          line-height: 48px;
          text-decoration: none;
          width: 100%;
          text-align: center;
          margin-bottom: 24px;
        }
        .btn:hover {
          background-color: #4338ca;
        }
        .footer {
          color: #94a3b8;
          font-size: 12px;
          line-height: 18px;
          border-top: 1px solid #f1f5f9;
          margin-top: 32px;
          padding-top: 16px;
        }
        .link {
          color: #4f46e5;
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">Acme<span>Marketing</span></div>
        <h1>Verify your email</h1>
        <p>Click the button below to sign in to your dashboard. This link is valid for 24 hours.</p>
        <a class="btn" href="${url}" target="_blank">Sign in to Acme</a>
        <p style="font-size: 13px; color: #64748b;">If you did not request this email, you can safely ignore it.</p>
        <div class="footer">
          If you have trouble clicking the button, copy and paste this URL into your browser:<br>
          <a class="link" href="${url}">${url}</a>
        </div>
      </div>
    </body>
    </html>
  `;
}

const customAdapter = PrismaAdapter(db)
const originalCreateUser = customAdapter.createUser
customAdapter.createUser = async (data: any) => {
  let org = await db.organization.findFirst()
  if (!org) {
    org = await db.organization.create({
      data: {
        name: "Personal Workspace",
      }
    })
  }
  return originalCreateUser({
    ...data,
    role: "ADMIN",
    organizationId: org.id
  } as any)
}

export const authOptions: NextAuthOptions = {
  adapter: customAdapter,
  providers: [
    EmailProvider({
      sendVerificationRequest: async ({ identifier: email, url }) => {
        const urlObj = new URL(url)
        const host = urlObj.host
        const html = htmlVerificationTemplate({ url, host })
        await sendMail({
          to: email,
          subject: `Sign in to ${host}`,
          html,
        })
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-google-client-secret",
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || "mock-azure-ad-client-id",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "mock-azure-ad-client-secret",
      tenantId: process.env.AZURE_AD_TENANT_ID || "common",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@acme.com" },
        password: { label: "Password", type: "password", placeholder: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { organization: true }
        })

        if (!user) {
          return null
        }

        // Check if password matches
        // Fallback for default seed accounts where passwordHash is not set or equals "password"
        if (!user.passwordHash || user.passwordHash === "password") {
          if (credentials.password === "password") {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              organizationId: user.organizationId
            }
          }
          return null
        }

        const isValid = bcrypt.compareSync(credentials.password, user.passwordHash)
        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "azure-ad" || account?.provider === "email") {
        if (!user.email) return false
        
        let dbUser = await db.user.findUnique({
          where: { email: user.email.toLowerCase() }
        })
        
        if (!dbUser) {
          let org = await db.organization.findFirst()
          if (!org) {
            org = await db.organization.create({
              data: {
                name: "Personal Workspace",
              }
            })
          }
          dbUser = await db.user.create({
            data: {
              email: user.email.toLowerCase(),
              name: user.name || user.email.split("@")[0],
              role: "ADMIN",
              organizationId: org.id
            }
          })
        }
        
        // Attach user info
        (user as any).role = dbUser.role;
        (user as any).organizationId = dbUser.organizationId;
        user.id = dbUser.id;
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.organizationId = (user as any).organizationId
      } else if (token.sub) {
        // Query database to get fresh user details (organizationId, role)
        const dbUser = await db.user.findUnique({
          where: { id: token.sub },
          select: { organizationId: true, role: true }
        })
        if (dbUser) {
          token.role = dbUser.role
          token.organizationId = dbUser.organizationId
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role = token.role;
        (session.user as any).organizationId = token.organizationId;
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "supersecretnextauthkey",
}
