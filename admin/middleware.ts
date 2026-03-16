export { default } from "next-auth/middleware";

// Require authentication for all pages in the admin app,
// while leaving NextAuth routes and static assets untouched.
export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|alert.mp3|.*\\..*).*)",
  ],
};
