import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import prisma from "@/lib/prisma";

// Guard against empty-string env vars causing `new URL("")` inside NextAuth.
if (process.env.NEXTAUTH_URL !== undefined && process.env.NEXTAUTH_URL.trim() === "") {
  delete process.env.NEXTAUTH_URL;
}

// Dev convenience: allow local dev to boot without explicitly setting a secret.
if (
  process.env.NODE_ENV !== "production" &&
  (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.trim() === "") &&
  (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.trim() === "")
) {
  process.env.NEXTAUTH_SECRET = "dev-secret-change-me";
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Customer Account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) return null;

        const isPasswordValid = await compare(password, user.password);
        if (!isPasswordValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id?: unknown; role?: unknown };
        if (typeof u.id === "string") token.id = u.id;
        if (typeof u.role === "string") token.role = u.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const sUser = session.user as typeof session.user & { id?: string; role?: string };
        if (typeof token.id === "string") sUser.id = token.id;
        if (typeof token.role === "string") sUser.role = token.role;
      }
      return session;
    },
  },
};
