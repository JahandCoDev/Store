"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Handshake,
  Send,
  Shield,
  Sparkles,
} from "lucide-react";

import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { usePublicBasePath } from "@/lib/storefront/usePublicBasePath";

const CREAM = "#f6eddd";
const SURFACE_2 = "var(--color-surface-2)";
const DARK_BG = "var(--color-background)";

const projectTypes = [
  "Starter Website",
  "Portfolio / Blog",
  "Small Business Site",
  "Professional Website",
  "Custom Development",
  "Just exploring my options",
];

const budgetRanges = [
  "Under $200",
  "$200 – $500",
  "$500 – $1,000",
  "Over $1,000",
  "Not sure yet",
];

const timelineOptions = [
  "Flexible / No rush",
  "Within 2-3 days",
  "Within a few weeks",
  "Within a couple months",
];

const addOnsList = [
  "Hosting & Deployment ($10/mo)",
  "Custom Email Setup ($25)",
  "Logo / Branding ($50–$150)",
  "Extra Pages ($40 each)",
  "AI Integration (Custom)",
];

type SubmissionState = "idle" | "submitting" | "success" | "error";

export default function DevQuotePage({ store }: { store: string }) {
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get("plan") ?? "";
  const publicBasePath = usePublicBasePath(store);

  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    projectType: "",
    budgetRange: "",
    timeline: "",
    details: "",
  });

  const toggleAddon = (addon: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addon) ? prev.filter((item) => item !== addon) : [...prev, addon]
    );
  };

  const handleFieldChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmissionState("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/dev/quote-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          store,
          selectedPlan: selectedPlan || undefined,
          addOns: selectedAddons,
          ...form,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to send your request.");

      setSubmissionState("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSubmissionState("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  if (submissionState === "success") {
    return (
      <div
        className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-4 py-20 text-center"
        style={{ color: CREAM, background: DARK_BG }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-[-10%] top-10 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute right-[-10%] top-1/4 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="absolute bottom-[-10%] left-1/3 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl" />
        </div>
        <div className="glass-panel relative z-10 max-w-2xl rounded-[2rem] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <div className="mb-8 inline-flex rounded-full bg-emerald-500/12 p-6">
            <CheckCircle2 className="h-20 w-20 text-emerald-400" />
          </div>
          <h1 className="mb-4 text-4xl font-bold sm:text-5xl">Project request received</h1>
          <p className="mb-4 text-lg opacity-80">
            Thanks for reaching out. I received your project request and will follow up with clear next steps as soon as possible.
          </p>
          {selectedPlan ? (
            <p className="mb-8 text-sm uppercase tracking-[0.24em] text-cyan-100/80">
              Requested direction: {selectedPlan}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-center gap-4">
            <Link href={resolveStorefrontHref(publicBasePath, "/")} className="btn btn-secondary">
              Return Home
            </Link>
            <Link href={resolveStorefrontHref(publicBasePath, "/portfolio")} className="btn btn-primary">
              Review Demo Directions
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ color: CREAM, background: DARK_BG, minHeight: "100vh" }} className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-6%] top-8 h-72 w-72 rounded-full bg-cyan-500/12 blur-3xl" />
        <div className="absolute right-[-8%] top-1/3 h-80 w-80 rounded-full bg-emerald-500/12 blur-3xl" />
        <div className="absolute bottom-[-14%] left-1/3 h-96 w-96 rounded-full bg-violet-500/12 blur-3xl" />
      </div>

      <section className="relative px-4 py-14 text-center sm:px-6 lg:px-8" style={{ background: SURFACE_2 }}>
        <div className="mx-auto max-w-4xl">
          <div className="glass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-cyan-100">
            <Sparkles className="h-4 w-4" />
            Simple project inquiry
          </div>
          <h1 className="mb-5 mt-5 text-4xl font-bold sm:text-5xl md:text-6xl">
            Let&apos;s start your project
          </h1>
          <p className="mx-auto max-w-3xl text-base opacity-80 sm:text-lg">
            Send the basics of what you need and I&apos;ll review it, put together the right direction, and get back to you with a clear next step.
          </p>
          {selectedPlan ? (
            <div className="glass-pill mt-5 inline-flex rounded-full px-4 py-2 text-sm font-semibold text-violet-100">
              Selected direction: {selectedPlan}
            </div>
          ) : null}
        </div>
      </section>

      <section className="relative px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_360px]">
          <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {submissionState === "error" ? (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-semibold opacity-90">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleFieldChange}
                    required
                    className="w-full rounded-xl border border-white/15 bg-white/6 px-4 py-3 placeholder-white/30 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-semibold opacity-90">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={form.email}
                    onChange={handleFieldChange}
                    required
                    className="w-full rounded-xl border border-white/15 bg-white/6 px-4 py-3 placeholder-white/30 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                    placeholder="jane@example.com"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-semibold opacity-90">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleFieldChange}
                    className="w-full rounded-xl border border-white/15 bg-white/6 px-4 py-3 placeholder-white/30 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="projectType" className="text-sm font-semibold opacity-90">
                    What are you looking for? *
                  </label>
                  <div className="relative">
                    <select
                      id="projectType"
                      name="projectType"
                      value={form.projectType}
                      onChange={handleFieldChange}
                      required
                      className="w-full appearance-none rounded-xl border border-white/15 bg-white/6 px-4 py-3 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                    >
                      <option value="" disabled>
                        Select a project type
                      </option>
                      {projectTypes.map((value) => (
                        <option key={value} value={value} style={{ color: "black" }}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                  </div>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="budgetRange" className="text-sm font-semibold opacity-90">
                    Estimated Budget *
                  </label>
                  <div className="relative">
                    <select
                      id="budgetRange"
                      name="budgetRange"
                      value={form.budgetRange}
                      onChange={handleFieldChange}
                      required
                      className="w-full appearance-none rounded-xl border border-white/15 bg-white/6 px-4 py-3 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                    >
                      <option value="" disabled>
                        Select a range
                      </option>
                      {budgetRanges.map((value) => (
                        <option key={value} value={value} style={{ color: "black" }}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="timeline" className="text-sm font-semibold opacity-90">
                    Ideal Timeline *
                  </label>
                  <div className="relative">
                    <select
                      id="timeline"
                      name="timeline"
                      value={form.timeline}
                      onChange={handleFieldChange}
                      required
                      className="w-full appearance-none rounded-xl border border-white/15 bg-white/6 px-4 py-3 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                    >
                      <option value="" disabled>
                        When do you need this done?
                      </option>
                      {timelineOptions.map((value) => (
                        <option key={value} value={value} style={{ color: "black" }}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold opacity-90">
                  Optional Add-ons
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {addOnsList.map((addon) => {
                    const isSelected = selectedAddons.includes(addon);
                    return (
                      <button
                        key={addon}
                        type="button"
                        onClick={() => toggleAddon(addon)}
                        className={`rounded-full border px-4 py-2 text-sm transition-all ${
                          isSelected
                            ? "border-transparent text-[#04101d]"
                            : "border-white/15 bg-white/4 text-white hover:border-white/35"
                        }`}
                        style={isSelected ? { background: "var(--gradient-dev)" } : {}}
                      >
                        {addon}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="details" className="text-sm font-semibold opacity-90">
                  Project Details *
                </label>
                <textarea
                  id="details"
                  name="details"
                  value={form.details}
                  onChange={handleFieldChange}
                  required
                  rows={6}
                  className="w-full resize-none rounded-2xl border border-white/15 bg-white/6 px-4 py-3 placeholder-white/30 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="Tell me about your brand, the pages or features you need, and which of the demos feels closest to what you want."
                />
              </div>

              <button
                type="submit"
                disabled={submissionState === "submitting"}
                className="btn btn-primary w-full rounded-xl py-4 text-base font-bold disabled:cursor-not-allowed"
              >
                {submissionState === "submitting" ? (
                  <span className="animate-pulse">Sending Request...</span>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Send Project Request
                  </>
                )}
              </button>
              <p className="text-center text-xs opacity-60">
                Share as much or as little detail as you want. A clear overview is enough to get started.
              </p>
            </form>
          </div>

          <div className="flex flex-col gap-5">
            <div className="glass-panel relative rounded-[2rem] p-7" style={{ background: "linear-gradient(180deg, rgba(59,130,246,0.14), rgba(255,255,255,0.04))" }}>
              <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-cyan-400/80 via-violet-400/45 to-transparent" />
              <h3 className="mb-5 text-xl font-bold">What happens next</h3>
              <ul className="space-y-5">
                <li className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10">
                    <Clock className="h-5 w-5 text-cyan-300" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Quick review</h4>
                    <p className="mt-1 text-sm opacity-80">
                      I review what you send, look at the scope, and figure out the most practical next step.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <Shield className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Clear scope</h4>
                    <p className="mt-1 text-sm opacity-80">
                      I respond with a practical next step, not a vague sales pitch.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10">
                    <Handshake className="h-5 w-5 text-violet-300" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Right-sized build</h4>
                    <p className="mt-1 text-sm opacity-80">
                      We keep the scope realistic and avoid turning a small project into a bloated one.
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="glass-panel relative rounded-[2rem] p-7">
              <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-cyan-400/80 via-violet-400/45 to-transparent" />
              <h3 className="mb-2 text-lg font-bold">Need inspiration first?</h3>
              <p className="mb-6 text-sm opacity-80">
                Review the live demo directions and mention the one closest to your style in the form.
              </p>
              <div className="flex flex-col gap-3">
                <Link href={resolveStorefrontHref(publicBasePath, "/portfolio")} className="glass-panel justify-between rounded-xl px-4 py-3 font-semibold text-white inline-flex items-center">
                  Browse portfolio demos
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href={resolveStorefrontHref(publicBasePath, "/pricing")} className="glass-panel justify-between rounded-xl px-4 py-3 font-semibold text-white inline-flex items-center">
                  Review packages first
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
