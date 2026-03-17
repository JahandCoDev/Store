// admin/src/components/AdminShell.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navigation = [
  { name: "Dashboard", href: "/" },
  { name: "Products", href: "/products" },
  { name: "Orders", href: "/orders" },
  { name: "Voice", href: "/voice" }, // Hooked up to your voice-router
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // We don't want the sidebar showing on the login page
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-gray-900 text-white transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-center border-b border-gray-800">
          <h1 className="text-xl font-bold tracking-wider">STORE ADMIN</h1>
        </div>

        <nav className="mt-6 flex flex-col space-y-2 px-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center rounded-md px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-navy-800 text-white shadow-sm"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full border-t border-gray-800 p-4">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center justify-center rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-red-600 hover:text-white"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-800 bg-gray-900 px-4 md:hidden">
          <h1 className="text-lg font-bold text-foreground">STORE ADMIN</h1>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-gray-400 hover:text-white focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}