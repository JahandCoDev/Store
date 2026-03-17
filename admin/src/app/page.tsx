// admin/src/app/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  // 1. Verify Authentication on the Server
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  // 2. Fetch Dashboard Statistics in Parallel for Speed
  const [totalProducts, totalOrders, recentOrders, revenueResult] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { not: "CANCELLED" } },
    }),
  ]);

  const totalRevenue = revenueResult._sum.total || 0;

  // 3. Render the Dashboard UI
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Welcome back, {session.user?.name || "Admin"}. Here is what's happening in your store today.
            </p>
          </div>
          <div className="flex space-x-4">
            <Link href="/products/new" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              + Add Product
            </Link>
          </div>
        </header>

        {/* Top Level Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <dt className="text-sm font-medium text-gray-500">Total Revenue</dt>
            <dd className="mt-2 text-3xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</dd>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <dt className="text-sm font-medium text-gray-500">Total Orders</dt>
            <dd className="mt-2 text-3xl font-bold text-gray-900">{totalOrders}</dd>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <dt className="text-sm font-medium text-gray-500">Products in Catalog</dt>
            <dd className="mt-2 text-3xl font-bold text-gray-900">{totalProducts}</dd>
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-100">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-medium text-gray-900">Recent Orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-indigo-600">#{order.id.slice(-6)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{order.user?.email || "Guest"}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">${order.total.toFixed(2)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
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