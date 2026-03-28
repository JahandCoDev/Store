import Link from "next/link";
import { ArrowRight, Factory, Layers3, NotebookPen, Sparkles } from "lucide-react";

import { resolveStorefrontHref } from "@/lib/storefront/routing";

export async function DesignGalleryPage({
  publicBasePath,
}: {
  publicBasePath: string;
}) {
  return (
    <div className="store-section py-8 sm:py-10 lg:py-12">
      <div className="store-container animate-fade-in space-y-8">
        <section className="store-card relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-[-4rem] top-[-4rem] h-48 w-48 rounded-full bg-[rgba(45,91,255,0.2)] blur-3xl" />
            <div className="absolute bottom-[-4rem] left-[-3rem] h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          </div>

          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="max-w-3xl">
              <div className="glass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-[0.24em] text-zinc-100">
                <Factory className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                Design Factory
              </div>
              <h1 className="store-title mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                Browse the gallery, then turn inspiration into a live request.
              </h1>
              <p className="store-copy mt-5 max-w-2xl text-sm leading-relaxed sm:text-base">
                This page is the factory floor. Explore existing concepts, note the design number you want, and jump directly into the portal when you’re ready for a one-on-one custom build.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, "/portal")}>
                  Open design portal
                </Link>
                <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/portal/request-custom-design")}>
                  Request a custom design
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { icon: Layers3, title: "1. Find a direction", body: "Use the gallery as your starting visual language." },
                { icon: NotebookPen, title: "2. Save the reference", body: "Keep the design number ready for your request notes." },
                { icon: Sparkles, title: "3. Start the brief", body: "Use your style profile or specific notes to guide the draft." },
              ].map((item) => (
                <div key={item.title} className="store-card-soft rounded-[1.4rem] p-4">
                  <item.icon className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                  <div className="mt-3 text-sm font-semibold text-white">{item.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.72fr_1fr]">
          <div className="store-card-soft rounded-[2rem] p-6 sm:p-8">
            <p className="store-eyebrow">How it works</p>
            <div className="mt-5 space-y-5">
              <div>
                <div className="text-sm font-semibold text-white">Reference the gallery</div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">Pick an existing concept if you want the back design to echo something already in the Jah and Co visual language.</p>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Request a custom version</div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">Use the portal to submit color, size, notes, and whether the design should follow your style profile.</p>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Review the draft</div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">Admins send drafts back through the portal so you can approve, deny, or leave feedback before production.</p>
              </div>
            </div>
            <Link className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-[color:var(--color-brand-cloud)]" href={resolveStorefrontHref(publicBasePath, "/custom-apparel")}>
              Go to custom apparel
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-[rgba(112,135,187,0.18)] bg-[rgba(6,10,19,0.72)] shadow-[0_24px_80px_rgba(0,0,0,0.26)]">
            <div className="relative w-full" style={{ paddingTop: "128.1690%" }}>
              <iframe
                title="Design Gallery"
                loading="lazy"
                className="absolute left-0 top-0 h-full w-full border-0"
                src="https://www.canva.com/design/DAGxvcb98RA/U9HTlXOlKsoFjhx86zTeaA/view?embed"
                allow="fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        </section>

        <div className="text-sm text-zinc-400">
          <a
            className="text-white hover:underline"
            href="https://www.canva.com/design/DAGxvcb98RA/U9HTlXOlKsoFjhx86zTeaA/view"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open gallery in a new tab
          </a>
        </div>
      </div>
    </div>
  );
}
