import Link from "next/link";

import { DEV_ADDONS } from "@/lib/storefront/devAddons";

const DARK_BG = "#202219";
const CREAM = "#f6eddd";
const OLIVE = "#46493c";
const WARM_BROWN = "#635d4e";

const services = [
  {
    icon: "🌐",
    title: "Website Development",
    description:
      "Custom-designed, pixel-perfect websites built to your brand. From simple landing pages to multi-page marketing sites, we bring your vision to life.",
  },
  {
    icon: "⚙️",
    title: "Web App Development",
    description:
      "Full-stack web applications tailored to your workflow. User dashboards, SaaS platforms, booking systems, and more—scalable and maintainable.",
  },
  {
    icon: "📱",
    title: "Mobile App Development",
    description:
      "Cross-platform mobile apps for iOS and Android. We build apps that feel native, perform fast, and keep your users engaged.",
  },
  {
    icon: "🤖",
    title: "AI-Powered Features",
    description:
      "Integrate AI into your product—smart search, chatbots, recommendation engines, content generation, and custom LLM workflows.",
  },
];

const pricingTiers = [
  {
    name: "Starter",
    price: "$800",
    priceNote: "starting at",
    description: "Perfect for individuals and small businesses launching their first professional web presence.",
    features: [
      "Up to 5 pages",
      "Mobile responsive design",
      "Basic color palette & typography",
      "Contact form",
      "SEO metadata setup",
      "1 revision round",
    ],
    cta: "Get a Quote",
    href: "/dev/pages/quote",
    highlight: false,
  },
  {
    name: "Professional",
    price: "$2,500",
    priceNote: "starting at",
    description: "Ideal for growing brands that need a polished site with custom functionality and unique theming.",
    features: [
      "Up to 15 pages",
      "Custom theme & animations",
      "Blog or portfolio section",
      "CMS integration",
      "Analytics setup",
      "E-commerce ready (up to 50 products)",
      "2 revision rounds",
    ],
    cta: "Get a Quote",
    href: "/dev/pages/quote",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    priceNote: "tailored pricing",
    description: "For complex platforms, SaaS products, and large-scale applications with advanced requirements.",
    features: [
      "Unlimited pages",
      "Full-stack web or mobile app",
      "Custom API integrations",
      "AI feature development",
      "Performance & security audits",
      "Ongoing retainer available",
      "Dedicated project manager",
    ],
    cta: "Let's Talk",
    href: "/dev/pages/quote",
    highlight: false,
  },
];

const addOns = DEV_ADDONS;

const portfolioExamples = [
  {
    title: "Luxury Retail Brand",
    category: "E-Commerce Website",
    description:
      "A high-end fashion brand site featuring editorial photography, animated hero, product catalog, and checkout flow.",
    tags: ["Next.js", "Shopify", "Custom Theme"],
  },
  {
    title: "SaaS Dashboard",
    category: "Web Application",
    description:
      "A B2B analytics platform with real-time data visualization, user roles, CSV exports, and API integrations.",
    tags: ["React", "Node.js", "PostgreSQL"],
  },
  {
    title: "Restaurant & Booking System",
    category: "Website + Web App",
    description:
      "A local restaurant's marketing site paired with a custom reservation and table management system.",
    tags: ["Next.js", "Stripe", "Calendar API"],
  },
  {
    title: "AI Writing Assistant",
    category: "AI-Powered App",
    description:
      "A content generation tool built on OpenAI's API with custom prompting, brand voice settings, and subscription billing.",
    tags: ["React", "OpenAI", "Stripe"],
  },
];

const cardStyle: React.CSSProperties = {
  background: OLIVE,
  borderRadius: 8,
  padding: "28px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: "clamp(28px, 5vw, 42px)",
  fontWeight: 700,
  color: CREAM,
  marginBottom: 8,
};

const sectionSubStyle: React.CSSProperties = {
  color: CREAM,
  opacity: 0.75,
  maxWidth: 600,
  lineHeight: 1.7,
  marginBottom: 40,
};

const tagStyle: React.CSSProperties = {
  background: WARM_BROWN,
  color: CREAM,
  padding: "3px 10px",
  borderRadius: 100,
  fontSize: 12,
  fontWeight: 600,
};

export function DevStorefront({ store }: { store: string }) {
  return (
    <div style={{ background: DARK_BG, color: CREAM }}>
      {/* Hero */}
      <section
        className="section section--page-width"
        style={{ padding: "96px 0 72px", background: DARK_BG }}
      >
        <div>
          <p
            style={{
              fontSize: 14,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              opacity: 0.6,
              marginBottom: 16,
            }}
          >
            Jah and Co Dev
          </p>
          <h1
            style={{
              fontSize: "clamp(36px, 7vw, 72px)",
              fontWeight: 800,
              lineHeight: 1.1,
              color: CREAM,
              maxWidth: 700,
              marginBottom: 24,
            }}
          >
            Build Your{" "}
            <span style={{ borderBottom: `3px solid ${CREAM}`, paddingBottom: 2 }}>
              Digital Presence
            </span>
            .
          </h1>
          <p
            style={{
              maxWidth: 600,
              lineHeight: 1.7,
              opacity: 0.8,
              fontSize: 18,
              marginBottom: 36,
            }}
          >
            We design and build custom websites, web apps, and mobile applications for businesses of
            all sizes. From branding-forward storefronts to full-stack SaaS platforms — human-crafted,
            launch-ready.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link
              href={`/${store}/pages/quote`}
              style={{
                display: "inline-block",
                background: CREAM,
                color: DARK_BG,
                padding: "14px 32px",
                borderRadius: 4,
                fontWeight: 700,
                fontSize: 15,
                textDecoration: "none",
              }}
            >
              Get a Free Quote
            </Link>
            <Link
              href={`/${store}/pages/pricing`}
              style={{
                display: "inline-block",
                background: "transparent",
                color: CREAM,
                padding: "14px 32px",
                borderRadius: 4,
                fontWeight: 600,
                fontSize: 15,
                textDecoration: "none",
                border: `1px solid ${CREAM}`,
              }}
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section
        className="section section--page-width"
        style={{ padding: "72px 0", background: "#1a1c14" }}
      >
        <div>
          <h2 style={sectionHeadingStyle}>What We Build</h2>
          <p style={sectionSubStyle}>
            Every project starts with a conversation. Tell us what you need and we&apos;ll tailor a
            solution that fits your goals and budget.
          </p>
          <div
            style={{
              display: "grid",
              gap: 20,
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            {services.map((s) => (
              <div key={s.title} style={cardStyle}>
                <div style={{ fontSize: 32 }}>{s.icon}</div>
                <h3 style={{ color: CREAM, fontWeight: 700, fontSize: 18, margin: 0 }}>{s.title}</h3>
                <p style={{ color: CREAM, opacity: 0.75, lineHeight: 1.6, margin: 0, fontSize: 14 }}>
                  {s.description}
                </p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 36 }}>
            <Link
              href={`/${store}/pages/services`}
              style={{
                color: CREAM,
                fontWeight: 600,
                fontSize: 15,
                textDecoration: "underline",
                textUnderlineOffset: 4,
              }}
            >
              Learn more about our services →
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        className="section section--page-width"
        style={{ padding: "72px 0", background: DARK_BG }}
      >
        <div>
          <h2 style={sectionHeadingStyle}>Transparent Pricing</h2>
          <p style={sectionSubStyle}>
            No hidden fees, no surprises. Our pricing is based on project scope, page count, theming
            complexity, and any add-ons you choose.
          </p>
          <div
            style={{
              display: "grid",
              gap: 20,
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                style={{
                  ...cardStyle,
                  border: tier.highlight ? `2px solid ${CREAM}` : `2px solid transparent`,
                  position: "relative",
                }}
              >
                {tier.highlight && (
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
                <p
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    opacity: 0.6,
                    margin: 0,
                  }}
                >
                  {tier.priceNote}
                </p>
                <span style={{ fontSize: 36, fontWeight: 800, color: CREAM }}>{tier.price}</span>
                <h3 style={{ color: CREAM, fontWeight: 700, fontSize: 20, margin: 0 }}>{tier.name}</h3>
                <p
                  style={{ color: CREAM, opacity: 0.7, lineHeight: 1.6, margin: 0, fontSize: 14 }}
                >
                  {tier.description}
                </p>
                <ul style={{ margin: "8px 0 0", padding: "0 0 0 20px" }}>
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        color: CREAM,
                        opacity: 0.85,
                        fontSize: 14,
                        marginBottom: 4,
                        lineHeight: 1.5,
                      }}
                    >
                      {f}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: "auto", paddingTop: 16 }}>
                  <Link
                    href={tier.href}
                    style={{
                      display: "inline-block",
                      background: tier.highlight ? CREAM : "transparent",
                      color: tier.highlight ? DARK_BG : CREAM,
                      padding: "11px 24px",
                      borderRadius: 4,
                      fontWeight: 700,
                      fontSize: 14,
                      textDecoration: "none",
                      border: `1px solid ${CREAM}`,
                    }}
                  >
                    {tier.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 24, fontSize: 14, opacity: 0.6, lineHeight: 1.6 }}>
            * Final pricing depends on content volume, functionality requirements, and selected
            add-ons.{" "}
            <Link
              href={`/${store}/pages/pricing`}
              style={{ color: CREAM, textDecoration: "underline" }}
            >
              See full pricing breakdown →
            </Link>
          </p>
        </div>
      </section>

      {/* Add-ons */}
      <section
        className="section section--page-width"
        style={{ padding: "72px 0", background: "#1a1c14" }}
      >
        <div>
          <h2 style={sectionHeadingStyle}>Optional Add-Ons</h2>
          <p style={sectionSubStyle}>
            Extend your project with managed services to keep your site running, secure, and smart.
          </p>
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            {addOns.map((a) => (
              <div key={a.name} style={{ ...cardStyle, gap: 10 }}>
                <div style={{ fontSize: 28 }}>{a.icon}</div>
                <h3 style={{ color: CREAM, fontWeight: 700, fontSize: 16, margin: 0 }}>{a.name}</h3>
                <span style={{ fontSize: 13, color: CREAM, opacity: 0.6, fontWeight: 600 }}>
                  {a.price}
                </span>
                <p style={{ color: CREAM, opacity: 0.75, lineHeight: 1.6, margin: 0, fontSize: 13 }}>
                  {a.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section
        className="section section--page-width"
        style={{ padding: "72px 0", background: DARK_BG }}
      >
        <div>
          <h2 style={sectionHeadingStyle}>Example Projects</h2>
          <p style={sectionSubStyle}>
            A glimpse at the kind of work we deliver. Every project is custom — built to your brand
            and your users.
          </p>
          <div
            style={{
              display: "grid",
              gap: 20,
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            {portfolioExamples.map((p) => (
              <div key={p.title} style={{ ...cardStyle, background: WARM_BROWN }}>
                <p
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    opacity: 0.65,
                    margin: 0,
                  }}
                >
                  {p.category}
                </p>
                <h3 style={{ color: CREAM, fontWeight: 700, fontSize: 18, margin: 0 }}>{p.title}</h3>
                <p style={{ color: CREAM, opacity: 0.8, lineHeight: 1.6, margin: 0, fontSize: 14 }}>
                  {p.description}
                </p>
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
          <div style={{ marginTop: 36 }}>
            <Link
              href={`/${store}/pages/portfolio`}
              style={{
                color: CREAM,
                fontWeight: 600,
                fontSize: 15,
                textDecoration: "underline",
                textUnderlineOffset: 4,
              }}
            >
              View full portfolio →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="section section--page-width"
        style={{ padding: "80px 0", background: OLIVE }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(28px, 5vw, 48px)",
              fontWeight: 800,
              color: CREAM,
              maxWidth: 600,
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            Ready to bring your idea to life?
          </h2>
          <p style={{ color: CREAM, opacity: 0.8, maxWidth: 480, lineHeight: 1.7, margin: 0 }}>
            Request a free quote and we&apos;ll get back to you within one business day with a
            tailored proposal.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
            <Link
              href={`/${store}/pages/quote`}
              style={{
                display: "inline-block",
                background: CREAM,
                color: DARK_BG,
                padding: "14px 36px",
                borderRadius: 4,
                fontWeight: 700,
                fontSize: 15,
                textDecoration: "none",
              }}
            >
              Request a Quote
            </Link>
            <Link
              href={`/${store}/pages/services`}
              style={{
                display: "inline-block",
                background: "transparent",
                color: CREAM,
                padding: "14px 36px",
                borderRadius: 4,
                fontWeight: 600,
                fontSize: 15,
                textDecoration: "none",
                border: `1px solid ${CREAM}`,
              }}
            >
              Our Services
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
