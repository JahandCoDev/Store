import Link from "next/link";

const DARK_BG = "var(--color-background)";
const CREAM = "#f6eddd";
const OLIVE = "var(--color-surface-1)";
const SURFACE_2 = "var(--color-surface-2)";
const WARM_BROWN = "var(--color-surface-3)";

const tagStyle: React.CSSProperties = {
  background: WARM_BROWN,
  color: CREAM,
  padding: "3px 10px",
  borderRadius: 100,
  fontSize: 12,
  fontWeight: 600,
};

const portfolioProjects = [
  {
    category: "E-Commerce Website",
    title: "Luxury Retail Brand",
    description:
      "A high-end fashion retailer needed a website that matched their premium positioning. We built a bespoke Next.js site featuring editorial-style photography, smooth scroll animations, a full product catalog with filtering and variant selection, and a streamlined Stripe checkout — all under a dark, sophisticated color palette.",
    tags: ["Next.js", "Shopify", "Custom Theme", "Stripe"],
    highlights: ["Custom hero with parallax imagery", "Mobile-first product grid", "Shopify storefront API", "Under 2s load time on mobile"],
    type: "Website",
  },
  {
    category: "Web Application",
    title: "SaaS Analytics Dashboard",
    description:
      "A B2B SaaS startup needed a fully featured analytics dashboard for their clients. We designed and built a React frontend with real-time data visualization (charts, tables, KPI tiles), multi-tenant user roles, CSV export functionality, and a Node.js backend connecting to their existing PostgreSQL data warehouse.",
    tags: ["React", "Node.js", "PostgreSQL", "Chart.js"],
    highlights: ["Multi-tenant role system", "Real-time chart updates via WebSocket", "CSV and PDF export", "Dark/light mode"],
    type: "Web App",
  },
  {
    category: "Website + Web App",
    title: "Restaurant & Reservation System",
    description:
      "A popular local restaurant needed both a beautiful marketing site and a custom reservation and table management system to replace their third-party booking tool. We built a Next.js site that doubles as a customer-facing booking interface, backed by a custom admin panel for the restaurant team.",
    tags: ["Next.js", "Stripe", "Calendar API", "Admin Panel"],
    highlights: ["Customer booking flow", "Staff admin for managing reservations", "Menu CMS integration", "Email confirmation with Resend"],
    type: "Website + App",
  },
  {
    category: "AI-Powered App",
    title: "AI Brand Copywriting Tool",
    description:
      "A marketing agency wanted to accelerate content production for their clients. We built a custom AI writing assistant using the Anthropic Claude API, with a brand voice onboarding flow, prompt template library, tone controls, and team collaboration features — delivered as a subscription SaaS with Stripe billing.",
    tags: ["React", "Anthropic Claude", "Stripe", "Supabase"],
    highlights: ["Brand voice training flow", "Prompt template library", "Subscription billing", "Team collaboration & history"],
    type: "AI App",
  },
  {
    category: "Mobile Application",
    title: "Field Service Companion App",
    description:
      "A property management company needed a mobile app for their field technicians to log job completions, capture photo evidence, and sync data back to their web platform. Built with React Native for iOS and Android, the app works offline and syncs automatically when connectivity is restored.",
    tags: ["React Native", "iOS", "Android", "Offline Sync"],
    highlights: ["Offline-first architecture", "Photo capture & annotation", "Real-time sync with web platform", "Push notifications"],
    type: "Mobile App",
  },
  {
    category: "Portfolio Website",
    title: "Creative Agency Portfolio",
    description:
      "A design agency wanted a portfolio site that was itself a demonstration of their capabilities. We built a visually dynamic Next.js site with page transitions, custom cursor effects, a project case study CMS, and a contact flow — acting as both a brochure and a live proof of craft.",
    tags: ["Next.js", "Framer Motion", "Sanity CMS"],
    highlights: ["Animated page transitions", "Project case study CMS", "Custom cursor & hover effects", "Contact form with email routing"],
    type: "Website",
  },
];

export function DevPortfolioPage({ store }: { store: string }) {
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
            Portfolio
          </p>
          <h1
            style={{
              fontSize: "clamp(32px, 6vw, 56px)",
              fontWeight: 800,
              color: CREAM,
              lineHeight: 1.1,
              maxWidth: 680,
              marginBottom: 20,
            }}
          >
            Example Projects & Showcases
          </h1>
          <p style={{ opacity: 0.75, lineHeight: 1.7, maxWidth: 620, fontSize: 16 }}>
            Every project below represents the quality, craft, and type of work we deliver.
            All projects are custom-built — no templates, no shortcuts.
          </p>
        </div>
      </section>

      {/* Projects */}
      <section
        className="px-4 sm:px-6 lg:px-8"
        style={{ padding: "48px 0 72px", background: SURFACE_2 }}
      >
        <div
          className="mx-auto max-w-6xl"
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          }}
        >
          {portfolioProjects.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-white/10 bg-white/5 p-7 flex flex-col gap-3.5 transition hover:border-white/20 hover:bg-white/10"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <p
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    opacity: 0.55,
                    margin: 0,
                  }}
                >
                  {p.category}
                </p>
                <span
                  style={{
                    fontSize: 11,
                    background: "var(--color-surface-3)",
                    color: CREAM,
                    padding: "2px 10px",
                    borderRadius: 100,
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.type}
                </span>
              </div>
              <h2 style={{ color: CREAM, fontWeight: 700, fontSize: 20, margin: 0 }}>{p.title}</h2>
              <p style={{ color: CREAM, opacity: 0.8, lineHeight: 1.65, fontSize: 14, margin: 0 }}>
                {p.description}
              </p>
              <div>
                <p
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    opacity: 0.5,
                    marginBottom: 8,
                    marginTop: 4,
                  }}
                >
                  Key highlights
                </p>
                <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
                  {p.highlights.map((h) => (
                    <li key={h} style={{ color: CREAM, opacity: 0.8, fontSize: 13, marginBottom: 4, lineHeight: 1.5 }}>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                {p.tags.map((t) => (
                  <span key={t} style={tagStyle}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        className="px-4 sm:px-6 lg:px-8"
        style={{ padding: "72px 0", background: OLIVE }}
      >
        <div className="mx-auto max-w-6xl" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <h2
            style={{
              color: CREAM,
              fontWeight: 800,
              fontSize: "clamp(26px, 4vw, 40px)",
              maxWidth: 560,
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Want something like this built for you?
          </h2>
          <p style={{ color: CREAM, opacity: 0.8, maxWidth: 500, lineHeight: 1.7, margin: 0 }}>
            Tell us about your project and we&apos;ll put together a proposal tailored to your goals
            and budget.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link
              href={`/${store}/pages/quote`}
              className="btn btn-primary"
            >
              Request a Quote
            </Link>
            <Link
              href={`/${store}/pages/pricing`}
              className="btn btn-secondary"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
