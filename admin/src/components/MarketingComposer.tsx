"use client";

import { useMemo, useState } from "react";

import type { ManualEmailSection } from "@/lib/email/manualEmailMailer";

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
  footerNote: string;
  signatureName: string;
  signatureTitle: string;
};

function createSection(type: ManualEmailSection["type"]): ManualEmailSection {
  const id = `${type}-${Math.random().toString(36).slice(2, 9)}`;

  switch (type) {
    case "heading":
      return { id, type, content: "Section heading", align: "left" };
    case "text":
      return { id, type, content: "Add your message here." };
    case "divider":
      return { id, type };
    case "spacer":
      return { id, type, size: 24 };
    case "button":
      return { id, type, label: "Call to action", url: "https://jahandco.net/dev", align: "left" };
  }
}

const INITIAL_SECTIONS: ManualEmailSection[] = [
  { id: "heading-1", type: "heading", content: "Thanks for reaching out", align: "left" },
  {
    id: "text-1",
    type: "text",
    content: "I wanted to send over a cleaner follow-up with the next steps and the direction I recommend for your project.",
  },
  { id: "divider-1", type: "divider" },
  {
    id: "text-2",
    type: "text",
    content: "Reply to this email if you want me to turn this into a formal quote or scope the work in more detail.",
  },
  { id: "button-1", type: "button", label: "View Examples", url: "https://jahandco.net/dev", align: "left" },
];

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
    footerNote: "Reply directly to this email if you want to continue the conversation.",
    signatureName: "Jah",
    signatureTitle: "JahandCo",
  });
  const [sections, setSections] = useState<ManualEmailSection[]>(INITIAL_SECTIONS);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(INITIAL_SECTIONS[0]?.id ?? "");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? sections[0] ?? null,
    [sections, selectedSectionId]
  );

  function updateSection(sectionId: string, updater: (section: ManualEmailSection) => ManualEmailSection) {
    setSections((current) => current.map((section) => (section.id === sectionId ? updater(section) : section)));
  }

  function addSection(type: ManualEmailSection["type"]) {
    const section = createSection(type);
    setSections((current) => [...current, section]);
    setSelectedSectionId(section.id);
  }

  function removeSection(sectionId: string) {
    setSections((current) => {
      const nextSections = current.filter((section) => section.id !== sectionId);
      setSelectedSectionId((currentSelected) => {
        if (currentSelected !== sectionId) return currentSelected;
        return nextSections[0]?.id ?? "";
      });
      return nextSections;
    });
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    setSections((current) => {
      const index = current.findIndex((section) => section.id === sectionId);
      if (index < 0) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const nextSections = [...current];
      const [section] = nextSections.splice(index, 1);
      nextSections.splice(nextIndex, 0, section);
      return nextSections;
    });
  }

  async function handleSend() {
    setIsSending(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", ...form, sections }),
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
    <div className="grid gap-6 xl:grid-cols-[minmax(360px,460px)_minmax(0,1fr)]">
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-sm xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Marketing Email Composer</h1>
          <p className="mt-1 text-sm text-gray-400">Compose section-based branded emails, edit text directly in the preview, and send from the admin panel.</p>
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
        </div>

        <div className="mt-6 rounded-xl border border-gray-800 bg-gray-950/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-gray-200">Sections</div>
              <p className="mt-1 text-xs text-gray-500">Add, order, and configure reusable content blocks.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ToolbarButton label="Heading" onClick={() => addSection("heading")} />
              <ToolbarButton label="Text" onClick={() => addSection("text")} />
              <ToolbarButton label="Line" onClick={() => addSection("divider")} />
              <ToolbarButton label="Spacer" onClick={() => addSection("spacer")} />
              <ToolbarButton label="Button" onClick={() => addSection("button")} />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {sections.map((section, index) => {
              const isSelected = selectedSection?.id === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSelectedSectionId(section.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left transition ${
                    isSelected
                      ? "border-navy-700 bg-navy-900/20"
                      : "border-gray-800 bg-gray-900/60 hover:border-gray-700"
                  }`}
                >
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-gray-500">{section.type}</div>
                    <div className="mt-1 text-sm font-medium text-gray-100">
                      {section.type === "heading" || section.type === "text"
                        ? section.content || "Untitled section"
                        : section.type === "button"
                          ? section.label || "Button"
                          : section.type === "spacer"
                            ? `Spacer ${section.size}px`
                            : "Divider"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={(event) => { event.stopPropagation(); moveSection(section.id, -1); }} className="rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800">↑</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); moveSection(section.id, 1); }} className="rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800">↓</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); removeSection(section.id); }} className="rounded-md border border-red-800/50 px-2 py-1 text-xs text-red-300 hover:bg-red-900/20">×</button>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedSection ? (
            <div className="mt-4 rounded-lg border border-gray-800 bg-gray-900/70 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Selected section</div>
              <div className="mt-3 grid gap-3">
                {(selectedSection.type === "heading" || selectedSection.type === "text") ? (
                  <label className="text-sm text-gray-300">
                    <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Content</span>
                    <textarea
                      value={selectedSection.content}
                      onChange={(event) => updateSection(selectedSection.id, (section) => ({ ...section, content: event.target.value } as ManualEmailSection))}
                      rows={selectedSection.type === "heading" ? 2 : 6}
                      className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-navy-800 focus:outline-none"
                    />
                  </label>
                ) : null}

                {(selectedSection.type === "heading" || selectedSection.type === "button") ? (
                  <label className="text-sm text-gray-300">
                    <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Alignment</span>
                    <select
                      value={selectedSection.align ?? "left"}
                      onChange={(event) => updateSection(selectedSection.id, (section) => ({ ...section, align: event.target.value === "center" ? "center" : "left" } as ManualEmailSection))}
                      className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-navy-800 focus:outline-none"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                    </select>
                  </label>
                ) : null}

                {selectedSection.type === "spacer" ? (
                  <label className="text-sm text-gray-300">
                    <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Spacer size</span>
                    <input
                      type="range"
                      min={8}
                      max={120}
                      value={selectedSection.size}
                      onChange={(event) => updateSection(selectedSection.id, (section) => ({ ...section, size: Number(event.target.value) } as ManualEmailSection))}
                      className="w-full"
                    />
                    <div className="mt-1 text-xs text-gray-500">{selectedSection.size}px</div>
                  </label>
                ) : null}

                {selectedSection.type === "button" ? (
                  <>
                    <label className="text-sm text-gray-300">
                      <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Label</span>
                      <input
                        value={selectedSection.label}
                        onChange={(event) => updateSection(selectedSection.id, (section) => ({ ...section, label: event.target.value } as ManualEmailSection))}
                        className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-navy-800 focus:outline-none"
                      />
                    </label>
                    <label className="text-sm text-gray-300">
                      <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">URL</span>
                      <input
                        value={selectedSection.url}
                        onChange={(event) => updateSection(selectedSection.id, (section) => ({ ...section, url: event.target.value } as ManualEmailSection))}
                        className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-navy-800 focus:outline-none"
                      />
                    </label>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
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
          <button type="button" onClick={handleSend} disabled={isSending || !form.to.trim()} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60">
            {isSending ? "Sending..." : "Send Email"}
          </button>
        </div>

        {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}
        {message ? <div className="mt-4 text-sm text-emerald-400">{message}</div> : null}
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-gray-200">Live Preview</div>
            <p className="mt-1 text-xs text-gray-500">Click a section below to edit its content directly in the preview.</p>
          </div>
        </div>

        <div className={`rounded-[28px] border p-6 ${form.templateId === "dev-store" ? "border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.22),transparent_28%),linear-gradient(180deg,#050b16_0%,#0b1730_100%)] text-slate-100" : "border-slate-200 bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_100%)] text-slate-900"}`}>
          <div className={`rounded-[24px] border ${form.templateId === "dev-store" ? "border-slate-700/50 bg-slate-950/60" : "border-slate-200 bg-white"}`}>
            <div className={`border-b px-8 py-7 ${form.templateId === "dev-store" ? "border-slate-800/60" : "border-slate-200"}`}>
              <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${form.templateId === "dev-store" ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100" : "border-sky-200 bg-sky-100 text-slate-900"}`}>
                {form.badge || "JahandCo"}
              </div>
              <h2 className="mt-5 text-[32px] font-semibold leading-tight">{form.title || "A quick follow-up from JahandCo"}</h2>
              {form.intro ? <p className={`mt-3 max-w-2xl text-sm leading-7 ${form.templateId === "dev-store" ? "text-slate-300" : "text-slate-600"}`}>{form.intro}</p> : null}
            </div>

            <div className="space-y-[18px] px-8 py-8">
              {sections.map((section) => {
                const isSelected = section.id === selectedSection?.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setSelectedSectionId(section.id)}
                    className={`block w-full rounded-2xl border px-4 py-3 text-left transition ${isSelected ? "border-navy-700/70 ring-2 ring-navy-800/30" : form.templateId === "dev-store" ? "border-slate-800/60 hover:border-slate-700" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    <PreviewSection
                      section={section}
                      dark={form.templateId === "dev-store"}
                      onChange={(nextValue) => {
                        if (section.type === "heading" || section.type === "text") {
                          updateSection(section.id, (current) => ({ ...current, content: nextValue } as ManualEmailSection));
                        } else if (section.type === "button") {
                          updateSection(section.id, (current) => ({ ...current, label: nextValue } as ManualEmailSection));
                        }
                      }}
                    />
                  </button>
                );
              })}
            </div>

            <div className={`border-t px-8 py-6 ${form.templateId === "dev-store" ? "border-slate-800/60 bg-slate-950/30" : "border-slate-200 bg-slate-50"}`}>
              <div className={`text-sm leading-7 ${form.templateId === "dev-store" ? "text-slate-300" : "text-slate-600"}`}>{form.footerNote}</div>
              <div className="mt-5 text-sm">
                <div className="font-semibold">{form.signatureName}</div>
                <div className={form.templateId === "dev-store" ? "text-slate-400" : "text-slate-500"}>{form.signatureTitle}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ToolbarButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-800">
      {label}
    </button>
  );
}

function PreviewSection({
  section,
  dark,
  onChange,
}: {
  section: ManualEmailSection;
  dark: boolean;
  onChange: (value: string) => void;
}) {
  const baseTextColor = dark ? "text-slate-100" : "text-slate-900";
  const mutedTextColor = dark ? "text-slate-300" : "text-slate-700";

  if (section.type === "heading") {
    return (
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={(event) => onChange(event.currentTarget.textContent ?? "")}
        className={`text-[28px] font-semibold leading-tight outline-none ${baseTextColor} ${section.align === "center" ? "text-center" : "text-left"}`}
      >
        {section.content}
      </div>
    );
  }

  if (section.type === "text") {
    return (
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={(event) => onChange(event.currentTarget.textContent ?? "")}
        className={`whitespace-pre-wrap text-sm leading-7 outline-none ${mutedTextColor}`}
      >
        {section.content}
      </div>
    );
  }

  if (section.type === "divider") {
    return <div className={`h-px w-full ${dark ? "bg-slate-700" : "bg-slate-200"}`} />;
  }

  if (section.type === "spacer") {
    return <div style={{ height: `${section.size}px` }} className="w-full" />;
  }

  return (
    <div className={section.align === "center" ? "text-center" : "text-left"}>
      <span
        contentEditable
        suppressContentEditableWarning
        onBlur={(event) => onChange(event.currentTarget.textContent ?? "")}
        className="inline-flex rounded-[14px] bg-[linear-gradient(135deg,rgba(96,165,250,0.96),rgba(52,211,153,0.96)_55%,rgba(167,139,250,0.96))] px-5 py-3 text-sm font-semibold text-white outline-none"
      >
        {section.label}
      </span>
      <div className={`mt-2 text-xs ${dark ? "text-slate-500" : "text-slate-500"}`}>{section.url}</div>
    </div>
  );
}