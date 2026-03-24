"use client";

import { useState } from "react";

type TemplateOption = {
  id: string;
  label: string;
  description: string;
};

type FormState = {
  to: string;
  subject: string;
  title: string;
  templateId: string;
  badge: string;
  previewText: string;
  intro: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote: string;
  signatureName: string;
  signatureTitle: string;
};

const defaultBodyHtml = [
  "<p style=\"margin:0 0 16px;\">Thanks again for reaching out.</p>",
  "<p style=\"margin:0 0 16px;\">I wanted to send over a cleaner follow-up with the next steps and what I recommend for your project.</p>",
  "<p style=\"margin:0;\">Reply to this email if you want me to turn this into a formal quote.</p>",
].join("\n");

export default function MarketingComposer({
  defaultTo,
  shopId,
  templates,
}: {
  defaultTo?: string | null;
  shopId: string;
  templates: TemplateOption[];
}) {
  const initialTemplateId = templates[0]?.id ?? "base";
  const [form, setForm] = useState<FormState>({
    to: defaultTo ?? "",
    subject: "JahandCo follow-up",
    title: "A quick follow-up from JahandCo",
    templateId: initialTemplateId,
    badge: "JahandCo",
    previewText: "A quick follow-up from JahandCo",
    intro: "A cleaner overview with the next steps.",
    bodyHtml: defaultBodyHtml,
    ctaLabel: "View Examples",
    ctaUrl: "https://jahandco.net/dev",
    footerNote: "Reply directly to this email if you want to continue the conversation.",
    signatureName: "Jah",
    signatureTitle: "JahandCo",
  });
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSending, setIsSending] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handlePreview() {
    setIsPreviewing(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", ...form }),
      });

      const data = (await res.json().catch(() => ({}))) as { html?: string; error?: string };
      if (!res.ok || !data.html) {
        throw new Error(data.error || "Failed to render preview");
      }

      setPreviewHtml(data.html);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to render preview");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleSend() {
    setIsSending(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", ...form }),
      });

      const data = (await res.json().catch(() => ({}))) as { to?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setMessage(`Email sent to ${data.to || form.to}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,560px)]">
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Marketing Email Composer</h1>
          <p className="mt-1 text-sm text-gray-400">Compose, preview, and send branded manual emails from the admin panel.</p>
          <p className="mt-2 text-xs uppercase tracking-wider text-gray-500">Selected shop: {shopId}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-gray-300">
            <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">To</span>
            <input value={form.to} onChange={(e) => updateField("to", e.target.value)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-navy-800 focus:outline-none" />
          </label>
          <label className="block text-sm text-gray-300">
            <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Subject</span>
            <input value={form.subject} onChange={(e) => updateField("subject", e.target.value)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-navy-800 focus:outline-none" />
          </label>
          <label className="block text-sm text-gray-300 md:col-span-2">
            <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Template</span>
            <select value={form.templateId} onChange={(e) => updateField("templateId", e.target.value)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-navy-800 focus:outline-none">
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.label}</option>
              ))}
            </select>
            <div className="mt-2 text-xs text-gray-500">
              {templates.find((template) => template.id === form.templateId)?.description ?? ""}
            </div>
          </label>
          <label className="block text-sm text-gray-300">
            <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Badge</span>
            <input value={form.badge} onChange={(e) => updateField("badge", e.target.value)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-navy-800 focus:outline-none" />
          </label>
          <label className="block text-sm text-gray-300">
            <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Preview Text</span>
            <input value={form.previewText} onChange={(e) => updateField("previewText", e.target.value)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-navy-800 focus:outline-none" />
          </label>
        </div>

        <div className="mt-4 grid gap-4">
          <label className="block text-sm text-gray-300">
            <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Title</span>
            <input value={form.title} onChange={(e) => updateField("title", e.target.value)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-navy-800 focus:outline-none" />
          </label>
          <label className="block text-sm text-gray-300">
            <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Intro</span>
            <textarea value={form.intro} onChange={(e) => updateField("intro", e.target.value)} rows={3} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-navy-800 focus:outline-none" />
          </label>
          <label className="block text-sm text-gray-300">
            <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Body HTML</span>
            <textarea value={form.bodyHtml} onChange={(e) => updateField("bodyHtml", e.target.value)} rows={14} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 font-mono text-sm text-gray-200 focus:border-navy-800 focus:outline-none" />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-gray-300">
            <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">CTA Label</span>
            <input value={form.ctaLabel} onChange={(e) => updateField("ctaLabel", e.target.value)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-navy-800 focus:outline-none" />
          </label>
          <label className="block text-sm text-gray-300">
            <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">CTA URL</span>
            <input value={form.ctaUrl} onChange={(e) => updateField("ctaUrl", e.target.value)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-navy-800 focus:outline-none" />
          </label>
          <label className="block text-sm text-gray-300">
            <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Signature Name</span>
            <input value={form.signatureName} onChange={(e) => updateField("signatureName", e.target.value)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-navy-800 focus:outline-none" />
          </label>
          <label className="block text-sm text-gray-300">
            <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Signature Title</span>
            <input value={form.signatureTitle} onChange={(e) => updateField("signatureTitle", e.target.value)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-navy-800 focus:outline-none" />
          </label>
        </div>

        <label className="mt-4 block text-sm text-gray-300">
          <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Footer Note</span>
          <textarea value={form.footerNote} onChange={(e) => updateField("footerNote", e.target.value)} rows={3} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-navy-800 focus:outline-none" />
        </label>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={handlePreview} disabled={isPreviewing} className="rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-700 disabled:opacity-60">
            {isPreviewing ? "Rendering..." : "Render Preview"}
          </button>
          <button type="button" onClick={handleSend} disabled={isSending || !form.to.trim()} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60">
            {isSending ? "Sending..." : "Send Email"}
          </button>
        </div>

        {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}
        {message ? <div className="mt-4 text-sm text-emerald-400">{message}</div> : null}
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-sm">
        <div className="mb-3 text-sm font-medium text-gray-200">Preview</div>
        {previewHtml ? (
          <iframe title="Marketing email preview" srcDoc={previewHtml} className="h-[960px] w-full rounded-lg border border-gray-800 bg-white" />
        ) : (
          <div className="flex h-[960px] items-center justify-center rounded-lg border border-dashed border-gray-800 bg-gray-950 text-sm text-gray-500">
            Render a preview to see the email here.
          </div>
        )}
      </section>
    </div>
  );
}