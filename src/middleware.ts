import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Admin role checks for critical settings
    if (path.startsWith("/settings") && token?.role !== "ADMIN" && token?.role !== "OWNER" && token?.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/", req.url))
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    // Protect all dashboard routes, excluding auth, API routes, favicon and static assets
    "/",
    "/contacts/:path*",
    "/campaigns/:path*",
    "/automations/:path*",
    "/media/:path*",
    "/suppression/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
}
