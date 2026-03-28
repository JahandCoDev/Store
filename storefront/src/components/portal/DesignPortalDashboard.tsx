"use client";

import { useMemo, useState } from "react";

type Proposal = {
  id: string;
  createdAt: string;
  adminMessage: string | null;
  assetUrl: string | null;
  assetLabel: string | null;
  customerDecision: "APPROVED" | "DENIED" | null;
  customerFeedback: string | null;
  decidedAt: string | null;
};

type Request = {
  id: string;
  createdAt: string;
  status: "SUBMITTED" | "IN_REVIEW" | "DESIGN_SENT" | "APPROVED" | "DENIED";
  shirtSize: string;
  shirtColor: string;
  galleryDesignRef: string | null;
  basedOnStyleProfile: boolean;
  notes: string | null;
  proposals: Proposal[];
};

async function submitProposalDecision(params: {
  proposalId: string;
  decision: "APPROVED" | "DENIED";
  feedback?: string;
}) {
  const res = await fetch(`/api/storefront/custom-design-proposals/${encodeURIComponent(params.proposalId)}/decision`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: params.decision, feedback: params.feedback ?? "" }),
  });

  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(json.error || "Failed to submit decision");
}

export default function DesignPortalDashboard({
  requests,
  styleSurveyCompleted,
  portalHref,
  requestHref,
  questionnaireHref,
}: {
  requests: Request[];
  styleSurveyCompleted: boolean;
  portalHref: string;
  requestHref: string;
  questionnaireHref: string;
}) {
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [feedbackByProposalId, setFeedbackByProposalId] = useState<Record<string, string>>({});

  const sorted = useMemo(() => {
    return [...requests].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [requests]);

  async function handleDecision(proposalId: string, decision: "APPROVED" | "DENIED") {
    setError("");
    setSuccess("");
    setBusyProposalId(proposalId);
    try {
      await submitProposalDecision({
        proposalId,
        decision,
        feedback: feedbackByProposalId[proposalId] ?? "",
      });
      setSuccess("Response saved. Refreshing...");
      window.location.href = portalHref;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit response");
    } finally {
      setBusyProposalId(null);
    }
  }

  return (
    <div className="store-card-soft mt-8 grid gap-6 rounded-[1.5rem] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-zinc-300">Manage your custom design requests and review drafts.</div>
        <div className="flex flex-wrap gap-3">
          <a className="btn btn-secondary" href={questionnaireHref}>
            {styleSurveyCompleted ? "View Style Survey" : "Complete Style Survey"}
          </a>
          <a className="btn btn-primary" href={requestHref}>
            Request a custom design
          </a>
        </div>
      </div>

      {!styleSurveyCompleted ? (
        <div className="rounded-[1.25rem] border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">
          You’ll need to complete the Style Survey before requesting a custom design.
        </div>
      ) : null}

      {error ? <div className="text-sm text-red-300">{error}</div> : null}
      {success ? <div className="text-sm text-emerald-300">{success}</div> : null}

      {sorted.length === 0 ? (
        <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-6 text-sm text-zinc-400">
          No custom design requests yet.
        </div>
      ) : (
        <div className="space-y-6">
          {sorted.map((req) => (
            <div key={req.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm text-zinc-400">Request</div>
                  <div className="mt-1 text-base font-semibold text-white">
                    {req.shirtSize} • {req.shirtColor}
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">
                    Status: <span className="text-zinc-300">{req.status}</span>
                  </div>
                </div>
                <div className="text-xs text-zinc-500">{new Date(req.createdAt).toLocaleString()}</div>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-zinc-300">
                {req.galleryDesignRef ? (
                  <div>
                    <span className="text-zinc-500">Gallery selection:</span> {req.galleryDesignRef}
                  </div>
                ) : null}
                {req.basedOnStyleProfile ? (
                  <div>
                    <span className="text-zinc-500">Design basis:</span> Based on your Style Profile
                  </div>
                ) : null}
                {req.notes ? (
                  <div>
                    <span className="text-zinc-500">Notes:</span> {req.notes}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 space-y-4">
                {req.proposals.length === 0 ? (
                  <div className="text-sm text-zinc-400">No design drafts yet.</div>
                ) : (
                  req.proposals.map((proposal) => {
                    const decided = Boolean(proposal.customerDecision);
                    const busy = busyProposalId === proposal.id;

                    return (
                      <div key={proposal.id} className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="text-xs uppercase tracking-wider text-zinc-500">Draft</div>
                            <div className="mt-1 text-sm text-zinc-300">{new Date(proposal.createdAt).toLocaleString()}</div>
                            {proposal.adminMessage ? <div className="mt-3 text-sm text-zinc-300">{proposal.adminMessage}</div> : null}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {decided ? (
                              <span>
                                Decision: <span className="text-zinc-200">{proposal.customerDecision}</span>
                              </span>
                            ) : (
                              "Awaiting your response"
                            )}
                          </div>
                        </div>

                        {proposal.assetUrl ? (
                          <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={proposal.assetUrl}
                              alt={proposal.assetLabel || "Custom design draft"}
                              className="w-full max-h-[520px] object-contain"
                            />
                          </div>
                        ) : null}

                        {!decided ? (
                          <div className="mt-4 grid gap-3">
                            <label className="text-sm text-zinc-300">
                              <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Feedback (optional)</div>
                              <textarea
                                value={feedbackByProposalId[proposal.id] ?? ""}
                                onChange={(e) => setFeedbackByProposalId((cur) => ({ ...cur, [proposal.id]: e.target.value }))}
                                className="min-h-[96px] w-full rounded-md border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
                                placeholder="Tell us what you’d like changed (or approve/deny without feedback)."
                              />
                            </label>

                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleDecision(proposal.id, "APPROVED")}
                                className="btn btn-primary"
                              >
                                {busy ? "Saving..." : "Approve"}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleDecision(proposal.id, "DENIED")}
                                className="btn btn-secondary"
                              >
                                {busy ? "Saving..." : "Deny"}
                              </button>
                            </div>
                          </div>
                        ) : proposal.customerFeedback ? (
                          <div className="mt-4 text-sm text-zinc-300">
                            <span className="text-zinc-500">Your feedback:</span> {proposal.customerFeedback}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
