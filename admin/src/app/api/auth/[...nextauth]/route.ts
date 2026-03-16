import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";

        const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!email || !password || !adminEmail) return null;
        if (email !== adminEmail) return null;

        if (adminPasswordHash && adminPasswordHash.length > 0) {
          const ok = await bcrypt.compare(password, adminPasswordHash);
          if (!ok) return null;
        } else if (adminPassword && adminPassword.length > 0) {
          // Dev-only fallback. Prefer ADMIN_PASSWORD_HASH in production.
          if (password !== adminPassword) return null;
        } else {
          // Not configured
          return null;
        }

        return { id: "admin", name: "Admin", email: adminEmail, role: "ADMIN" };
      }
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const role = (user as unknown as Record<string, unknown>).role;
        if (typeof role === "string") token.role = role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as Record<string, unknown>).role = token.role;
      return session;
    }
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
