import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        identifier: { label: "Email or Roll Number", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        // Determine if identifier is a roll number (starts with a digit)
        const isRollNumber = /^\d/.test(credentials.identifier);
        let user = null;

        if (isRollNumber) {
          // Find student by roll number and include related user
          const student = await prisma.student.findUnique({
            where: { rollNumber: credentials.identifier },
            include: { user: true },
          });
          user = student?.user ?? null;
        } else {
          // Find by email (admin or teacher)
          user = await prisma.user.findUnique({
            where: { email: credentials.identifier },
          });
        }

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!passwordMatch) return null;

        // Return custom user object with role
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
