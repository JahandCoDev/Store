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
      <head>
        <link rel="stylesheet" href="/assets/overflow-list.css" />
        <link rel="stylesheet" href="/assets/base.css" />
      </head>
      <body className="page-width-normal">{children}</body>
    </html>
  );
}
