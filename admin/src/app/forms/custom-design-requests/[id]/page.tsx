import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import CustomDesignProposalForm from "@/components/CustomDesignProposalForm";

export default async function CustomDesignRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;

  const req = await prisma.customDesignRequest.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, displayId: true, firstName: true, lastName: true } },
      proposals: {
        orderBy: { createdAt: "desc" },
        include: { asset: true },
      },
    },
  });

  if (!req) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-sm text-gray-400">Request not found.</div>
          <div className="mt-4">
            <Link href="/forms/custom-design-requests" className="rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800">
              Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const customerName = [req.user.firstName, req.user.lastName].filter(Boolean).join(" ");

  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Forms / Custom Design Requests</div>
            <h1 className="mt-2 text-2xl font-bold text-foreground">Custom Design Request</h1>
            <p className="mt-1 text-sm text-gray-400">
              {req.user.email || req.user.displayId}
              {customerName ? ` • ${customerName}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/forms/custom-design-requests" className="rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800">
              Back
            </Link>
            {req.user.displayId ? (
              <Link href={`/customers/${req.user.displayId}`} className="rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800">
                Open customer
              </Link>
            ) : null}
          </div>
        </header>

        <div className="grid gap-4 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Status</div>
              <div className="mt-2 text-sm text-gray-200">{req.status}</div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Submitted</div>
              <div className="mt-2 text-sm text-gray-200">{new Date(req.createdAt).toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Shirt</div>
              <div className="mt-2 text-sm text-gray-200">{req.shirtSize} • {req.shirtColor}</div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Design basis</div>
              <div className="mt-2 text-sm text-gray-200">{req.basedOnStyleProfile ? "Based on Style Profile" : "Not specified"}</div>
            </div>
          </div>

          {req.galleryDesignRef ? (
            <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Gallery selection</div>
              <div className="mt-2 text-sm text-gray-200 break-words">{req.galleryDesignRef}</div>
            </div>
          ) : null}

          {req.notes ? (
            <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Notes</div>
              <div className="mt-2 text-sm text-gray-200 break-words">{req.notes}</div>
            </div>
          ) : null}
        </div>

        <CustomDesignProposalForm requestId={req.id} />

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="text-sm font-semibold text-gray-100">Draft history</div>
          <div className="mt-4 space-y-4">
            {req.proposals.length === 0 ? (
              <div className="text-sm text-gray-400">No drafts yet.</div>
            ) : (
              req.proposals.map((proposal) => (
                <div key={proposal.id} className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-gray-500">Draft</div>
                      <div className="mt-1 text-sm text-gray-200">{new Date(proposal.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {proposal.customerDecision ? (
                        <span>
                          Decision: <span className="text-gray-200">{proposal.customerDecision}</span>
                        </span>
                      ) : (
                        "Awaiting customer response"
                      )}
                    </div>
                  </div>

                  {proposal.adminMessage ? <div className="mt-3 text-sm text-gray-200">{proposal.adminMessage}</div> : null}

                  {proposal.asset ? (
                    <div className="mt-3 text-xs text-gray-500">
                      Asset: <span className="text-gray-200">{proposal.asset.title || proposal.asset.originalFilename}</span>
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-gray-500">No asset attached.</div>
                  )}

                  {proposal.customerFeedback ? (
                    <div className="mt-3 text-sm text-gray-200">
                      <span className="text-gray-500">Feedback:</span> {proposal.customerFeedback}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
