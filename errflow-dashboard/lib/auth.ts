import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import type { AuthResponse, UserRole } from "@/types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

async function refreshAccessToken(refreshToken: string): Promise<AuthResponse | null> {
  try {
    console.log("[Auth] Refreshing token to:", `${API_BASE}/auth/refresh`)

    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    })

    console.log("[Auth] Refresh response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.log("[Auth] Refresh error:", errorText)
      return null
    }

    const data: AuthResponse = await response.json()
    return data
  } catch (error) {
    console.error("[Auth] Refresh exception:", error)
    return null
  }
}

export const { handlers, signIn, auth } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          console.log("[Auth] Attempting login to:", `${API_BASE}/auth/login`)

          const response = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          console.log("[Auth] Response status:", response.status)

          if (!response.ok) {
            const errorText = await response.text()
            console.log("[Auth] Error response:", errorText)
            return null
          }

          const data: AuthResponse = await response.json()

          return {
            id:           data.user.id,
            name:         data.user.name,
            email:        data.user.email,
            role:         data.user.role,
            accessToken:  data.accessToken,
            refreshToken: data.refreshToken,
            organization: data.organization,
          }
        } catch (error) {
          console.error("[Auth] Login exception:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // GitHub OAuth — بيبعث البيانات للـ backend ويخزن في DB
      if (account?.provider === "github") {
        try {
          console.log("[Auth] GitHub signIn, sending to backend...")

          const response = await fetch(`${API_BASE}/auth/github/oauth`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: account.access_token }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error("[Auth] GitHub backend error:", errorText)
            return false
          }

          const data = await response.json()
          console.log("[Auth] GitHub OAuth success, user:", data.user?.email)

          // احفظ الـ tokens والـ user data في الـ user object
          user.id           = data.user.id
          user.name         = data.user.name
          user.email        = data.user.email
          user.accessToken  = data.accessToken
          user.refreshToken = data.refreshToken
          user.role         = data.user.role
          user.organization = data.user.organization

          return true
        } catch (err) {
          console.error("[Auth] GitHub OAuth exception:", err)
          return false
        }
      }

      return true
    },

    async jwt({ token, user, account }) {
      // Initial login — credentials أو GitHub
      if (user) {
        return {
          ...token,
          sub:          user.id,
          name:         user.name,
          email:        user.email,
          accessToken:  user.accessToken,
          refreshToken: user.refreshToken,
          role:         user.role,
          organization: user.organization,
          expiresAt:    Date.now() + 15 * 60 * 1000,
        }
      }

      // تحقق إذا لازم نجدد الـ token
      const timeUntilExpiry = (token.expiresAt as number) - Date.now()
      const shouldRefresh   = timeUntilExpiry < 2 * 60 * 1000

      if (shouldRefresh && token.refreshToken) {
        try {
          console.log("[JWT] Token expiring soon, refreshing...")
          const refreshed = await refreshAccessToken(token.refreshToken as string)

          if (refreshed) {
            console.log("[JWT] Token refreshed successfully")
            return {
              ...token,
              accessToken:  refreshed.accessToken,
              refreshToken: refreshed.refreshToken || token.refreshToken,
              expiresAt:    Date.now() + 15 * 60 * 1000,
            }
          } else {
            console.error("[JWT] Refresh returned null")
            return { ...token, error: "RefreshAccessTokenError" }
          }
        } catch (error) {
          console.error("[JWT] Failed to refresh token:", error)
          return { ...token, error: "RefreshAccessTokenError" }
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token.error === "RefreshAccessTokenError") {
        session.error = "RefreshAccessTokenError"
      }

      session.user.id    = token.sub!
      session.user.name  = token.name  as string
      session.user.email = token.email as string
      session.accessToken  = token.accessToken  as string
      session.refreshToken = token.refreshToken as string
      session.role         = token.role         as UserRole
      session.organization = token.organization as any

      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})