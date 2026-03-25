"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const STATUSES = ["NEW", "REVIEWED", "CONTACTED", "ARCHIVED"] as const;
type QuoteSubmissionStatus = (typeof STATUSES)[number];

export default function SubmissionActions({
  submissionId,
  currentStatus,
  submissionEmail,
  redirectTo,
}: {
  submissionId: string;
  currentStatus: QuoteSubmissionStatus;
  submissionEmail: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<QuoteSubmissionStatus>(currentStatus);
  const [previewMode, setPreviewMode] = useState<"customer" | "admin">("customer");
  const [previewEmail, setPreviewEmail] = useState(submissionEmail);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function handleStatusUpdate(nextStatus: QuoteSubmissionStatus) {
    setStatus(nextStatus);
    setMessage("");
    setError("");

    startTransition(async () => {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus(currentStatus);
        setError(data.error || "Failed to update status");
        return;
      }

      setMessage(`Status updated to ${nextStatus}`);
      router.refresh();
    });
  }

  function handleResend() {
    setMessage("");
    setError("");

    startTransition(async () => {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: "POST",
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Failed to resend emails");
        return;
      }

      setMessage("Emails resent successfully");
      router.refresh();
    });
  }

  function openPreview(mode: "customer" | "admin") {
    const url = `/api/submissions/test?mode=${mode}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleSendPreview() {
    setMessage("");
    setError("");

    startTransition(async () => {
      const res = await fetch("/api/submissions/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: previewEmail.trim(),
          mode: previewMode,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string; to?: string; mode?: string };
      if (!res.ok) {
        setError(data.error || "Failed to send preview email");
        return;
      }

      setMessage(`Preview email sent to ${data.to || previewEmail} (${data.mode || previewMode})`);
    });
  }

  function handleDelete() {
    if (!window.confirm(`Delete submission for ${submissionEmail}? This cannot be undone.`)) return;

    setMessage("");
    setError("");

    startTransition(async () => {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: "DELETE",
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Failed to delete submission");
        return;
      }

      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-5 rounded-lg border border-gray-800 bg-gray-950/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-gray-500">Actions</div>
          <div className="mt-1 text-sm text-gray-400">Update the inquiry stage, preview either email, or send yourself a test copy.</div>
        </div>
        <div className="flex w-full flex-col gap-4 lg:max-w-3xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={status}
              disabled={isPending}
              onChange={(event) => handleStatusUpdate(event.target.value as QuoteSubmissionStatus)}
              className="rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-navy-800 focus:outline-none"
            >
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={isPending}
              onClick={handleResend}
              className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Working..." : "Resend Emails"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="rounded-md border border-red-800/60 bg-red-900/20 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Delete Submission
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[auto_auto_1fr_auto_auto] lg:items-center">
            <button
              type="button"
              onClick={() => openPreview("customer")}
              className="rounded-md border border-gray-800 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
            >
              Preview Customer
            </button>
            <button
              type="button"
              onClick={() => openPreview("admin")}
              className="rounded-md border border-gray-800 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
            >
              Preview Admin
            </button>
            <input
              type="email"
              value={previewEmail}
              onChange={(event) => setPreviewEmail(event.target.value)}
              placeholder="Send test email to..."
              className="w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-navy-800 focus:outline-none"
            />
            <select
              value={previewMode}
              onChange={(event) => setPreviewMode(event.target.value as "customer" | "admin")}
              className="rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-navy-800 focus:outline-none"
            >
              <option value="customer">Customer Test</option>
              <option value="admin">Admin Test</option>
            </select>
            <button
              type="button"
              disabled={isPending || !previewEmail.trim()}
              onClick={handleSendPreview}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send Test
            </button>
          </div>
        </div>
      </div>
      {error ? <div className="mt-3 text-sm text-red-400">{error}</div> : null}
      {message ? <div className="mt-3 text-sm text-emerald-400">{message}</div> : null}
    </div>
  );
}