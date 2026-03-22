// admin/src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";

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
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt", // JWT is required when using the Credentials provider
  },
  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@jahandco.dev" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        // 1. Check if user exists and has a password
        if (!user || !user.password) {
          return null;
        }

        // 2. Strict Admin authorization check
        if (user.role !== "ADMIN") {
          return null; 
        }

        // 3. Verify password hash
        const isPasswordValid = await compare(credentials.password, user.password);
        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    })
  ],
  callbacks: {
    // Pass the user ID and role into the JWT token
    async jwt({ token, user }) {
      if (user) {
        const role = (user as { role?: string | null }).role ?? undefined;
        const nextToken = token as typeof token & { role?: string; id?: string };
        nextToken.role = role;
        nextToken.id = user.id;
      }
      return token;
    },
    // Expose the role and ID to the client-side session
    async session({ session, token }) {
      if (session.user) {
        const nextUser = session.user as typeof session.user & { role?: string; id?: string };
        const t = token as typeof token & { role?: unknown; id?: unknown };
        nextUser.role = typeof t.role === "string" ? t.role : undefined;
        nextUser.id = typeof t.id === "string" ? t.id : undefined;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login", // We will build this custom login page next
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };