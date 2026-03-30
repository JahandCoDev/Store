// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";

if (process.env.NEXTAUTH_URL !== undefined && process.env.NEXTAUTH_URL.trim() === "") {
  delete process.env.NEXTAUTH_URL;
}
if (
  process.env.NODE_ENV !== "production" &&
  (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.trim() === "") &&
  (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.trim() === "")
) {
  process.env.NEXTAUTH_SECRET = "dev-secret-change-me";
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const inputEmail = credentials.email.trim().toLowerCase();
        const user = await prisma.user.findFirst({
          where: { email: { equals: inputEmail, mode: "insensitive" } },
        });
        if (!user || !user.password) return null;
        if (user.role !== "ADMIN") return null;
        const isPasswordValid = await compare(credentials.password, user.password);
        if (!isPasswordValid) return null;
        return {
          id: user.id,
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || null,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const role = (user as { role?: string | null }).role ?? undefined;
        (token as typeof token & { role?: string; id?: string }).role = role;
        (token as typeof token & { role?: string; id?: string }).id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as typeof session.user & { role?: string; id?: string };
        const t = token as typeof token & { role?: unknown; id?: unknown };
        u.role = typeof t.role === "string" ? t.role : undefined;
        u.id = typeof t.id === "string" ? t.id : undefined;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
