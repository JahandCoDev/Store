"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import MediaAssetPicker from "@/components/MediaAssetPicker";

type CollectionOption = {
  id: string;
  title: string;
  handle: string;
};

type StorefrontPagePayload = {
  id?: string;
  slug: string;
  title: string;
  template: "STANDARD" | "HOME" | "LANDING";
  status: "DRAFT" | "PUBLISHED";
  excerpt: string;
  body: string;
  heroEyebrow: string | null;
  heroTitle: string | null;
  heroBody: string | null;
  heroCtaLabel: string | null;
  heroCtaHref: string | null;
  heroImageAssetId: string | null;
  featuredCollectionId: string | null;
  sections: unknown;
  navLabel: string | null;
  showInNavigation: boolean;
  isHomepage: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
};

function formatSections(value: unknown) {
  try {
    return JSON.stringify(Array.isArray(value) ? value : [], null, 2);
  } catch {
    return "[]";
  }
}

export default function StorefrontPageEditor({
  mode,
  pageId,
}: {
  mode: "create" | "edit";
  pageId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [heroImageIds, setHeroImageIds] = useState<string[]>([]);
  const [sectionsInput, setSectionsInput] = useState("[]");

  const [form, setForm] = useState<StorefrontPagePayload>({
    slug: "",
    title: "",
    template: "STANDARD",
    status: "DRAFT",
    excerpt: "",
    body: "",
    heroEyebrow: null,
    heroTitle: null,
    heroBody: null,
    heroCtaLabel: null,
    heroCtaHref: null,
    heroImageAssetId: null,
    featuredCollectionId: null,
    sections: [],
    navLabel: null,
    showInNavigation: false,
    isHomepage: false,
    seoTitle: null,
    seoDescription: null,
    sortOrder: 0,
  });

  useEffect(() => {
    fetch("/api/collections", { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { collections?: CollectionOption[]; error?: string };
        if (!res.ok) throw new Error(data.error || "Failed to load collections");
        setCollections((data.collections ?? []).map((collection) => ({ id: collection.id, title: collection.title, handle: collection.handle })));
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !pageId) return;
    fetch(`/api/pages/${pageId}`, { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { page?: StorefrontPagePayload; error?: string };
        if (!res.ok || !data.page) throw new Error(data.error || "Failed to load page");
        return data.page;
      })
      .then((page) => {
        setForm(page);
        setHeroImageIds(page.heroImageAssetId ? [page.heroImageAssetId] : []);
        setSectionsInput(formatSections(page.sections));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [mode, pageId]);

  function updateField<K extends keyof StorefrontPagePayload>(key: K, value: StorefrontPagePayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    let parsedSections: unknown = [];
    try {
      parsedSections = JSON.parse(sectionsInput || "[]");
      if (!Array.isArray(parsedSections)) throw new Error("Sections JSON must be an array");
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Sections JSON is invalid");
      return;
    }

    try {
      const res = await fetch(mode === "create" ? "/api/pages" : `/api/pages/${pageId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          heroImageAssetId: heroImageIds[0] ?? null,
          sections: parsedSections,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to save storefront page");
      router.push(mode === "create" ? "/pages" : `/pages/${pageId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save storefront page");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!pageId || !confirm("Delete this storefront page?")) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to delete page");
      router.push("/pages");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete page");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-gray-400">Loading storefront page...</div>;
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{mode === "create" ? "New Storefront Page" : "Edit Storefront Page"}</h1>
            <p className="mt-1 text-sm text-gray-400">Create DB-backed pages to replace the remaining legacy placeholders.</p>
          </div>
          <Link href="/pages" className="text-sm text-gray-300 hover:text-white">Back to pages</Link>
        </div>

        <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-gray-300">
                <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Title</span>
                <input value={form.title} onChange={(event) => updateField("title", event.target.value)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
              </label>
              <label className="text-sm text-gray-300">
                <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Slug</span>
                <input value={form.slug} onChange={(event) => updateField("slug", event.target.value)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm text-gray-300">
                <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Template</span>
                <select value={form.template} onChange={(event) => updateField("template", event.target.value as StorefrontPagePayload["template"])} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200">
                  <option value="STANDARD">Standard</option>
                  <option value="HOME">Home</option>
                  <option value="LANDING">Landing</option>
                </select>
              </label>
              <label className="text-sm text-gray-300">
                <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Status</span>
                <select value={form.status} onChange={(event) => updateField("status", event.target.value as StorefrontPagePayload["status"])} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200">
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </label>
              <label className="text-sm text-gray-300">
                <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Sort Order</span>
                <input type="number" value={form.sortOrder} onChange={(event) => updateField("sortOrder", Number(event.target.value) || 0)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
              </label>
            </div>

            <label className="block text-sm text-gray-300">
              <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Excerpt</span>
              <textarea value={form.excerpt} onChange={(event) => updateField("excerpt", event.target.value)} rows={3} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
            </label>

            <label className="block text-sm text-gray-300">
              <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Body</span>
              <textarea value={form.body} onChange={(event) => updateField("body", event.target.value)} rows={8} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-gray-300">
                <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Hero Eyebrow</span>
                <input value={form.heroEyebrow ?? ""} onChange={(event) => updateField("heroEyebrow", event.target.value || null)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
              </label>
              <label className="text-sm text-gray-300">
                <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Hero Title</span>
                <input value={form.heroTitle ?? ""} onChange={(event) => updateField("heroTitle", event.target.value || null)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
              </label>
            </div>

            <label className="block text-sm text-gray-300">
              <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Hero Body</span>
              <textarea value={form.heroBody ?? ""} onChange={(event) => updateField("heroBody", event.target.value || null)} rows={4} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-gray-300">
                <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Hero CTA Label</span>
                <input value={form.heroCtaLabel ?? ""} onChange={(event) => updateField("heroCtaLabel", event.target.value || null)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
              </label>
              <label className="text-sm text-gray-300">
                <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Hero CTA URL</span>
                <input value={form.heroCtaHref ?? ""} onChange={(event) => updateField("heroCtaHref", event.target.value || null)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-gray-300">
                <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Navigation Label</span>
                <input value={form.navLabel ?? ""} onChange={(event) => updateField("navLabel", event.target.value || null)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
              </label>
              <label className="text-sm text-gray-300">
                <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Featured Collection</span>
                <select value={form.featuredCollectionId ?? ""} onChange={(event) => updateField("featuredCollectionId", event.target.value || null)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200">
                  <option value="">None</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>{collection.title}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 rounded-lg border border-gray-800 bg-gray-950 px-4 py-3">
              <label className="flex items-center gap-3 text-sm text-gray-300">
                <input type="checkbox" checked={form.showInNavigation} onChange={(event) => updateField("showInNavigation", event.target.checked)} className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-navy-600" />
                Show in navigation
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-300">
                <input type="checkbox" checked={form.isHomepage} onChange={(event) => updateField("isHomepage", event.target.checked)} className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-navy-600" />
                Use as storefront homepage
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-gray-300">
                <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">SEO Title</span>
                <input value={form.seoTitle ?? ""} onChange={(event) => updateField("seoTitle", event.target.value || null)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
              </label>
              <label className="text-sm text-gray-300">
                <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">SEO Description</span>
                <textarea value={form.seoDescription ?? ""} onChange={(event) => updateField("seoDescription", event.target.value || null)} rows={3} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
              </label>
            </div>

            <label className="block text-sm text-gray-300">
              <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Sections JSON</span>
              <textarea value={sectionsInput} onChange={(event) => setSectionsInput(event.target.value)} rows={14} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 font-mono text-sm text-gray-200" />
              <p className="mt-2 text-xs text-gray-500">Supported section objects can be things like rich text, feature grids, and CTA blocks. Start with an empty array if you want a simpler page.</p>
            </label>
          </div>

          <div className="space-y-6">
            <MediaAssetPicker
              label="Hero image"
              helperText="Optional page hero image."
              selectedIds={heroImageIds}
              onChange={(ids) => setHeroImageIds(ids.slice(0, 1))}
            />

            {error ? <div className="text-sm text-red-400">{error}</div> : null}

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center justify-between gap-3">
                {mode === "edit" ? (
                  <button type="button" onClick={() => void onDelete()} disabled={deleting || saving} className="rounded-md border border-red-800/60 bg-red-900/20 px-4 py-2 text-sm text-red-200 hover:bg-red-900/30 disabled:opacity-60">
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                ) : <div />}
                <button type="submit" disabled={saving} className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-60">
                  {saving ? "Saving..." : mode === "create" ? "Create Page" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}