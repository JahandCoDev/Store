import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { resolveCoreShopIdFromCookie } from "@/lib/serviceAuth";

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const shopId = await resolveCoreShopIdFromCookie();

  const orders = await prisma.order.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true, name: true } },
      orderItems: { include: { product: true } },
    },
  });

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="mt-1 text-sm text-gray-400">Recent orders for the selected shop.</p>
        </header>

        <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900/40 p-4">
          <p className="text-sm text-gray-400">Orders are listed newest first. Click an order to view details and update its status.</p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-900">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-800/40">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-200">
                        <Link href={`/orders/${order.id}`} className="hover:underline">
                          #{order.id.slice(-6)}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                        {order.user?.email || "Guest"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                        ${order.total.toFixed(2)}
                      </td>
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
