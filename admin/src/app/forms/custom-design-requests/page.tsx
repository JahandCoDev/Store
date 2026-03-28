import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export default async function CustomDesignRequestsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const requests = await prisma.customDesignRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true, displayId: true, firstName: true, lastName: true } },
      proposals: { select: { id: true } },
    },
    take: 100,
  });

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Forms / Custom Design Requests</div>
            <h1 className="mt-2 text-2xl font-bold text-foreground">Custom Design Requests</h1>
            <p className="mt-1 text-sm text-gray-400">Customers requesting a custom design via the portal.</p>
          </div>
          <Link href="/forms" className="rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800">
            Back to Forms
          </Link>
        </header>

        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900 px-6 py-12 text-center text-sm text-gray-400">
              No custom design requests yet.
            </div>
          ) : (
            requests.map((req) => {
              const email = req.user.email || req.user.displayId || "Unknown user";
              const name = [req.user.firstName, req.user.lastName].filter(Boolean).join(" ");
              return (
                <article key={req.id} className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-lg font-semibold text-foreground">{email}</div>
                      <div className="mt-1 text-sm text-gray-400">
                        {name ? `${name} • ` : ""}
                        <span className="text-gray-500">Status:</span> {req.status}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">{new Date(req.createdAt).toLocaleString()}</div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
                      <div className="text-xs uppercase tracking-wider text-gray-500">Shirt</div>
                      <div className="mt-2 text-sm text-gray-200">{req.shirtSize} • {req.shirtColor}</div>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
                      <div className="text-xs uppercase tracking-wider text-gray-500">Drafts</div>
                      <div className="mt-2 text-sm text-gray-200">{req.proposals.length}</div>
                    </div>
                    {req.galleryDesignRef ? (
                      <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4 md:col-span-2">
                        <div className="text-xs uppercase tracking-wider text-gray-500">Gallery selection</div>
                        <div className="mt-2 text-sm text-gray-200 break-words">{req.galleryDesignRef}</div>
                      </div>
                    ) : null}
                    {req.basedOnStyleProfile ? (
                      <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4 md:col-span-2">
                        <div className="text-xs uppercase tracking-wider text-gray-500">Style profile</div>
                        <div className="mt-2 text-sm text-gray-200">Requested based on Style Profile</div>
                      </div>
                    ) : null}
                    {req.notes ? (
                      <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4 md:col-span-2">
                        <div className="text-xs uppercase tracking-wider text-gray-500">Notes</div>
                        <div className="mt-2 text-sm text-gray-200 break-words">{req.notes}</div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/forms/custom-design-requests/${req.id}`}
                      className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900"
                    >
                      Open request
                    </Link>
                    {req.user.displayId ? (
                      <Link
                        href={`/customers/${req.user.displayId}`}
                        className="rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800"
                      >
                        Open customer
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
