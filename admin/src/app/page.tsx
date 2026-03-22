// admin/src/app/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { cookies } from "next/headers";

export default async function DashboardPage() {
  // 1. Verify Authentication on the Server
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const cookieShopId = cookieStore.get("shopId")?.value ?? "";
  const shopId = cookieShopId === "jahandco-shop" || cookieShopId === "jahandco-dev" ? cookieShopId : "jahandco-shop";

  // 2. Fetch Dashboard Statistics in Parallel for Speed
  const [totalProducts, totalOrders, recentOrders, revenueResult] = await Promise.all([
    prisma.product.count({ where: { shopId } }),
    prisma.order.count({ where: { shopId } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      where: { shopId },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { shopId, status: { not: "CANCELLED" } },
    }),
  ]);

  const totalRevenue = revenueResult._sum.total || 0;

  // 3. Render the Dashboard UI
  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-400">
              Welcome back, {session.user?.name || "Admin"}. Here is what&apos;s happening in your store today.
            </p>
          </div>
          <div className="flex space-x-4">
            <Link
              href="/products/new"
              className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900"
            >
              + Add Product
            </Link>
          </div>
        </header>

        {/* Top Level Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <dt className="text-sm font-medium text-gray-400">Total Revenue</dt>
            <dd className="mt-2 text-3xl font-bold text-foreground">${totalRevenue.toFixed(2)}</dd>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <dt className="text-sm font-medium text-gray-400">Total Orders</dt>
            <dd className="mt-2 text-3xl font-bold text-foreground">{totalOrders}</dd>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <dt className="text-sm font-medium text-gray-400">Products in Catalog</dt>
            <dd className="mt-2 text-3xl font-bold text-foreground">{totalProducts}</dd>
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 shadow-sm">
          <div className="border-b border-gray-800 px-6 py-4">
            <h2 className="text-lg font-medium text-foreground">Recent Orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-900">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-800/40">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-200">#{order.id.slice(-6)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">{order.user?.email || "Guest"}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">${order.total.toFixed(2)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold leading-5 ${
                            order.status === "PENDING"
                              ? "border-navy-800/60 bg-navy-800/20 text-gray-100"
                              : "border-gray-800 bg-gray-950 text-gray-200"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}