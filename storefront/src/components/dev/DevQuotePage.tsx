"use client";

import { useState } from "react";

import { DEV_ADDONS } from "@/lib/storefront/devAddons";

const DARK_BG = "var(--color-background)";
const CREAM = "#f6eddd";
const OLIVE = "var(--color-surface-1)";
const SURFACE_2 = "var(--color-surface-2)";

const SERVICE_OPTIONS = [
  "Website Development",
  "Web App Development",
  "Mobile App Development",
  "AI Feature Development",
  "Not sure yet",
];

const BUDGET_OPTIONS = [
  "Under $1,000",
  "$1,000 – $3,000",
  "$3,000 – $7,500",
  "$7,500 – $20,000",
  "$20,000+",
  "Flexible / Let's discuss",
];

const TIMELINE_OPTIONS = [
  "As soon as possible",
  "Within 1 month",
  "1–3 months",
  "3–6 months",
  "No hard deadline",
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(246,237,221,0.08)",
  border: "1px solid rgba(246,237,221,0.25)",
  borderRadius: 6,
  padding: "12px 14px",
  color: CREAM,
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: CREAM,
  opacity: 0.75,
  marginBottom: 8,
  letterSpacing: "0.03em",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

export function DevQuotePage({ store }: { store: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    service: "",
    budget: "",
    timeline: "",
    description: "",
    addOns: [] as string[],
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleAddOnToggle(addon: string) {
    setFormData((prev) => ({
      ...prev,
      addOns: prev.addOns.includes(addon)
        ? prev.addOns.filter((a) => a !== addon)
        : [...prev.addOns, addon],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // In production, this would POST to an API route or third-party form service.
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="animate-fade-in" style={{ background: DARK_BG, color: CREAM, minHeight: "60vh" }}>
        <section className="px-4 sm:px-6 lg:px-8" style={{ padding: "96px 0" }}>
          <div className="mx-auto max-w-6xl" style={{ maxWidth: 540 }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
            <h1
              style={{
                fontSize: "clamp(28px, 5vw, 44px)",
                fontWeight: 800,
                color: CREAM,
                lineHeight: 1.1,
                marginBottom: 16,
              }}
            >
              Quote request received!
            </h1>
            <p style={{ opacity: 0.8, lineHeight: 1.7, fontSize: 16, marginBottom: 24 }}>
              Thanks for reaching out. We&apos;ll review your project details and get back to you
              within <strong style={{ color: CREAM }}>one business day</strong> with a tailored
              proposal.
            </p>
            <p style={{ opacity: 0.6, fontSize: 14, lineHeight: 1.6 }}>
              In the meantime, feel free to browse our{" "}
              <a href={`/${store}/pages/portfolio`} style={{ color: CREAM, textDecoration: "underline" }}>
                portfolio
              </a>{" "}
              or review our{" "}
              <a href={`/${store}/pages/pricing`} style={{ color: CREAM, textDecoration: "underline" }}>
                pricing guide
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ background: DARK_BG, color: CREAM }}>
      {/* Header */}
      <section className="px-4 sm:px-6 lg:px-8" style={{ padding: "72px 0 48px" }}>
        <div className="mx-auto max-w-6xl">
          <p
            style={{
              fontSize: 13,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              opacity: 0.55,
              marginBottom: 12,
            }}
          >
            Get Started
          </p>
          <h1
            style={{
              fontSize: "clamp(32px, 6vw, 52px)",
              fontWeight: 800,
              color: CREAM,
              lineHeight: 1.1,
              maxWidth: 620,
              marginBottom: 20,
            }}
          >
            Request a Free Quote
          </h1>
          <p style={{ opacity: 0.75, lineHeight: 1.7, maxWidth: 580, fontSize: 16 }}>
            Fill out the form below and we&apos;ll respond within one business day with a tailored
            proposal, timeline, and fixed-price quote for your project.
          </p>
        </div>
      </section>

      {/* Form */}
      <section
        className="px-4 sm:px-6 lg:px-8"
        style={{ padding: "0 0 80px", background: SURFACE_2 }}
      >
        <div className="mx-auto max-w-6xl" style={{ maxWidth: 680 }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Name + Email */}
            <div
              style={{
                display: "grid",
                gap: 20,
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              }}
            >
              <div style={fieldStyle}>
                <label htmlFor="name" style={labelStyle}>
                  Full Name <span style={{ color: CREAM }}>*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Jane Smith"
                  style={inputStyle}
                />
              </div>
              <div style={fieldStyle}>
                <label htmlFor="email" style={labelStyle}>
                  Email Address <span style={{ color: CREAM }}>*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="jane@company.com"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Company */}
            <div style={fieldStyle}>
              <label htmlFor="company" style={labelStyle}>
                Company / Organization
              </label>
              <input
                id="company"
                name="company"
                type="text"
                value={formData.company}
                onChange={handleChange}
                placeholder="Acme Corp (optional)"
                style={inputStyle}
              />
            </div>

            {/* Service */}
            <div style={fieldStyle}>
              <label htmlFor="service" style={labelStyle}>
                What type of project do you need? <span style={{ color: CREAM }}>*</span>
              </label>
              <select
                id="service"
                name="service"
                required
                value={formData.service}
                onChange={handleChange}
                style={{ ...inputStyle, appearance: "auto" }}
              >
                <option value="" disabled>
                  Select a service…
                </option>
                {SERVICE_OPTIONS.map((o) => (
                  <option key={o} value={o} style={{ background: DARK_BG, color: CREAM }}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            {/* Budget */}
            <div style={fieldStyle}>
              <label htmlFor="budget" style={labelStyle}>
                Budget Range <span style={{ color: CREAM }}>*</span>
              </label>
              <select
                id="budget"
                name="budget"
                required
                value={formData.budget}
                onChange={handleChange}
                style={{ ...inputStyle, appearance: "auto" }}
              >
                <option value="" disabled>
                  Select a budget range…
                </option>
                {BUDGET_OPTIONS.map((o) => (
                  <option key={o} value={o} style={{ background: DARK_BG, color: CREAM }}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            {/* Timeline */}
            <div style={fieldStyle}>
              <label htmlFor="timeline" style={labelStyle}>
                Desired Timeline <span style={{ color: CREAM }}>*</span>
              </label>
              <select
                id="timeline"
                name="timeline"
                required
                value={formData.timeline}
                onChange={handleChange}
                style={{ ...inputStyle, appearance: "auto" }}
              >
                <option value="" disabled>
                  Select a timeline…
                </option>
                {TIMELINE_OPTIONS.map((o) => (
                  <option key={o} value={o} style={{ background: DARK_BG, color: CREAM }}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            {/* Add-ons */}
            <div style={fieldStyle}>
              <p style={{ ...labelStyle, marginBottom: 12 }}>
                Are you interested in any optional add-ons?
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {DEV_ADDONS.map(({ name }) => {
                  const active = formData.addOns.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleAddOnToggle(name)}
                      style={{
                        background: active ? CREAM : "transparent",
                        color: active ? DARK_BG : CREAM,
                        border: `1px solid ${active ? CREAM : "rgba(246,237,221,0.35)"}`,
                        borderRadius: 100,
                        padding: "7px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div style={fieldStyle}>
              <label htmlFor="description" style={labelStyle}>
                Project Description <span style={{ color: CREAM }}>*</span>
              </label>
              <textarea
                id="description"
                name="description"
                required
                value={formData.description}
                onChange={handleChange}
                rows={6}
                placeholder="Tell us about your project — what does it do, who is it for, what pages or features do you need, do you have existing branding, etc."
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
              />
            </div>

            {/* Submit */}
            <div>
              <button
                type="submit"
                className="btn btn-primary"
              >
                Submit Quote Request
              </button>
              <p style={{ marginTop: 12, fontSize: 13, opacity: 0.5, lineHeight: 1.5 }}>
                We respond within one business day. No commitment required.
              </p>
            </div>
          </form>
        </div>
      </section>

      {/* Trust bar */}
      <section
        className="px-4 sm:px-6 lg:px-8"
        style={{ padding: "48px 0", background: OLIVE }}
      >
        <div
          className="mx-auto max-w-6xl"
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          {[
            { icon: "💬", label: "Response within 1 business day" },
            { icon: "📋", label: "Fixed-price proposals — no surprise bills" },
            { icon: "🤝", label: "No commitment until you approve the proposal" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <p style={{ color: CREAM, fontSize: 14, lineHeight: 1.5, margin: 0, opacity: 0.85 }}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
