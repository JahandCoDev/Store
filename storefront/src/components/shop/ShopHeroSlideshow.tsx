"use client";

import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon } from "lucide-react";

function normalizeImages(images: string[]) {
  return Array.from(
    new Set(
      (images ?? [])
        .map((src) => (typeof src === "string" ? src.trim() : ""))
        .filter(Boolean)
    )
  );
}

export function ShopHeroSlideshow({
  images,
  intervalMs = 4200,
  className,
}: {
  images: string[];
  intervalMs?: number;
  className?: string;
}) {
  const normalized = useMemo(() => normalizeImages(images), [images]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (normalized.length <= 1) return;

    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % normalized.length);
    }, Math.max(1200, intervalMs));

    return () => window.clearInterval(id);
  }, [intervalMs, normalized.length]);

  const current = normalized[index] ?? null;
  const next = normalized.length > 1 ? normalized[(index + 1) % normalized.length] : null;

  return (
    <div className={className}>
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-white/15 bg-white/[0.03]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[rgba(45,91,255,0.22)] blur-3xl" />
          <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-white/12 blur-3xl" />
        </div>

        {current ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={current}
              src={current}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity duration-700"
              loading="eager"
            />
            {next ? (
              // Preload the next image for smoother transitions.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={next} alt="" className="hidden" loading="eager" />
            ) : null}
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <div className="glass-pill flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-wide text-zinc-200">
              <ImageIcon className="h-4 w-4 text-[color:var(--color-dev-blue)]" />
              Add product images to see the slideshow
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.66))]" />

        <div className="absolute bottom-4 left-4 right-4">
          <div className="glass-panel rounded-[1.5rem] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.32em] text-white/60">
                  Jah and Co.
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  Product imagery from the design floor
                </div>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(6, Math.max(1, normalized.length)) }).map((_, i) => (
                  <div
                    key={i}
                    className={
                      "h-1.5 w-5 rounded-full transition " +
                      (i === index % Math.min(6, Math.max(1, normalized.length))
                        ? "bg-white/80"
                        : "bg-white/20")
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
