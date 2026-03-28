"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import MediaAssetPicker, { type MediaAssetSummary } from "@/components/MediaAssetPicker";

export default function CustomDesignProposalForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetSummary | null>(null);
  const [adminMessage, setAdminMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const assetId = useMemo(() => assetIds[0] ?? "", [assetIds]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!assetId) {
      setError("Select (or upload) a design asset");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/custom-design-requests/${encodeURIComponent(requestId)}/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, adminMessage }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to create proposal");

      setSuccess("Draft created.");
      setAdminMessage("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create proposal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <div className="text-sm font-semibold text-gray-100">Send a new draft</div>
      <p className="mt-1 text-xs text-gray-500">Upload/select a design from the Media Library and attach it to this request.</p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <MediaAssetPicker
          label="Design draft asset"
          helperText="Pick an image from the Media Library or upload a new one."
          multiple={false}
          selectedIds={assetIds}
          onChange={(ids, assets) => {
            setAssetIds(ids);
            setSelectedAsset(assets[0] ?? null);
          }}
        />

        {selectedAsset ? (
          <div className="text-xs text-gray-500">
            Selected: <span className="text-gray-200">{selectedAsset.title || selectedAsset.originalFilename}</span>
          </div>
        ) : null}

        <label className="block text-sm text-gray-300">
          <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Message to customer (optional)</span>
          <textarea
            value={adminMessage}
            onChange={(e) => setAdminMessage(e.target.value)}
            className="min-h-[120px] w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200"
            placeholder="Add any notes about this draft"
          />
        </label>

        {error ? <div className="text-sm text-red-400">{error}</div> : null}
        {success ? <div className="text-sm text-emerald-400">{success}</div> : null}

        <button type="submit" disabled={saving} className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-60">
          {saving ? "Sending..." : "Send draft"}
        </button>
      </form>
    </div>
  );
}
