import type { Metadata } from "next";
import "./globals.css";
import DatadogRumInit from "@/components/DatadogRumInit";

export const metadata: Metadata = {
  title: "Jah and Co",
  description: "Jah and Co Storefront",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const ddService = process.env.DD_SERVICE ?? process.env.NEXT_PUBLIC_DD_SERVICE;
  const ddEnv = process.env.DD_ENV ?? process.env.NEXT_PUBLIC_DD_ENV ?? process.env.NODE_ENV;
  const ddVersion = process.env.DD_VERSION ?? process.env.NEXT_PUBLIC_APP_VERSION;

  return (
    <html lang="en">
      <body className="min-h-svh bg-black text-zinc-100 antialiased">
        <DatadogRumInit service={ddService} env={ddEnv} version={ddVersion} />
        {children}
      </body>
    </html>
  );
}
