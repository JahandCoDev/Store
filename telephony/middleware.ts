// telephony/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

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

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => token?.role === "ADMIN",
    },
  }
);

export const config = {
  matcher: ["/((?!api/auth|api/webhook|api/health|_next/static|_next/image|favicon.ico|sw.js|login).*)"],
};
