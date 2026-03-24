export type DevDemoExample = {
  slug: "portfolio" | "business" | "blog" | "custom";
  title: string;
  category: string;
  description: string;
  highlights: string[];
  tech: string[];
  accentClassName: string;
  panelClassName: string;
};

export const devDemoExamples: DevDemoExample[] = [
  {
    slug: "portfolio",
    title: "Designer Showcase",
    category: "Portfolio Demo",
    description:
      "A scroll-led portfolio with project storytelling, gallery sections, and a contact flow that feels polished instead of templated.",
    highlights: ["Project storytelling", "Smooth gallery flow", "Lead capture section"],
    tech: ["Next.js", "Tailwind", "Motion"],
    accentClassName: "bg-blue-500/15 text-blue-200 ring-1 ring-blue-400/30",
    panelClassName: "from-blue-500/20 via-cyan-500/10 to-transparent",
  },
  {
    slug: "business",
    title: "Local Service Business",
    category: "Small Business Demo",
    description:
      "A service-business site with a practical information hierarchy: trust up top, services in the middle, and quote conversion throughout.",
    highlights: ["Trust-building hero", "Service overview", "Quote-focused CTA"],
    tech: ["React", "Responsive UI", "Forms"],
    accentClassName: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30",
    panelClassName: "from-emerald-500/20 via-teal-500/10 to-transparent",
  },
  {
    slug: "blog",
    title: "Minimal Writing Hub",
    category: "Blog Demo",
    description:
      "A content-forward layout built for readable long-form posts, categories, and newsletter growth without feeling bloated.",
    highlights: ["Editorial layout", "Topic discovery", "Newsletter section"],
    tech: ["Next.js", "Content UI", "SEO"],
    accentClassName: "bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/30",
    panelClassName: "from-violet-500/20 via-fuchsia-500/10 to-transparent",
  },
  {
    slug: "custom",
    title: "Ops Dashboard",
    category: "Custom App Demo",
    description:
      "A denser application-style interface showing how internal tooling, dashboards, and operational views can be designed cleanly.",
    highlights: ["Dense data UI", "System views", "App-style navigation"],
    tech: ["Next.js", "Prisma", "Dashboards"],
    accentClassName: "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/30",
    panelClassName: "from-cyan-500/20 via-indigo-500/10 to-transparent",
  },
];

export function getDevDemoHref(slug: DevDemoExample["slug"]) {
  return `/examples/${slug}`;
}