"use client";

import Link from "next/link";
import { Monitor, FileText, Palette, Store, Wand2, CheckCircle2 } from "lucide-react";

const CREAM = "#f6eddd";
const OLIVE = "var(--color-surface-1)";
const SURFACE_2 = "var(--color-surface-2)";
const DARK_BG = "var(--color-background)";

const services = [
  {
    id: "websites",
    title: "Websites",
    icon: <Monitor className="h-6 w-6" />,
    tagline: "A clean online presence for your brand.",
    description: "Perfect for personal brands, creators, and anyone who needs a simple, modern home on the internet to point people to.",
    color: OLIVE,
    features: [
      "Mobile-friendly layouts",
      "Fast loading speeds",
      "Basic SEO setup",
      "Clear contact buttons",
      "Easy social media linking",
    ],
    examples: ["Personal Landing Pages", "Event Annoucements", "Link-in-bio replacements"]
  },
  {
    id: "blogs",
    title: "Blogs",
    icon: <FileText className="h-6 w-6" />,
    tagline: "Share your writing with the world.",
    description: "Easy-to-update blog systems where you can write freely. You manage the content, I make sure it looks great and reads well.",
    color: SURFACE_2,
    features: [
      "Simple content editor (CMS)",
      "Categories and tags",
      "Author bios",
      "Newsletter sign-up forms",
      "Fast reading experience",
    ],
    examples: ["Travel Blogs", "Tech Tutorials", "Recipe Sites"]
  },
  {
    id: "portfolios",
    title: "Portfolios",
    icon: <Palette className="h-6 w-6" />,
    tagline: "Showcase your best work.",
    description: "Built for visual impact. A scroll-friendly gallery that displays your photography, code, or design work beautifully on all devices.",
    color: OLIVE,
    features: [
      "High-quality image galleries",
      "Project detail pages",
      "Resume/CV integration",
      "Smooth, light animations",
      "Contact form for leads",
    ],
    examples: ["Designer Portfolios", "Photography Sites", "Freelance Developer Resumes"]
  },
  {
    id: "business",
    title: "Small Business Sites",
    icon: <Store className="h-6 w-6" />,
    tagline: "Everything a local business needs.",
    description: "Turn visitors into customers. I build sites that clearly explain your services, show where you're located, and make it easy to reach you.",
    color: SURFACE_2,
    features: [
      "Service & Pricing pages",
      "Google Maps embedding",
      "Booking links or contact forms",
      "Business hours & location",
      "Customer testimonials section",
    ],
    examples: ["Local Gyms", "Consulting Firms", "Hair Salons & Spas"]
  },
  {
    id: "custom",
    title: "Custom Features",
    icon: <Wand2 className="h-6 w-6" />,
    tagline: "When you need something a little extra.",
    description: "Have a unique idea? If you need a custom dashboard, a login system for clients, or basic AI features built in, we can make it happen.",
    color: OLIVE,
    features: [
      "Client portals / Logins",
      "Custom payment links",
      "AI chatbots & smart search",
      "Third-party API integrations",
      "Advanced animated sections",
    ],
    examples: ["Client Request Portals", "AI-assisted tools", "Internal Company Dashboards"]
  },
];

export default function DevServicesPage({ store }: { store: string }) {
  return (
    <div style={{ color: CREAM, background: DARK_BG, minHeight: "100vh" }} className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-16 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-[-6%] top-1/3 h-80 w-80 rounded-full bg-emerald-500/12 blur-3xl" />
        <div className="absolute bottom-[-10%] left-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <section className="relative px-4 py-16 text-center sm:px-6 lg:px-8" style={{ background: SURFACE_2 }}>
        <div className="mx-auto max-w-3xl">
          <div className="glass-pill inline-flex rounded-full px-4 py-2 text-sm font-semibold text-cyan-100">
            Modern websites with bold personality
          </div>
          <h1 className="mb-5 mt-5 text-4xl font-bold sm:text-5xl md:text-6xl">
            What I Create
          </h1>
          <p className="text-base opacity-80 sm:text-lg">
            Every project starts with a quick conversation. Tell me what you need — a simple site, a blog, a portfolio, or something more custom — and I&apos;ll build it to fit your goals and budget.
          </p>
        </div>
      </section>

      {/* Services List */}
      <section className="relative px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          {services.map((service, index) => (
            <div
              key={service.id}
              className="glass-panel relative flex flex-col gap-6 rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:p-10 lg:flex-row lg:items-center"
              style={{
                background:
                  index % 3 === 0
                    ? "linear-gradient(135deg, rgba(59,130,246,0.16), rgba(255,255,255,0.05))"
                    : index % 3 === 1
                      ? "linear-gradient(135deg, rgba(52,211,153,0.16), rgba(255,255,255,0.05))"
                      : "linear-gradient(135deg, rgba(167,139,250,0.16), rgba(255,255,255,0.05))",
              }}
            >
              <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-cyan-400/80 via-violet-400/45 to-transparent" />
              <div className="lg:w-1/2">
                <div className="mb-5 inline-flex rounded-xl bg-white/10 p-4">
                  {service.icon}
                </div>
                <h2 className="mb-2 text-3xl font-bold">{service.title}</h2>
                <h3 className="mb-4 text-base font-medium opacity-90 sm:text-lg">{service.tagline}</h3>
                <p className="text-base leading-relaxed opacity-80 sm:text-lg">
                  {service.description}
                </p>
              </div>

              <div className="flex flex-col gap-6 lg:w-1/2 lg:pl-6">
                <div>
                  <h4 className="mb-4 font-semibold text-white/50 uppercase tracking-wider text-sm">
                    Common Elements
                  </h4>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex gap-2 text-sm opacity-90">
                        <CheckCircle2 className="h-5 w-5 shrink-0 opacity-60" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="glass-panel rounded-2xl p-5">
                  <h4 className="mb-3 text-sm font-semibold opacity-90">Perfect for:</h4>
                  <div className="flex flex-wrap gap-2">
                    {service.examples.map((ex) => (
                      <span
                        key={ex}
                        className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 text-center sm:px-6 lg:px-8" style={{ background: SURFACE_2 }}>
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">Ready to get your website built?</h2>
          <p className="mb-7 text-base opacity-80 sm:text-lg">
            Tell me what you need and I&apos;ll send you a simple, clear quote — no pressure.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={`/${store}/quote`}
              className="btn btn-primary px-8 py-4"
            >
              Request a Free Quote
            </Link>
            <Link
              href={`/${store}/pricing`}
              className="glass-panel rounded-lg px-8 py-4 font-bold text-white transition hover:bg-white/10"
            >
              See Pricing Details
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
