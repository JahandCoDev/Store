"use client";

import Link from "next/link";
import { DollarSign, Check, X } from "lucide-react";

// Same exact color scheme constants
const CREAM = "#f6eddd";
const OLIVE = "var(--color-surface-1)";
const SURFACE_2 = "var(--color-surface-2)";
const DARK_BG = "var(--color-background)";

const packages = [
  {
    name: "Starter Website",
    price: "$150",
    tint: "linear-gradient(180deg, rgba(96,165,250,0.16), rgba(255,255,255,0.04))",
    bestFor: "Personal pages, simple landing pages, or a single-section site.",
    includes: [
      "1–2 sections",
      "Mobile-friendly",
      "Contact button or link",
      "Basic styling",
      "Delivered in 2–3 days",
    ],
    notIncluded: ["CMS/Blog capability", "Custom animations"],
  },
  {
    name: "Portfolio / Blog",
    price: "$300",
    tint: "linear-gradient(180deg, rgba(52,211,153,0.14), rgba(255,255,255,0.04))",
    bestFor: "Creators, students, freelancers, and professionals.",
    includes: [
      "Up to 4 pages (Home, About, Work, Contact)",
      "Blog OR portfolio gallery",
      "Clean, modern design",
      "SEO-ready",
      "1 revision",
    ],
    notIncluded: ["E-commerce functionality", "Advanced branding"],
  },
  {
    name: "Small Business",
    price: "$500",
    popular: true,
    tint: "linear-gradient(180deg, rgba(59,130,246,0.14), rgba(167,139,250,0.12), rgba(255,255,255,0.05))",
    bestFor: "Local businesses, services, and small brands.",
    includes: [
      "Up to 6 pages",
      "Contact form",
      "Services section",
      "Google Maps embed",
      "Basic branding",
      "2 revisions",
    ],
    notIncluded: ["User login/Client portals"],
  },
  {
    name: "Professional",
    price: "$900",
    tint: "linear-gradient(180deg, rgba(167,139,250,0.16), rgba(255,255,255,0.04))",
    bestFor: "Businesses that want a polished, branded site with content management.",
    includes: [
      "Up to 10 pages",
      "Custom theme",
      "Blog + portfolio",
      "Light animations",
      "CMS included",
      "Analytics setup",
    ],
    notIncluded: ["Native Mobile App build"],
  },
];

const addOns = [
  { name: "Hosting & Deployment", price: "$10/mo", description: "Keep your site fast, secure, and online." },
  { name: "Custom Email Setup", price: "$25", description: "Look professional with an @yourdomain.com email address." },
  { name: "Logo / Branding", price: "$50–$150", description: "A clean, modern logo and basic color palette to match your style." },
  { name: "Extra Pages", price: "$40 each", description: "Need more than a package includes? Just let me know." },
  { name: "AI Integration", price: "Custom", description: "Add smarter search, automation, or assistant features tailored to your workflow." },
];

export default function DevPricingPage({ store }: { store: string }) {
  return (
    <div style={{ color: CREAM, background: DARK_BG, minHeight: "100vh" }} className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-10 h-72 w-72 rounded-full bg-blue-500/12 blur-3xl" />
        <div className="absolute right-[-5%] top-1/4 h-80 w-80 rounded-full bg-emerald-500/12 blur-3xl" />
        <div className="absolute bottom-[-12%] left-1/3 h-96 w-96 rounded-full bg-violet-500/12 blur-3xl" />
      </div>

      <section className="relative px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="glass-pill mx-auto mb-5 inline-flex rounded-full px-4 py-2 text-sm font-semibold text-cyan-100">
            Packages with colorful accents
          </div>
          <DollarSign className="mx-auto mb-6 h-12 w-12 opacity-80" />
          <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            Simple, Transparent Pricing
          </h1>
          <p style={{ fontSize: "clamp(16px, 2vw, 20px)", opacity: 0.8, lineHeight: 1.6 }}>
            Here is a pricing structure that keeps things straightforward. No complicated jargon, no bloated pricing — just high-quality work built with care to fit your budget.
          </p>
        </div>
      </section>

      {/* Packages Grid */}
      <section className="relative px-4 py-12 sm:px-6 lg:px-8" style={{ background: SURFACE_2 }}>
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                className="glass-panel relative flex flex-col rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1"
                style={{ background: pkg.tint, transform: pkg.popular ? "scale(1.03)" : undefined }}
              >
                <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-cyan-400/80 via-violet-400/45 to-transparent" />
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-sm font-bold text-black">
                    Most Popular
                  </div>
                )}
                <div className="mb-2 text-xl font-bold">{pkg.name}</div>
                <div className="mb-4 flex items-baseline gap-2">
                  <span className="text-4xl font-black">{pkg.price}</span>
                </div>
                <div className="mb-6 h-px w-full bg-white/10" />
                <p className="mb-6 text-sm opacity-80">{pkg.bestFor}</p>

                <div className="mb-8 flex-grow">
                  <div className="mb-3 text-sm font-semibold opacity-90">What&apos;s Included:</div>
                  <ul className="space-y-3">
                    {pkg.includes.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
                        <span className="opacity-90">{item}</span>
                      </li>
                    ))}
                    {pkg.notIncluded.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm opacity-40">
                        <X className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={`/${store}/quote?plan=${encodeURIComponent(pkg.name)}`}
                  className={`flex w-full items-center justify-center rounded-lg py-3 text-sm font-semibold transition ${
                    pkg.popular
                      ? "bg-white text-black hover:bg-white/90"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  Choose {pkg.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-center text-3xl font-bold">Optional Add-Ons</h2>
          <p className="mb-10 text-center opacity-80">
            Extend your project with a few extras. Just let me know what you need.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {addOns.map((addon) => (
              <div
                key={addon.name}
                className="glass-panel relative flex flex-col justify-between gap-4 rounded-xl p-6"
              >
                <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-cyan-400/80 via-violet-400/45 to-transparent" />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold">{addon.name}</h3>
                    <span className="rounded bg-white/10 px-2 py-1 text-sm font-mono font-medium">
                      {addon.price}
                    </span>
                  </div>
                  <p className="text-sm opacity-80">{addon.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 text-center sm:px-6 lg:px-8" style={{ background: OLIVE }}>
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">Ready to get your website built?</h2>
          <p className="mb-7 text-base opacity-80 sm:text-lg">
            Tell me what you need and I'll send you a simple, clear quote — no pressure, no upselling.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={`/${store}/quote`}
              className="btn btn-primary px-8 py-4"
            >
              Request a Free Quote
            </Link>
            <Link
              href={`/${store}/portfolio`}
              className="glass-panel rounded-lg px-8 py-4 font-bold text-white transition hover:bg-white/10"
            >
              See Example Work
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
