import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function ProductsPage(props: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const cookieShopId = cookieStore.get("shopId")?.value ?? "";
  const shopId = cookieShopId === "jahandco-shop" || cookieShopId === "jahandco-dev" ? cookieShopId : "jahandco-shop";

  const { q, status } = await props.searchParams;
  const query = (q ?? "").trim();
  const statusFilter = status && ["DRAFT", "ACTIVE", "ARCHIVED"].includes(status) ? status : undefined;

  const products = await prisma.product.findMany({
    where: {
      shopId,
      ...(statusFilter ? { status: statusFilter as "DRAFT" | "ACTIVE" | "ARCHIVED" } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { sku: { contains: query, mode: "insensitive" } },
              { vendor: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Products</h1>
            <p className="mt-1 text-sm text-gray-400">Manage your catalog for the selected shop.</p>
          </div>
          <Link
            href="/products/new"
            className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900"
          >
            + Add Product
          </Link>
        </header>

        <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900/40 p-4">
          <form action="/products" method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              name="q"
              defaultValue={query}
              placeholder="Search title, SKU, vendor…"
              className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 placeholder-gray-400 focus:border-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-800/40 sm:max-w-sm"
            />
            <select
              name="status"
              defaultValue={statusFilter ?? ""}
              className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <button
              type="submit"
              className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700"
            >
              Search
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Inventory</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-900">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                      No products yet.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-800/40">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-200">
                        <Link href={`/products/${p.id}`} className="hover:underline">
                          {p.title}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          p.status === "ACTIVE" ? "border-green-800/60 bg-green-900/20 text-green-200"
                          : p.status === "ARCHIVED" ? "border-gray-700 bg-gray-800 text-gray-400"
                          : "border-yellow-800/60 bg-yellow-900/20 text-yellow-200"
                        }`}>{p.status}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-xs font-mono text-gray-400">
                        {p.sku ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                        ${p.price.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                        {p.inventory}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-400">
                        {new Date(p.updatedAt).toLocaleDateString()}
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
