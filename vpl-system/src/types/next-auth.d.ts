import { DefaultSession, DefaultJWT } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      isOnboarded?: boolean
    } & DefaultSession["user"]
  }

  interface User {
    role: string
    isOnboarded?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    isOnboarded?: boolean
    lastActivity?: number
  }
}
