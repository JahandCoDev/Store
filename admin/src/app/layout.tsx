// admin/src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import "./globals.css";
import Providers from "@/components/Providers";
import AdminShell from "@/components/AdminShell";
import DatadogRumInit from "@/components/DatadogRumInit";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jah and Co Admin Panel",
  description: "Management dashboard for Jah and Co",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const ddService = process.env.DD_SERVICE ?? process.env.NEXT_PUBLIC_DD_SERVICE;
  const ddEnv = process.env.DD_ENV ?? process.env.NEXT_PUBLIC_DD_ENV ?? process.env.NODE_ENV;
  const ddVersion = process.env.DD_VERSION ?? process.env.NEXT_PUBLIC_APP_VERSION;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; email?: string | null; role?: string | null } | undefined;

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <DatadogRumInit
            service={ddService}
            env={ddEnv}
            version={ddVersion}
            userId={user?.id}
            userEmail={user?.email ?? null}
            userRole={user?.role ?? null}
          />
          <AdminShell>{children}</AdminShell>
        </Providers>
      </body>
    </html>
  );
}