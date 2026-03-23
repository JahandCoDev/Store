// admin/src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import AdminShell from "@/components/AdminShell";
import DatadogRumInit from "@/components/DatadogRumInit";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jah and Co Admin Panel",
  description: "Management dashboard for Jah and Co",
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
      <body className={inter.className}>
        <Providers>
          <DatadogRumInit service={ddService} env={ddEnv} version={ddVersion} />
          <AdminShell>{children}</AdminShell>
        </Providers>
      </body>
    </html>
  );
}