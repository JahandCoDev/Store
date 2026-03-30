// telephony/src/app/api/auth/[...nextauth]/route.ts
// Uses the same PostgreSQL database as the admin service for authentication.
// Only ADMIN-role users are granted access.

import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { Pool } from "pg";

if (process.env.NEXTAUTH_URL !== undefined && process.env.NEXTAUTH_URL.trim() === "") {
  delete process.env.NEXTAUTH_URL;
}
if (
  process.env.NODE_ENV !== "production" &&
  !process.env.NEXTAUTH_SECRET?.trim() &&
  !process.env.AUTH_SECRET?.trim()
) {
  process.env.NEXTAUTH_SECRET = "dev-secret-change-me";
}

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    (process.env.NODE_ENV !== "production"
      ? "postgresql://postgres:postgres@localhost:5432/postgres"
      : undefined),
});

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

        const result = await pool.query<{
          id: string;
          email: string;
          role: string;
          password: string | null;
          "firstName": string | null;
          "lastName": string | null;
        }>(
          `SELECT id, email, role, password, "firstName", "lastName"
           FROM "User"
           WHERE lower(email) = $1
           LIMIT 1`,
          [inputEmail]
        );

        const user = result.rows[0];
        if (!user || !user.password) return null;
        if (user.role !== "ADMIN") return null;

        const valid = await compare(credentials.password, user.password);
        if (!valid) return null;

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
        const u = user as { role?: string | null; id?: string };
        const t = token as typeof token & { role?: string; id?: string };
        t.role = u.role ?? undefined;
        t.id = u.id;
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
