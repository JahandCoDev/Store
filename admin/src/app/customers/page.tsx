import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import CustomerDeleteButton from "@/components/CustomerDeleteButton";
import { resolveCoreShopIdFromCookie } from "@/lib/serviceAuth";

export default async function CustomersPage(props: { searchParams: Promise<{ q?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const shopId = await resolveCoreShopIdFromCookie();

  const { q } = await props.searchParams;
  const query = (q ?? "").trim();

  const customers = await prisma.customer.findMany({
    where: {
      shopId,
      ...(query
        ? {
            OR: [
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customers</h1>
            <p className="mt-1 text-sm text-gray-400">Customers for the selected shop.</p>
          </div>
          <Link
            href="/customers/new"
            className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900"
          >
            + Add Customer
          </Link>
        </header>

        <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900/40 p-4">
          <form action="/customers" method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              name="q"
              defaultValue={query}
              placeholder="Search email, phone, name"
              className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 placeholder-gray-400 focus:border-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-800/40 sm:max-w-md"
            />
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
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Tags</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-900">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">
                      No customers yet.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-800/40">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-200">
                        <Link href={`/customers/${c.id}`} className="hover:underline">
                          {c.email}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                        {[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">{c.phone || "—"}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                        {c.tags.length === 0 ? (
                          <span className="text-gray-500">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {c.tags.slice(0, 3).map((t) => (
                              <span key={t} className="rounded-full border border-gray-800 bg-gray-950 px-2 py-0.5 text-xs text-gray-200">
                                {t}
                              </span>
                            ))}
                            {c.tags.length > 3 ? (
                              <span className="text-xs text-gray-500">+{c.tags.length - 3}</span>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-400">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        <CustomerDeleteButton customerId={c.id} customerLabel={c.email} />
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
