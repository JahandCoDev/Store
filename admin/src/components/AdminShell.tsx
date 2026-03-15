"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { LayoutDashboard, ShoppingBag, ShoppingCart, Users, Settings, LogOut, PhoneCall } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminShell({ children, title }: { children: React.ReactNode, title: string }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-foreground">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
          <h1 className="text-2xl font-bold mb-6 text-center text-white">Store Admin</h1>
          <button 
            onClick={() => signIn("credentials", { callbackUrl: pathname })}
            className="w-full bg-navy-800 hover:bg-navy-900 text-white font-semibold py-3 px-4 rounded transition pb-2"
          >
            Sign In to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: "/", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { href: "/voice", label: "Voice", icon: <PhoneCall size={20} /> },
    { href: "/products", label: "Products", icon: <ShoppingBag size={20} /> },
    { href: "/orders", label: "Orders", icon: <ShoppingCart size={20} /> },
    { href: "/customers", label: "Customers", icon: <Users size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 hidden md:flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white tracking-wider uppercase">Store Admin</h2>
        </div>
        <nav className="flex-1 px-4 space-y-2 text-gray-400 font-medium">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/");
            return (
              <Link prefetch={false} 
                key={item.href} 
                href={item.href} 
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition ${isActive ? 'bg-gray-800 text-white' : 'hover:text-white'}`}
              >
                {item.icon} {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={() => signOut()}
            className="flex items-center gap-3 text-gray-400 hover:text-white w-full px-3 py-2 transition"
          >
            <LogOut size={20} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-background">
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-gray-900 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          <div className="flex items-center gap-4">
             <span className="text-sm text-gray-400">Logged in as {session?.user?.email}</span>
             <Settings size={20} className="text-gray-400 cursor-pointer hover:text-white transition"/>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

