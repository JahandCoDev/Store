import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import CustomerDeleteButton from "@/components/CustomerDeleteButton";
import CustomerEditor from "./CustomerEditor";

export default async function CustomerDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await props.params;

  const customer = await prisma.user.findFirst({
    where: { displayId: id },
    include: {
      addresses: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  type CustomerWithNotes = NonNullable<typeof customer>;
  type CustomerNoteRow = CustomerWithNotes["notes"][number];

  if (!customer) notFound();

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{customer.email || "No email"}</h1>
            <p className="mt-1 text-sm text-gray-400">
              {[customer.firstName, customer.lastName].filter(Boolean).join(" ") || "No name"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <CustomerDeleteButton customerId={id} customerLabel={customer.email || "Unknown"} redirectTo="/customers" />
            <Link href="/customers" className="text-sm text-gray-300 hover:underline">
              ← Back
            </Link>
          </div>
        </header>

        <CustomerEditor customerId={id} />

        <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Notes</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-200">
            {customer.notes.length === 0 ? (
              <p className="text-gray-400">No notes yet.</p>
            ) : (
              (customer as CustomerWithNotes).notes.map((n: CustomerNoteRow) => (
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
