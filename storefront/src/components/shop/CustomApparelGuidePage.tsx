import Link from "next/link";
import { ArrowRight, BadgeCheck, Palette, Shirt, Sparkles } from "lucide-react";

import { resolveStorefrontHref } from "@/lib/storefront/routing";

function GuideSignalArt() {
  return (
    <svg viewBox="0 0 300 180" className="hero-signal h-full w-full" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="jah-guide-line" x1="24" y1="40" x2="270" y2="150" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgba(255,255,255,0.88)" />
          <stop offset="0.55" stopColor="rgba(135,166,255,0.88)" />
          <stop offset="1" stopColor="rgba(45,91,255,0.96)" />
        </linearGradient>
      </defs>
      <path className="hero-signal-path" d="M24 128C60 116 78 70 118 70C152 70 168 118 208 118C232 118 250 106 272 82" stroke="url(#jah-guide-line)" strokeWidth="2.5" strokeLinecap="round" />
      <circle className="hero-signal-node" cx="92" cy="84" r="5" fill="white" />
      <circle className="hero-signal-node" cx="160" cy="88" r="7" fill="rgba(127,161,255,0.92)" style={{ animationDelay: "0.8s" }} />
      <circle className="hero-signal-node" cx="224" cy="116" r="5.5" fill="rgba(45,91,255,0.96)" style={{ animationDelay: "1.5s" }} />
      <g className="hero-signal-orbit">
        <circle cx="230" cy="52" r="24" stroke="rgba(255,255,255,0.16)" />
        <circle cx="230" cy="52" r="8" fill="rgba(45,91,255,0.24)" stroke="rgba(255,255,255,0.4)" />
      </g>
    </svg>
  );
}

export function CustomApparelGuidePage({ publicBasePath }: { publicBasePath: string }) {
  return (
    <div className="store-section py-8 sm:py-10">
      <div className="store-container max-w-4xl animate-fade-in">
        <div className="store-card glow-outline px-6 py-8 sm:px-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="glass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-[0.24em] text-zinc-100">
              <Sparkles className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
              Custom Apparel Guide
            </div>
            <h1 className="store-title mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything you need to know before you order custom apparel.
            </h1>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-white/60">
              Where style meets soul.
            </p>
            <p className="store-copy mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
              Whether you want one signature shirt or a custom look for a special moment, this guide shows how Jah and Co takes your idea from inspiration to approved final piece.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, "/portal/request-custom-design")}>
                Start your request
              </Link>
              <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/design-gallery")}>
                Browse the gallery
              </Link>
            </div>
          </div>

          <div className="store-card-soft interactive-panel glow-outline relative overflow-hidden rounded-[1.75rem] p-6">
            <div className="pointer-events-none absolute inset-0 opacity-90">
              <GuideSignalArt />
            </div>
            <div className="relative grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { icon: Shirt, title: "Choose the piece", body: "Pick the garment, color direction, and overall feel you want." },
                { icon: Palette, title: "Share the inspiration", body: "Use the gallery, your style profile, or your own references to guide the design." },
                { icon: BadgeCheck, title: "Approve the final", body: "Review your draft before production so the finished shirt feels right." },
              ].map((item) => (
                <div key={item.title} className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                  <item.icon className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                  <div className="mt-3 text-sm font-semibold text-white">{item.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-10">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-white">Methods of Customization</h2>
            <p className="text-sm leading-relaxed text-zinc-300">
              Jah and Co offers multiple ways to personalize your clothing, from fully custom concepts to updates on existing designs.
            </p>
          </section>

          <hr className="border-white/10" />

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-white">Standard Customization</h2>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
              <p>
                Our standard custom service is built around creating a design specifically for you. We shape the piece around your personality, style, and the kind of statement you want the shirt to make.
              </p>
              <p>
                To help us understand that direction, we recommend completing the Style Survey. It gives us quick insight into your color preferences, inspirations, and overall vibe so your request feels more personal from the start.
              </p>
              <p>
                Survey responses also help us tailor future product recommendations, offers, and updates. You can always unsubscribe from marketing emails at any time.
              </p>
              <div>
                <Link className="inline-flex items-center gap-2 text-white hover:underline" href={resolveStorefrontHref(publicBasePath, "/customer-questionnaire")}>
                  Take the Style Survey
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-white">How to Start a Custom Order</h2>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
              <p>
                The fastest way to start is through the custom request form in the portal. You&apos;ll share the garment, color direction, inspiration, and any must-have details for the piece you want.
              </p>
              <p>
                Once your request is in, Jah and Co reviews the brief and follows up with any questions needed to tighten the direction before concepting begins.
              </p>
              <p>
                You&apos;ll receive draft artwork for review, feedback, and approval. That way you can request edits before the design moves into production.
              </p>
              <p>
                Pricing is confirmed during the process based on the final direction, garment choice, and scope of the work. Once approved and paid, production begins.
              </p>
              <p className="text-zinc-400">If you don&apos;t hear from us within 24 hours, contact us and we&apos;ll make it right.</p>
              <div>
                <Link className="inline-flex items-center gap-2 text-white hover:underline" href={resolveStorefrontHref(publicBasePath, "/portal/request-custom-design")}>
                  Open the custom request form
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-white">Shirts with Front Designs</h2>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
              <p>
                Some shirts start with front artwork already in place and can still be customized further. In many cases, you can add a back design from the Design Gallery to create a fuller statement piece.
              </p>
              <div>
                <Link className="inline-flex items-center gap-2 text-white hover:underline" href={resolveStorefrontHref(publicBasePath, "/design-gallery")}>
                  Browse the Design Gallery
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-white">Other Customization Options</h2>
            <p className="text-sm leading-relaxed text-zinc-300">
              Depending on the product, you may be able to add names, numbers, text, or color adjustments to an existing design. Product descriptions will note when those options are available.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Customization for Large Groups or Occasions
            </h2>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
              <p>For group orders, celebrations, events, or coordinated apparel, contact Jah and Co directly so we can scope the project the right way.</p>
              <p>
                These projects can include customer-supplied artwork, shared themes, or fully custom concepts created around your event.
              </p>
              <p className="text-zinc-400">Customer-supplied artwork is currently reserved for these larger orders and occasion-based projects.</p>
            </div>
          </section>
        </div>
        </div>
      </div>
    </div>
  );
}
