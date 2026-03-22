import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import CustomerEditor from "./CustomerEditor";

export default async function CustomerDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const cookieShopId = cookieStore.get("shopId")?.value ?? "";
  const shopId = cookieShopId === "jahandco-shop" || cookieShopId === "jahandco-dev" ? cookieShopId : "jahandco-shop";

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

        <CustomerEditor customerId={customer.id} />

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
