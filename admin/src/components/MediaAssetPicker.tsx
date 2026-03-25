"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type MediaAssetSummary = {
  id: string;
  title: string | null;
  altText: string | null;
  originalFilename: string;
  mimeType: string;
  storageKey: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  tags: string[];
  createdAt: string;
  url: string;
};

type ProjectProductImage = {
  filename: string;
  originalFilename: string;
  url: string;
  sizeBytes: number;
};

export default function MediaAssetPicker({
  label,
  helperText,
  multiple = false,
  allowProjectImageImports = false,
  selectedIds,
  onChange,
}: {
  label: string;
  helperText?: string;
  multiple?: boolean;
  allowProjectImageImports?: boolean;
  selectedIds: string[];
  onChange: (ids: string[], assets: MediaAssetSummary[]) => void;
}) {
  const [assets, setAssets] = useState<MediaAssetSummary[]>([]);
  const [projectImages, setProjectImages] = useState<ProjectProductImage[]>([]);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const loadAssets = useCallback(async (nextQuery = query) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      if (allowProjectImageImports) params.set("includeProjectImages", "1");
      const res = await fetch(`/api/media${params.toString() ? `?${params.toString()}` : ""}`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { assets?: MediaAssetSummary[]; projectImages?: ProjectProductImage[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to load media assets");
      setAssets(Array.isArray(data.assets) ? data.assets : []);
      setProjectImages(Array.isArray(data.projectImages) ? data.projectImages : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load media assets");
    } finally {
      setLoading(false);
    }
  }, [allowProjectImageImports, query]);

  useEffect(() => {
    void loadAssets("");
  }, [loadAssets]);

  const selectedAssets = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    return assets.filter((asset) => selectedSet.has(asset.id));
  }, [assets, selectedIds]);

  function toggleAsset(asset: MediaAssetSummary) {
    const exists = selectedIds.includes(asset.id);
    let nextIds: string[];
    if (multiple) {
      nextIds = exists ? selectedIds.filter((id) => id !== asset.id) : [...selectedIds, asset.id];
    } else {
      nextIds = exists ? [] : [asset.id];
    }

    const assetMap = new Map(assets.map((entry) => [entry.id, entry]));
    const nextAssets = nextIds.map((id) => assetMap.get(id)).filter((entry): entry is MediaAssetSummary => Boolean(entry));
    onChange(nextIds, nextAssets);
  }

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose an image to upload");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("title", title);
      formData.set("altText", altText);
      formData.set("tags", tags);

      const res = await fetch("/api/media", { method: "POST", body: formData });
      const data = (await res.json().catch(() => ({}))) as { asset?: MediaAssetSummary; error?: string };
      if (!res.ok || !data.asset) throw new Error(data.error || "Failed to upload image");

      const nextAssets = [data.asset, ...assets.filter((asset) => asset.id !== data.asset?.id)];
      setAssets(nextAssets);
      const nextIds = multiple ? [...new Set([...selectedIds, data.asset.id])] : [data.asset.id];
      const nextSelectedAssets = nextIds
        .map((id) => nextAssets.find((asset) => asset.id === id))
        .filter((asset): asset is MediaAssetSummary => Boolean(asset));
      onChange(nextIds, nextSelectedAssets);

      setTitle("");
      setAltText("");
      setTags("");
      setFile(null);
      const input = document.getElementById(`media-upload-input-${label}`) as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  async function importProjectImage(projectImage: ProjectProductImage) {
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.set("importProjectImage", projectImage.filename);
      formData.set("title", pathSafeTitle(projectImage.originalFilename));
      formData.set("altText", pathSafeTitle(projectImage.originalFilename));
      formData.set("tags", "product-image, imported");

      const res = await fetch("/api/media", { method: "POST", body: formData });
      const data = (await res.json().catch(() => ({}))) as { asset?: MediaAssetSummary; error?: string };
      if (!res.ok || !data.asset) throw new Error(data.error || "Failed to import project image");

      const nextAssets = [data.asset, ...assets.filter((asset) => asset.id !== data.asset?.id)];
      setAssets(nextAssets);
      const nextIds = multiple ? [...new Set([...selectedIds, data.asset.id])] : [data.asset.id];
      const nextSelectedAssets = nextIds
        .map((id) => nextAssets.find((asset) => asset.id === id))
        .filter((asset): asset is MediaAssetSummary => Boolean(asset));
      onChange(nextIds, nextSelectedAssets);
      setProjectImages((current) => current.filter((entry) => entry.filename !== projectImage.filename));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import project image");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-950/50 p-4">
      <div>
        <div className="text-sm font-medium text-gray-200">{label}</div>
        {helperText ? <p className="mt-1 text-xs text-gray-500">{helperText}</p> : null}
        {selectedAssets.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => toggleAsset(asset)}
                className="rounded-full border border-navy-700/60 bg-navy-900/30 px-3 py-1 text-xs text-navy-100"
              >
                {asset.title || asset.originalFilename} ×
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <form onSubmit={onUpload} className="grid gap-3 rounded-lg border border-gray-800 bg-gray-900/60 p-3 md:grid-cols-2">
        <label className="text-sm text-gray-300 md:col-span-2">
          <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Upload image</span>
          <input
            id={`media-upload-input-${label}`}
            type="file"
            accept="image/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200"
          />
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
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="product, hero, collection" className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
        </label>
        <div className="md:col-span-2 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500">Uploads are stored in the project folder and mirrored for both admin and storefront.</div>
          <button type="submit" disabled={uploading} className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-60">
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </form>

      <div className="flex items-center gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, filename, or tag"
          className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200"
        />
        <button type="button" onClick={() => void loadAssets(query)} className="rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800">
          Search
        </button>
      </div>

      {error ? <div className="text-sm text-red-400">{error}</div> : null}

      {allowProjectImageImports && projectImages.length > 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-gray-200">Project Product Images</div>
              <p className="mt-1 text-xs text-gray-500">Import files from `admin/public/Product_Images` into shared media so they work on both admin and storefront.</p>
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                    className="mt-3 rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-800 disabled:opacity-60"
                  >
                    {uploading ? "Importing..." : "Import to Media"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="text-sm text-gray-400">Loading media...</div>
        ) : assets.length === 0 ? (
          <div className="text-sm text-gray-500">No media found.</div>
        ) : (
          assets.map((asset) => {
            const isSelected = selectedIds.includes(asset.id);
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => toggleAsset(asset)}
                className={`overflow-hidden rounded-xl border text-left transition ${
                  isSelected
                    ? "border-navy-700 bg-navy-900/20"
                    : "border-gray-800 bg-gray-900/60 hover:border-gray-700"
                }`}
              >
                <div className="aspect-[4/3] bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt={asset.altText || asset.title || asset.originalFilename} className="h-full w-full object-cover" />
                </div>
                <div className="p-3">
                  <div className="truncate text-sm font-medium text-gray-100">{asset.title || asset.originalFilename}</div>
                  <div className="mt-1 text-xs text-gray-500">{asset.altText || asset.originalFilename}</div>
                  {asset.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {asset.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded-full border border-gray-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function pathSafeTitle(filename: string) {
  return filename.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
}