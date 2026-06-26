import { DefaultSession } from "next-auth"
import { UserRole, Organization } from "./index"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
    } & DefaultSession["user"]
    accessToken?: string
    refreshToken?: string
    role?: UserRole
    organization?: Organization
    error?: string
  }

  interface User {
    id: string
    name: string
    email: string
    role: UserRole
    accessToken?: string
    refreshToken?: string
    organization?: Organization
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    role?: UserRole
    organization?: Organization
    expiresAt?: number
    error?: string
  }
}
