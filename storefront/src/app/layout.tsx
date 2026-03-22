import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jah and Co",
  description: "Jah and Co Storefront",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-svh bg-black text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
