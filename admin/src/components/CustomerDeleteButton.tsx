"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function CustomerDeleteButton({
  customerId,
  customerLabel,
  redirectTo,
}: {
  customerId: string;
  customerLabel: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);

  function handleDelete() {
    if (!window.confirm(`Delete ${customerLabel}? This cannot be undone.`)) return;

    setError("");
    setIsDeleting(true);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/customers/${customerId}`, { method: "DELETE" });
        const data = (await res.json().catch(() => ({}))) as { error?: string };

        if (!res.ok) {
          throw new Error(data.error || "Failed to delete customer");
        }

        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete customer");
      } finally {
        setIsDeleting(false);
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending || isDeleting}
        className="rounded-md border border-red-800/60 bg-red-900/20 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/40 disabled:opacity-60"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
      {error ? <span className="text-[11px] text-red-400">{error}</span> : null}
    </div>
  );
}