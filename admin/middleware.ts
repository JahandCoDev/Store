// admin/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

import { APPAREL_SHOP_ID, CORE_SHOP_IDS } from "@/src/lib/coreShops";

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
  function middleware(req) {
    const shopId = req.cookies.get("shopId")?.value ?? "";
    const allowed = CORE_SHOP_IDS.has(shopId);

    if (allowed) return NextResponse.next();

    const res = NextResponse.next();
    res.cookies.set("shopId", APPAREL_SHOP_ID, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return res;
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // The user is only authorized if they are logged in AND are an ADMIN
        return token?.role === "ADMIN";
      },
    },
  }
);

export const config = {
  // Protect all routes EXCEPT the API auth routes, Next.js static files, and the login page itself
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)"],
};