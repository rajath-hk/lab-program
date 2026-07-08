import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { logActivity } from "@/lib/activity-logger"
import { INACTIVITY_TIMEOUT, SESSION_MAX_AGE } from "@/lib/session-config"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        identifier: { label: "Email or Roll Number", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null

        // Check if identifier is a roll number (pattern: starts with digit)
        // or an email address
        let user = null

        const isRollNumber = /^\d/.test(credentials.identifier)

        if (isRollNumber) {
          // Find student by roll number
          const student = await prisma.student.findUnique({
            where: { rollNumber: credentials.identifier },
            include: { user: true },
          })
          user = student?.user ?? null
        } else {
          // Find by email (admin or teacher)
          user = await prisma.user.findUnique({
            where: { email: credentials.identifier },
          })
        }

        if (!user) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!passwordMatch) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isOnboarded: user.isOnboarded,
        }
      },
    }),
  ],

  events: {
    async signIn({ user }) {
      if (user?.id) {
        await logActivity(user.id, "LOGIN")
      }
    },
    async signOut({ token }) {
      if (token?.id) {
        await logActivity(token.id as string, "LOGOUT")
      }
    },
  },

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        // Sign in — set initial lastActivity timestamp
        token.id = user.id
        token.role = user.role
        token.isOnboarded = user.isOnboarded
        token.lastActivity = Date.now()
        return token
      }

      // Migrate existing sessions without lastActivity — treat as active
      if (!token.lastActivity) {
        token.lastActivity = Date.now()
      }

      // Only extend the session on explicit update trigger (user activity)
      if (trigger === "update") {
        token.lastActivity = Date.now()
      }

      return token
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.isOnboarded = token.isOnboarded as boolean | undefined
      }
      return session
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
  },

  secret: process.env.NEXTAUTH_SECRET,
}
