"use client";

import { useState } from "react";

type FormState = {
  shirtSize: string;
  shirtColor: string;
  galleryDesignRef: string;
  basedOnStyleProfile: boolean;
  notes: string;
};

async function submitRequest(payload: {
  shirtSize: string;
  shirtColor: string;
  galleryDesignRef?: string;
  basedOnStyleProfile: boolean;
  notes?: string;
}) {
  const res = await fetch("/api/storefront/custom-design-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(json.error || "Failed to submit request");
}

export default function CustomDesignRequestForm({ portalHref }: { portalHref: string }) {
  const [state, setState] = useState<FormState>({
    shirtSize: "",
    shirtColor: "",
    galleryDesignRef: "",
    basedOnStyleProfile: false,
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [overlayOpen, setOverlayOpen] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!state.shirtSize.trim()) return setError("Shirt size is required");
    if (!state.shirtColor.trim()) return setError("Shirt color is required");

    setSubmitting(true);
    try {
      await submitRequest({
        shirtSize: state.shirtSize.trim(),
        shirtColor: state.shirtColor.trim(),
        galleryDesignRef: state.galleryDesignRef.trim() || undefined,
        basedOnStyleProfile: state.basedOnStyleProfile,
        notes: state.notes.trim() || undefined,
      });

      setOverlayOpen(true);
      setTimeout(() => {
        window.location.href = portalHref;
      }, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {overlayOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/90 p-6 text-center">
            <div className="text-lg font-semibold text-white">Request submitted</div>
            <div className="mt-2 text-sm text-zinc-400">We’ll email you when a draft is ready.</div>
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-8 grid gap-4 rounded-xl border border-white/10 bg-zinc-950/40 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-zinc-200">
            <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Shirt size</div>
            <input
              value={state.shirtSize}
              onChange={(e) => setState((cur) => ({ ...cur, shirtSize: e.target.value }))}
              placeholder="e.g., Small, Medium, Large"
              className="w-full rounded-md border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
            />
          </label>

          <label className="text-sm text-zinc-200">
            <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Shirt color</div>
            <input
              value={state.shirtColor}
              onChange={(e) => setState((cur) => ({ ...cur, shirtColor: e.target.value }))}
              placeholder="e.g., Black, White, Navy"
              className="w-full rounded-md border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
            />
          </label>
        </div>

        <label className="text-sm text-zinc-200">
          <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Gallery selection (optional)</div>
          <input
            value={state.galleryDesignRef}
            onChange={(e) => setState((cur) => ({ ...cur, galleryDesignRef: e.target.value }))}
            placeholder="Paste a link or name from the Design Gallery"
            className="w-full rounded-md border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
          />
        </label>

        <label className="flex items-start gap-3 text-sm text-zinc-200">
          <input
            type="checkbox"
            checked={state.basedOnStyleProfile}
            onChange={(e) => setState((cur) => ({ ...cur, basedOnStyleProfile: e.target.checked }))}
            className="mt-1 h-4 w-4 rounded border-white/10 bg-zinc-950/40"
          />
          <span>
            Create a design based on my Style Profile
            <span className="mt-1 block text-xs text-zinc-500">We’ll use your Style Survey answers as inspiration.</span>
          </span>
        </label>

        <label className="text-sm text-zinc-200">
          <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Notes (optional)</div>
          <textarea
            value={state.notes}
            onChange={(e) => setState((cur) => ({ ...cur, notes: e.target.value }))}
            placeholder="Anything else we should know?"
            className="min-h-[120px] w-full rounded-md border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
          />
        </label>

        {error ? <div className="text-sm text-red-300">{error}</div> : null}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "Submitting..." : "Submit request"}
          </button>
          <a href={portalHref} className="btn btn-secondary">
            Back to portal
          </a>
        </div>
      </form>
    </>
  );
}
