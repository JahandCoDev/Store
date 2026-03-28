"use client";

import { useCallback, useEffect, useState } from "react";

import type { MediaAssetSummary } from "@/components/MediaAssetPicker";

type ProjectProductImage = {
  filename: string;
  originalFilename: string;
  url: string;
  sizeBytes: number;
};

type EditableAsset = MediaAssetSummary & {
  draftTitle: string;
  draftAltText: string;
  draftTags: string;
  saving?: boolean;
  deleting?: boolean;
};

export default function MediaLibraryManager() {
  const [assets, setAssets] = useState<EditableAsset[]>([]);
  const [projectImages, setProjectImages] = useState<ProjectProductImage[]>([]);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function hydrate(asset: MediaAssetSummary): EditableAsset {
    return {
      ...asset,
      draftTitle: asset.title ?? "",
      draftAltText: asset.altText ?? "",
      draftTags: asset.tags.join(", "),
    };
  }

  const loadAssets = useCallback(async (nextQuery = query) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      params.set("includeProjectImages", "1");
      const res = await fetch(`/api/media${params.toString() ? `?${params.toString()}` : ""}`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { assets?: MediaAssetSummary[]; projectImages?: ProjectProductImage[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to load media library");
      setAssets((data.assets ?? []).map(hydrate));
      setProjectImages(Array.isArray(data.projectImages) ? data.projectImages : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load media library");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadAssets("");
  }, [loadAssets]);

  function updateAsset(id: string, updater: (asset: EditableAsset) => EditableAsset) {
    setAssets((current) => current.map((asset) => (asset.id === id ? updater(asset) : asset)));
  }

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose an image to upload");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("title", title);
      formData.set("altText", altText);
      formData.set("tags", tags);

      const res = await fetch("/api/media", { method: "POST", body: formData });
      const data = (await res.json().catch(() => ({}))) as { asset?: MediaAssetSummary; error?: string };
      if (!res.ok || !data.asset) throw new Error(data.error || "Failed to upload image");

      setAssets((current) => [hydrate(data.asset!), ...current]);
      setTitle("");
      setAltText("");
      setTags("");
      setFile(null);
      const input = document.getElementById("media-library-upload") as HTMLInputElement | null;
      if (input) input.value = "";
      setMessage("Image uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  async function saveAsset(asset: EditableAsset) {
    updateAsset(asset.id, (current) => ({ ...current, saving: true }));
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/media/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: asset.draftTitle,
          altText: asset.draftAltText,
          tags: asset.draftTags,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { asset?: MediaAssetSummary; error?: string };
      if (!res.ok || !data.asset) throw new Error(data.error || "Failed to save asset");
      updateAsset(asset.id, () => hydrate(data.asset!));
      setMessage("Asset saved.");
    } catch (err) {
      updateAsset(asset.id, (current) => ({ ...current, saving: false }));
      setError(err instanceof Error ? err.message : "Failed to save asset");
    }
  }

  async function deleteAsset(asset: EditableAsset) {
    if (!confirm(`Delete ${asset.title || asset.originalFilename}?`)) return;
    updateAsset(asset.id, (current) => ({ ...current, deleting: true }));
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/media/${asset.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to delete asset");
      setAssets((current) => current.filter((entry) => entry.id !== asset.id));
      setMessage("Asset deleted.");
    } catch (err) {
      updateAsset(asset.id, (current) => ({ ...current, deleting: false }));
      setError(err instanceof Error ? err.message : "Failed to delete asset");
    }
  }

  async function importProjectImage(projectImage: ProjectProductImage) {
    setUploading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.set("importProjectImage", projectImage.filename);
      // Derive a safe title from filename automatically matching MediaAssetPicker behavior
      const title = projectImage.originalFilename.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
      formData.set("title", title);
      formData.set("altText", title);
      formData.set("tags", "project-image, imported");

      const res = await fetch("/api/media", { method: "POST", body: formData });
      const data = (await res.json().catch(() => ({}))) as { asset?: MediaAssetSummary; error?: string };
      if (!res.ok || !data.asset) throw new Error(data.error || "Failed to import project image");

      setAssets((current) => [hydrate(data.asset!), ...current]);
      setProjectImages((current) => current.filter((entry) => entry.filename !== projectImage.filename));
      setMessage("Image imported into the Media Library.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import project image");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Media Library</h1>
        <p className="mt-1 text-sm text-gray-400">Upload reusable storefront images and manage their metadata.</p>
      </div>

      <form onSubmit={onUpload} className="grid gap-4 rounded-xl border border-gray-800 bg-gray-900 p-6 md:grid-cols-2">
        <label className="text-sm text-gray-300 md:col-span-2">
          <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Image file</span>
          <input id="media-library-upload" type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
        </label>
        <label className="text-sm text-gray-300">
          <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
        </label>
        <label className="text-sm text-gray-300">
          <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Alt text</span>
          <input value={altText} onChange={(event) => setAltText(event.target.value)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
        </label>
        <label className="text-sm text-gray-300 md:col-span-2">
          <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Tags</span>
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="product, homepage, hero" className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
        </label>
        <div className="md:col-span-2 flex items-center justify-between gap-4">
          <p className="text-xs text-gray-500">Files are written into the project folder so they can be reused across products, collections, and storefront pages.</p>
          <button type="submit" disabled={uploading} className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-60">
            {uploading ? "Uploading..." : "Upload image"}
          </button>
        </div>
      </form>

      <div className="flex items-center gap-3">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search media..." className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
        <button type="button" onClick={() => void loadAssets(query)} className="rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800">
          Search
        </button>
      </div>

      {error ? <div className="text-sm text-red-400">{error}</div> : null}
      {message ? <div className="text-sm text-emerald-400">{message}</div> : null}

      {projectImages.length > 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-gray-200">S3 Project Product Images</div>
              <p className="mt-1 text-xs text-gray-400">These files are discovered in the `product-images/` prefix of your S3 bucket. Import them below to tag and manage them.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {projectImages.map((image) => (
              <div key={image.filename} className="overflow-hidden rounded-xl border border-gray-800 bg-gray-950/70">
                <div className="aspect-[4/3] bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.originalFilename} className="h-full w-full object-cover" />
                </div>
                <div className="p-3">
                  <div className="truncate text-sm font-medium text-gray-100">{image.originalFilename}</div>
                  <div className="mt-1 text-xs text-gray-500">{Math.max(1, Math.round(image.sizeBytes / 1024))} KB</div>
                  <button
                    type="button"
                    onClick={() => void importProjectImage(image)}
                    disabled={uploading}
                    className="mt-3 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-800 disabled:opacity-60"
                  >
                    {uploading ? "Importing..." : "Import"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="text-sm text-gray-400">Loading media library...</div>
        ) : assets.length === 0 ? (
          <div className="text-sm text-gray-500">No assets found.</div>
        ) : (
          assets.map((asset) => (
            <div key={asset.id} className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
              <div className="aspect-[4/3] bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.url} alt={asset.altText || asset.title || asset.originalFilename} className="h-full w-full object-cover" />
              </div>
              <div className="space-y-3 p-4">
                <div className="text-xs uppercase tracking-wider text-gray-500">{asset.originalFilename}</div>
                <label className="block text-sm text-gray-300">
                  <span className="mb-1 block text-xs uppercase tracking-wider text-gray-500">Title</span>
                  <input value={asset.draftTitle} onChange={(event) => updateAsset(asset.id, (current) => ({ ...current, draftTitle: event.target.value }))} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
                </label>
                <label className="block text-sm text-gray-300">
                  <span className="mb-1 block text-xs uppercase tracking-wider text-gray-500">Alt text</span>
                  <input value={asset.draftAltText} onChange={(event) => updateAsset(asset.id, (current) => ({ ...current, draftAltText: event.target.value }))} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
                </label>
                <label className="block text-sm text-gray-300">
                  <span className="mb-1 block text-xs uppercase tracking-wider text-gray-500">Tags</span>
                  <input value={asset.draftTags} onChange={(event) => updateAsset(asset.id, (current) => ({ ...current, draftTags: event.target.value }))} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
                </label>
                <div className="flex items-center justify-between gap-3">
                  <button type="button" onClick={() => void deleteAsset(asset)} disabled={asset.deleting || asset.saving} className="rounded-md border border-red-800/60 bg-red-900/20 px-3 py-2 text-sm text-red-200 hover:bg-red-900/30 disabled:opacity-60">
                    {asset.deleting ? "Deleting..." : "Delete"}
                  </button>
                  <button type="button" onClick={() => void saveAsset(asset)} disabled={asset.saving || asset.deleting} className="rounded-md bg-navy-800 px-3 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-60">
                    {asset.saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}