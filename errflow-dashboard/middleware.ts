import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const pathname = req.nextUrl.pathname

  // Skip admin routes completely - they use custom authentication
  if (pathname.startsWith("/admin")) {
    console.log("Skipping NextAuth for admin route:", pathname)
    return NextResponse.next()
  }

  const isLoggedIn = !!req.auth
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register")
  const isLandingPage = pathname === "/"

  console.log("NextAuth Middleware:", { isLoggedIn, pathname, isAuthPage, isLandingPage })

  // Allow landing page for all users (authenticated and non-authenticated)
  if (isLandingPage) {
    console.log("Allowing landing page")
    return NextResponse.next()
  }

  // If not logged in and trying to access protected page (not auth page or landing), redirect to login
  if (!isLoggedIn && !isAuthPage) {
    console.log("Redirecting to login")
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // If logged in and trying to access auth page, redirect to dashboard
  if (isLoggedIn && isAuthPage) {
    console.log("Redirecting to dashboard")
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  console.log("Allowing request")
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
