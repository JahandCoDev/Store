import Link from "next/link";
import { ArrowRight, Layers3, NotebookPen, Palette, Sparkles } from "lucide-react";

import { resolveStorefrontHref } from "@/lib/storefront/routing";

export async function DesignGalleryPage({
  publicBasePath,
}: {
  publicBasePath: string;
}) {
  return (
    <div className="store-section py-8 sm:py-10 lg:py-12">
      <div className="store-container animate-fade-in space-y-8">
        <section className="store-card glow-outline relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-[-4rem] top-[-4rem] h-48 w-48 rounded-full bg-[rgba(45,91,255,0.2)] blur-3xl" />
            <div className="absolute bottom-[-4rem] left-[-3rem] h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          </div>

          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="max-w-3xl">
              <div className="glass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-[0.24em] text-zinc-100">
                <Palette className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                Design Gallery
              </div>
              <h1 className="store-title mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                Find the artwork, mood, and direction that fits your next piece.
              </h1>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-white/60">
                Where style meets soul.
              </p>
              <p className="store-copy mt-5 max-w-2xl text-sm leading-relaxed sm:text-base">
                Explore existing concepts, save the design numbers that stand out, and use them as the starting point for a custom shirt that feels right for you.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, "/portal/request-custom-design")}>
                  Start your request
                </Link>
                <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/custom-apparel") }>
                  Back to custom apparel
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { icon: Layers3, title: "1. Find your direction", body: "Look for the print, mood, and layout that feels closest to your style." },
                { icon: NotebookPen, title: "2. Save the design number", body: "Keep the reference handy so your request starts with a clear visual point." },
                { icon: Sparkles, title: "3. Start the request", body: "Send your notes and let Jah and Co shape the final piece around your brief." },
              ].map((item) => (
                <div key={item.title} className="store-card-soft interactive-panel glow-outline rounded-[1.4rem] p-4">
                  <item.icon className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                  <div className="mt-3 text-sm font-semibold text-white">{item.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.72fr_1fr]">
          <div className="store-card-soft interactive-panel glow-outline rounded-[2rem] p-6 sm:p-8">
            <p className="store-eyebrow">How it works</p>
            <div className="mt-5 space-y-5">
              <div>
                <div className="text-sm font-semibold text-white">Reference the gallery</div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">Choose the artwork or direction you want to build from, whether you want the exact feel or a fresh variation on it.</p>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Request a custom version</div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">Share your color choices, garment type, placement notes, and any changes you want made before concepting begins.</p>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Review the draft</div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">You&apos;ll get draft previews back for approval so the final piece feels finished, intentional, and ready to wear.</p>
              </div>
            </div>
            <Link className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-[color:var(--color-brand-cloud)]" href={resolveStorefrontHref(publicBasePath, "/custom-apparel")}>
              Go to custom apparel
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="glow-outline overflow-hidden rounded-[2rem] border border-[rgba(112,135,187,0.18)] bg-[rgba(6,10,19,0.72)] shadow-[0_24px_80px_rgba(0,0,0,0.26)]">
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
