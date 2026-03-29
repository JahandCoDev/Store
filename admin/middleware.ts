// admin/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// NextAuth's internal parseUrl treats "" as a real value and will throw
// `TypeError: Invalid URL` when it does `new URL("")`. Guard against that.
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

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // Allow admin sessions through as before.
        if (token?.role === "ADMIN") return true;

        // Let service-to-service API calls use the shared Datadog bearer token.
        const authHeader = req.headers.get("authorization") ?? "";
        if (!authHeader.startsWith("Bearer ")) return false;

        const tokenValue = authHeader.slice("Bearer ".length).trim();
        const expected = process.env.DD_ADMIN_APP_TOKEN?.trim();
        return Boolean(expected && tokenValue && tokenValue === expected);
      },
    },
  }
);

export const config = {
  // Protect all routes EXCEPT the API auth routes, Next.js static files, and the login page itself
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)"],
};