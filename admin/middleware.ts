// admin/middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => {
      // The user is only authorized if they are logged in AND are an ADMIN
      return token?.role === "ADMIN";
    },
  },
});

export const config = {
  // Protect all routes EXCEPT the API auth routes, Next.js static files, and the login page itself
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)"],
};