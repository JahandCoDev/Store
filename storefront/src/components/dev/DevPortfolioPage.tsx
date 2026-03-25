import Link from "next/link";
import { ArrowRight, ExternalLink, LayoutTemplate, Sparkles } from "lucide-react";

import { devDemoExamples, getDevDemoHref } from "@/lib/dev/demoExamples";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { usePublicBasePath } from "@/lib/storefront/usePublicBasePath";

const CREAM = "#f6eddd";
const OLIVE = "var(--color-surface-1)";
const SURFACE_2 = "var(--color-surface-2)";
const DARK_BG = "var(--color-background)";

export default function DevPortfolioPage({ store }: { store: string }) {
  const publicBasePath = usePublicBasePath(store);

  return (
    <div style={{ color: CREAM, background: DARK_BG, minHeight: "100vh" }} className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-10 h-64 w-64 rounded-full bg-blue-500/12 blur-3xl" />
        <div className="absolute right-[-6%] top-1/3 h-72 w-72 rounded-full bg-emerald-500/9 blur-3xl" />
        <div className="absolute bottom-[-10%] left-1/3 h-84 w-84 rounded-full bg-violet-500/12 blur-3xl" />
      </div>

      <section className="relative px-4 py-16 sm:px-6 lg:px-8" style={{ background: SURFACE_2 }}>
        <div className="mx-auto max-w-5xl text-center">
          <div className="glass-pill mx-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-cyan-100">
            <LayoutTemplate className="h-4 w-4" />
            Selected project directions
          </div>
          <h1 className="mb-5 mt-5 text-4xl font-bold sm:text-5xl md:text-6xl">
            Portfolio directions
          </h1>
          <p className="mx-auto max-w-3xl text-base opacity-80 sm:text-lg">
            A few polished directions based on the examples you provided. Each one gives a different feel and structure depending on the kind of site you want to build.
          </p>
        </div>
      </section>

      <section className="relative px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          {devDemoExamples.map((project) => (
            <article key={project.slug} className="glass-panel relative rounded-[2rem] p-8 sm:p-9">
              <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-cyan-400/80 via-violet-400/45 to-transparent" />
              <div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${project.accentClassName}`}>
                  {project.category}
                </span>
                <h2 className="mt-5 text-3xl font-bold text-white sm:text-4xl">{project.title}</h2>
                <p className="mt-4 text-base leading-relaxed text-zinc-300">
                  {project.description}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {project.highlights.map((highlight) => (
                    <div key={highlight} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-zinc-200 backdrop-blur-sm">
                      {highlight}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {project.tech.map((tech) => (
                    <span key={tech} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 backdrop-blur-sm">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={getDevDemoHref(project.slug)} className="btn btn-secondary">
                  Open Demo
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
                <Link href={resolveStorefrontHref(publicBasePath, `/quote?plan=${encodeURIComponent(project.title)}`)} className="btn btn-primary">
                  Use This Direction
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="px-4 py-20 text-center sm:px-6 lg:px-8" style={{ background: OLIVE }}>
        <div className="mx-auto max-w-2xl">
          <div className="glass-pill mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white/90">
            <Sparkles className="h-4 w-4" />
            Pick a direction and customize it
          </div>
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">Like one of these directions?</h2>
          <p className="mb-7 text-base opacity-80 sm:text-lg">
            Send a quote request, mention the demo you liked, and I can shape it around your brand instead of starting from a blank screen.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={resolveStorefrontHref(publicBasePath, "/quote")} className="btn btn-primary px-8 py-4 text-base">
              Request a Free Quote
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
