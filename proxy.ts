import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  const pathname = request.nextUrl.pathname
  const role = token.role

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (pathname.startsWith("/tailor") && role !== "TAILOR") {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (pathname.startsWith("/customer") && role !== "CUSTOMER") {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/tailor/:path*",
    "/customer/:path*",
    "/api/admin/:path*",
    "/api/tailor/:path*",
    "/api/customer/:path*",
  ],
}
