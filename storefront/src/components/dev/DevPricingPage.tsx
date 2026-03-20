import Link from "next/link";

const DARK_BG = "#202219";
const CREAM = "#f6eddd";
const OLIVE = "#46493c";

const pricingFactors = [
  {
    factor: "Page Count",
    description:
      "Each additional page adds design, development, and content-placement time. Simple pages (about, contact) are faster than complex ones (product listings, dashboards).",
    tiers: ["1–5 pages: base rate", "6–15 pages: +$150–$400/page", "16+ pages: custom quote"],
  },
  {
    factor: "Theming Complexity",
    description:
      "A basic theme follows a standard layout with your logo and brand colors. A complex theme involves custom typography pairings, animations, unique layouts, and detailed visual identity work.",
    tiers: [
      "Basic: standard layout, brand colors",
      "Intermediate: custom typography, unique section layouts",
      "Advanced: motion design, custom illustrations, complex UI systems",
    ],
  },
  {
    factor: "Functionality & Use Case",
    description:
      "Static content sites require less build time than dynamic apps with user accounts, payment flows, dashboards, or real-time features.",
    tiers: [
      "Static / brochure site: base rate",
      "CMS-driven content: +$300–$800",
      "User auth & accounts: +$600–$1,500",
      "E-commerce (up to 50 SKUs): +$800–$2,000",
      "Custom app features: priced per feature",
    ],
  },
  {
    factor: "AI Features",
    description:
      "Integrating AI (chatbots, recommendation engines, content generation, smart search) requires additional architecture, API work, and ongoing model/prompt management.",
    tiers: [
      "Basic chatbot (pre-built widget): +$200–$500",
      "Custom AI assistant (GPT/Claude): +$800–$2,500",
      "RAG pipeline / document Q&A: +$1,500–$4,000",
    ],
  },
  {
    factor: "Content Volume",
    description:
      "Large volumes of existing content (blog posts, product descriptions, team bios) that need to be migrated and formatted add time to any project.",
    tiers: [
      "Up to 20 content items: included",
      "21–100 items: +$150–$400",
      "100+ items: custom quote",
    ],
  },
];

const packages = [
  {
    name: "Starter",
    price: "$800",
    priceNote: "starting at",
    best: "Individuals, freelancers, local businesses",
    includes: [
      "Up to 5 custom pages",
      "Mobile responsive design",
      "Basic color palette & typography setup",
      "Contact form",
      "SEO metadata (title, description, Open Graph)",
      "Google Analytics integration",
      "1 round of revisions",
      "2-week delivery",
    ],
    notIncluded: ["CMS", "E-commerce", "User accounts", "AI features"],
    highlight: false,
  },
  {
    name: "Professional",
    price: "$2,500",
    priceNote: "starting at",
    best: "Growing brands, agencies, content-heavy sites",
    includes: [
      "Up to 15 custom pages",
      "Custom theme with animations",
      "Blog or portfolio section",
      "CMS integration (Sanity, Contentful, etc.)",
      "E-commerce ready (up to 50 products, Stripe)",
      "Analytics & conversion tracking",
      "SEO audit & sitemap",
      "2 rounds of revisions",
      "4-week delivery",
    ],
    notIncluded: ["Mobile app", "Custom AI features", "Large-scale e-commerce"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    priceNote: "tailored to your scope",
    best: "SaaS companies, platforms, large-scale apps",
    includes: [
      "Unlimited pages & complexity",
      "Full-stack web or mobile application",
      "Custom API design & integrations",
      "AI feature development",
      "User authentication & role management",
      "Performance & security audits",
      "Dedicated project manager",
      "Ongoing retainer available",
      "Timeline agreed per project",
    ],
    notIncluded: [],
    highlight: false,
  },
];

const addOns = [
  {
    name: "Cloud Hosting & Deployment",
    oneTime: null,
    monthly: "from $25/mo",
    description:
      "Fully managed deployment and hosting on Jah and Co Dev infrastructure. Includes SSL certificate, CDN, and automated deployments from your repository.",
  },
  {
    name: "Uptime Monitoring",
    oneTime: null,
    monthly: "from $10/mo",
    description:
      "24/7 uptime checks with instant alerts via email or SMS if your site goes offline. Includes monthly uptime reports.",
  },
  {
    name: "Security Enhancements",
    oneTime: "from $150",
    monthly: "from $20/mo (maintenance)",
    description:
      "One-time security hardening: SSL setup, firewall configuration, rate limiting, header policies, and vulnerability scanning. Optional ongoing maintenance.",
  },
  {
    name: "AI Features (add-on to existing project)",
    oneTime: "from $500",
    monthly: "varies",
    description:
      "Add AI capabilities to any existing or new project. Pricing depends on complexity: basic chatbot ($500), custom LLM assistant ($800–$2,500), RAG pipeline ($1,500–$4,000).",
  },
  {
    name: "Ongoing Maintenance Retainer",
    oneTime: null,
    monthly: "from $150/mo",
    description:
      "Monthly retainer for content updates, dependency upgrades, bug fixes, and minor feature additions. Includes up to 4 hours of work per month.",
  },
];

const cardStyle: React.CSSProperties = {
  background: OLIVE,
  borderRadius: 8,
  padding: "28px 24px",
};

export function DevPricingPage({ store }: { store: string }) {
  return (
    <div style={{ background: DARK_BG, color: CREAM }}>
      {/* Header */}
      <section className="section section--page-width" style={{ padding: "72px 0 48px" }}>
        <div>
          <p
            style={{
              fontSize: 13,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              opacity: 0.55,
              marginBottom: 12,
            }}
          >
            Pricing
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
            Transparent, Competitive Pricing
          </h1>
          <p style={{ opacity: 0.75, lineHeight: 1.7, maxWidth: 640, fontSize: 16 }}>
            Our pricing is based on scope, not time-and-materials. You know what you&apos;re paying
            before we start. Below is a full breakdown of our packages, what affects the price, and
            all available add-ons.
          </p>
        </div>
      </section>

      {/* Packages */}
      <section
        className="section section--page-width"
        style={{ padding: "56px 0", background: "#1a1c14" }}
      >
        <div>
          <h2
            style={{ color: CREAM, fontWeight: 700, fontSize: "clamp(22px, 4vw, 32px)", marginBottom: 8 }}
          >
            Packages
          </h2>
          <p style={{ opacity: 0.7, lineHeight: 1.6, maxWidth: 560, marginBottom: 36, fontSize: 14 }}>
            All packages are fixed-price quotes. Final pricing is confirmed after a brief project
            scoping call.
          </p>
          <div
            style={{
              display: "grid",
              gap: 20,
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                style={{
                  ...cardStyle,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  border: pkg.highlight ? `2px solid ${CREAM}` : `2px solid transparent`,
                  position: "relative",
                }}
              >
                {pkg.highlight && (
                  <div
                    style={{
                      position: "absolute",
                      top: -14,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: CREAM,
                      color: DARK_BG,
                      padding: "3px 14px",
                      borderRadius: 100,
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Most Popular
                  </div>
                )}
                <div>
                  <p
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      opacity: 0.55,
                      margin: 0,
                    }}
                  >
                    {pkg.priceNote}
                  </p>
                  <span style={{ fontSize: 38, fontWeight: 800, color: CREAM }}>{pkg.price}</span>
                </div>
                <h3 style={{ color: CREAM, fontWeight: 700, fontSize: 20, margin: 0 }}>{pkg.name}</h3>
                <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>Best for: {pkg.best}</p>
                <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                  {pkg.includes.map((f) => (
                    <li key={f} style={{ color: CREAM, opacity: 0.85, fontSize: 13, marginBottom: 5, lineHeight: 1.5 }}>
                      {f}
                    </li>
                  ))}
                </ul>
                {pkg.notIncluded.length > 0 && (
                  <div>
                    <p style={{ fontSize: 12, opacity: 0.45, marginBottom: 6, marginTop: 8 }}>
                      Not included:
                    </p>
                    <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                      {pkg.notIncluded.map((f) => (
                        <li
                          key={f}
                          style={{ color: CREAM, opacity: 0.4, fontSize: 12, marginBottom: 4 }}
                        >
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div style={{ marginTop: "auto", paddingTop: 12 }}>
                  <Link
                    href={`/${store}/pages/quote`}
                    style={{
                      display: "inline-block",
                      background: pkg.highlight ? CREAM : "transparent",
                      color: pkg.highlight ? DARK_BG : CREAM,
                      padding: "11px 22px",
                      borderRadius: 4,
                      fontWeight: 700,
                      fontSize: 14,
                      textDecoration: "none",
                      border: `1px solid ${CREAM}`,
                    }}
                  >
                    Get a Quote
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Factors */}
      <section
        className="section section--page-width"
        style={{ padding: "56px 0", background: DARK_BG }}
      >
        <div>
          <h2
            style={{ color: CREAM, fontWeight: 700, fontSize: "clamp(22px, 4vw, 32px)", marginBottom: 8 }}
          >
            What Affects Your Price
          </h2>
          <p style={{ opacity: 0.7, lineHeight: 1.6, maxWidth: 600, marginBottom: 36, fontSize: 14 }}>
            Every project is different. Here&apos;s a breakdown of the key factors that influence
            your final quote.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {pricingFactors.map((pf) => (
              <div
                key={pf.factor}
                style={{
                  ...cardStyle,
                  display: "grid",
                  gap: 20,
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                }}
              >
                <div>
                  <h3 style={{ color: CREAM, fontWeight: 700, fontSize: 17, marginBottom: 10, marginTop: 0 }}>
                    {pf.factor}
                  </h3>
                  <p style={{ color: CREAM, opacity: 0.75, lineHeight: 1.65, fontSize: 14, margin: 0 }}>
                    {pf.description}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.5, marginBottom: 10, marginTop: 0 }}>
                    Typical impact
                  </p>
                  <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                    {pf.tiers.map((t) => (
                      <li key={t} style={{ color: CREAM, opacity: 0.8, fontSize: 13, marginBottom: 5, lineHeight: 1.5 }}>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section
        className="section section--page-width"
        style={{ padding: "56px 0", background: "#1a1c14" }}
      >
        <div>
          <h2
            style={{ color: CREAM, fontWeight: 700, fontSize: "clamp(22px, 4vw, 32px)", marginBottom: 8 }}
          >
            Optional Add-Ons
          </h2>
          <p style={{ opacity: 0.7, lineHeight: 1.6, maxWidth: 560, marginBottom: 36, fontSize: 14 }}>
            Extend any project with these managed services and enhancements.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {addOns.map((a) => (
              <div
                key={a.name}
                style={{
                  ...cardStyle,
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  alignItems: "start",
                }}
              >
                <div>
                  <h3 style={{ color: CREAM, fontWeight: 700, fontSize: 15, marginBottom: 6, marginTop: 0 }}>
                    {a.name}
                  </h3>
                  <p style={{ color: CREAM, opacity: 0.75, lineHeight: 1.6, fontSize: 13, margin: 0 }}>
                    {a.description}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {a.oneTime && (
                    <div>
                      <p style={{ fontSize: 11, opacity: 0.5, margin: "0 0 2px" }}>One-time</p>
                      <p style={{ color: CREAM, fontWeight: 700, fontSize: 15, margin: 0 }}>{a.oneTime}</p>
                    </div>
                  )}
                  {a.monthly && (
                    <div>
                      <p style={{ fontSize: 11, opacity: 0.5, margin: "0 0 2px" }}>Monthly</p>
                      <p style={{ color: CREAM, fontWeight: 700, fontSize: 15, margin: 0 }}>{a.monthly}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Market Research Note */}
      <section
        className="section section--page-width"
        style={{ padding: "56px 0", background: DARK_BG }}
      >
        <div style={{ maxWidth: 760 }}>
          <h2
            style={{ color: CREAM, fontWeight: 700, fontSize: "clamp(20px, 3.5vw, 28px)", marginBottom: 16 }}
          >
            How Our Pricing Compares
          </h2>
          <p style={{ opacity: 0.75, lineHeight: 1.75, fontSize: 14, marginBottom: 12 }}>
            Based on market research across freelance platforms, boutique agencies, and comparable web
            development firms:
          </p>
          <ul style={{ opacity: 0.75, lineHeight: 1.75, fontSize: 14, paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: CREAM }}>Freelancers</strong> typically charge $500–$5,000 for a
              5-page site, but quality, communication, and maintenance support vary widely.
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: CREAM }}>Boutique agencies</strong> charge $5,000–$30,000+ for the
              same scope, with structured process and larger teams.
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: CREAM }}>Jah and Co Dev</strong> sits in between: agency-quality
              execution at freelancer-accessible pricing, with direct communication and
              human-crafted output — no AI-generated code shipped without review.
            </li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section
        className="section section--page-width"
        style={{ padding: "72px 0", background: OLIVE }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
            Ready to get a fixed-price quote?
          </h2>
          <p style={{ color: CREAM, opacity: 0.8, maxWidth: 480, lineHeight: 1.7, margin: 0 }}>
            Fill out our quote form and we&apos;ll respond within one business day with a tailored
            proposal and timeline.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link
              href={`/${store}/pages/quote`}
              style={{
                display: "inline-block",
                background: CREAM,
                color: DARK_BG,
                padding: "13px 30px",
                borderRadius: 4,
                fontWeight: 700,
                fontSize: 15,
                textDecoration: "none",
              }}
            >
              Request a Quote
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
