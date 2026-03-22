import Link from "next/link";

const DARK_BG = "var(--color-background)";
const CREAM = "#f6eddd";
const OLIVE = "var(--color-surface-1)";
const SURFACE_2 = "var(--color-surface-2)";

const services = [
  {
    icon: "🌐",
    title: "Website Development",
    tagline: "Bespoke sites that convert",
    description:
      "We build pixel-perfect, fast-loading websites tailored to your brand identity. Every site is crafted by hand — no page-builder templates, no off-the-shelf themes. Whether you need a simple landing page or a full multi-page marketing site, we start from scratch and finish with a product that's uniquely yours.",
    features: [
      "Custom design from brand guidelines",
      "Mobile-first, responsive layouts",
      "Performance optimized (Core Web Vitals)",
      "SEO-ready structure and metadata",
      "CMS integration (Contentful, Sanity, Notion, etc.)",
      "Contact forms and lead capture",
    ],
    examples: ["Landing pages", "Portfolio sites", "Marketing sites", "Restaurant / Local business sites"],
  },
  {
    icon: "⚙️",
    title: "Web App Development",
    tagline: "Full-stack solutions that scale",
    description:
      "From internal tools to customer-facing platforms, we architect and build full-stack web applications with performance, security, and maintainability in mind. We select the right technology stack for your use case and deliver clean, documented code.",
    features: [
      "React / Next.js frontend",
      "Node.js / Python backend APIs",
      "PostgreSQL, MongoDB, or Supabase databases",
      "Authentication & authorization (OAuth, JWT)",
      "Third-party API integrations",
      "CI/CD pipeline setup",
    ],
    examples: [
      "SaaS dashboards",
      "Booking & scheduling systems",
      "E-commerce platforms",
      "Internal admin tools",
    ],
  },
  {
    icon: "📱",
    title: "Mobile App Development",
    tagline: "Native-feel apps on every device",
    description:
      "We build cross-platform mobile applications for iOS and Android using React Native. Our apps feel native, load fast, and are built to grow with your user base.",
    features: [
      "React Native (iOS + Android from one codebase)",
      "Push notifications",
      "Offline support",
      "App Store & Google Play submission",
      "Deep linking and navigation",
      "Analytics integration",
    ],
    examples: [
      "Consumer-facing apps",
      "Field service apps",
      "Loyalty & rewards apps",
      "Companion apps for web platforms",
    ],
  },
  {
    icon: "🤖",
    title: "AI Feature Development",
    tagline: "Make your product smarter",
    description:
      "We integrate AI capabilities into new or existing products. Whether you need a chatbot, intelligent search, automated content generation, or a custom LLM workflow, we scope, design, and build AI features that provide real value.",
    features: [
      "OpenAI / Anthropic / Gemini API integrations",
      "Custom prompt engineering",
      "RAG (retrieval-augmented generation) pipelines",
      "Vector search (pgvector, Pinecone)",
      "AI chatbots and assistants",
      "Content summarization and generation",
    ],
    examples: [
      "AI writing assistants",
      "Smart product recommenders",
      "Customer support bots",
      "Document Q&A tools",
    ],
  },
];

export function DevServicesPage({ store }: { store: string }) {
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
            Our Services
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
            What We Build for You
          </h1>
          <p style={{ opacity: 0.75, lineHeight: 1.7, maxWidth: 600, fontSize: 17 }}>
            Every engagement starts with understanding your goals. We then design, build, and deliver
            a solution that fits your timeline and budget.
          </p>
        </div>
      </section>

      {/* Service detail cards */}
      {services.map((s, i) => (
        <section
          key={s.title}
          className="px-4 sm:px-6 lg:px-8"
          style={{
            padding: "56px 0",
            background: i % 2 === 0 ? OLIVE : DARK_BG,
          }}
        >
          <div className="mx-auto max-w-6xl">
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 36 }}>{s.icon}</span>
              <div>
                <p
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    opacity: 0.55,
                    margin: 0,
                  }}
                >
                  {s.tagline}
                </p>
                <h2
                  style={{ color: CREAM, fontWeight: 700, fontSize: "clamp(22px, 4vw, 34px)", margin: 0 }}
                >
                  {s.title}
                </h2>
              </div>
            </div>
            <p style={{ opacity: 0.8, lineHeight: 1.75, maxWidth: 720, marginBottom: 36, fontSize: 15 }}>
              {s.description}
            </p>
            <div
              style={{
                display: "grid",
                gap: 20,
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              }}
            >
              <div className="rounded-xl border border-white/10 bg-white/5 p-8 transition hover:border-white/20 hover:bg-white/10">
                <h3
                  style={{ color: CREAM, fontWeight: 700, fontSize: 15, marginBottom: 14, marginTop: 0 }}
                >
                  What&apos;s included
                </h3>
                <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                  {s.features.map((f) => (
                    <li key={f} style={{ color: CREAM, opacity: 0.85, fontSize: 14, marginBottom: 6, lineHeight: 1.5 }}>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 p-8 transition hover:border-white/20">
                <h3
                  style={{ color: CREAM, fontWeight: 700, fontSize: 15, marginBottom: 14, marginTop: 0 }}
                >
                  Example projects
                </h3>
                <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                  {s.examples.map((e) => (
                    <li key={e} style={{ color: CREAM, opacity: 0.85, fontSize: 14, marginBottom: 6, lineHeight: 1.5 }}>
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section
        className="px-4 sm:px-6 lg:px-8"
        style={{ padding: "72px 0", background: SURFACE_2 }}
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
            Not sure which service fits your project?
          </h2>
          <p style={{ color: CREAM, opacity: 0.8, maxWidth: 500, lineHeight: 1.7, margin: 0 }}>
            Fill out a quote request and we&apos;ll help you figure out the right scope, stack, and
            budget for your idea.
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
