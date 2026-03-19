import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";

export default async function CustomerDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const shopId = cookies().get("shopId")?.value ?? null;
  if (!shopId) redirect("/customers");

  const { id } = await props.params;

  const customer = await prisma.customer.findFirst({
    where: { id, shopId },
    include: {
      consent: true,
      addresses: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!customer) notFound();

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{customer.email}</h1>
            <p className="mt-1 text-sm text-gray-400">
              {[customer.firstName, customer.lastName].filter(Boolean).join(" ") || "No name"}
            </p>
          </div>
          <Link href="/customers" className="text-sm text-gray-300 hover:underline">
            ← Back
          </Link>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400">Email</dt>
                <dd className="text-gray-200">{customer.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400">Phone</dt>
                <dd className="text-gray-200">{customer.phone || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400">Marketing</dt>
                <dd className="text-gray-200">
                  {customer.consent?.emailMarketingOptIn ? "Opted in" : "Not opted in"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400">Created</dt>
                <dd className="text-gray-200">{new Date(customer.createdAt).toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Addresses</h2>
            <div className="mt-4 space-y-4 text-sm text-gray-200">
              {customer.addresses.length === 0 ? (
                <p className="text-gray-400">No addresses yet.</p>
              ) : (
                customer.addresses.map((a) => (
                  <div key={a.id} className="rounded-md border border-gray-800 bg-gray-950 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{a.name || "Address"}</p>
                      {a.isDefault ? (
                        <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-200">Default</span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-gray-300">
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}
                      <br />
                      {a.city}, {a.state} {a.zip}
                      <br />
                      {a.country}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Notes</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-200">
            {customer.notes.length === 0 ? (
              <p className="text-gray-400">No notes yet.</p>
            ) : (
              customer.notes.map((n) => (
                <div key={n.id} className="rounded-md border border-gray-800 bg-gray-950 p-4">
                  <p className="text-gray-200">{n.body}</p>
                  <p className="mt-2 text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
