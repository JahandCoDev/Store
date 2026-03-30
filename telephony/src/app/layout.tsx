// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Voice Control Panel",
  description: "Telephony management for Jah and Co",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <div className="min-h-screen bg-black text-foreground">
            <header className="border-b border-gray-800 bg-gray-900/50 px-6 py-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-800 ring-1 ring-gray-700">
                <span className="text-xs font-bold text-gray-200">JC</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-200">JahandCo Voice</p>
                <p className="text-xs text-gray-400">Admin Panel</p>
              </div>
            </header>
            <main className="p-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
