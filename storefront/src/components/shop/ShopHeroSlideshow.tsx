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
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setFailedImages([]);
    setIndex(0);
  }, [normalized.join("|")]);

  const availableImages = useMemo(
    () => normalized.filter((src) => !failedImages.includes(src)),
    [failedImages, normalized]
  );

  useEffect(() => {
    if (!availableImages.length) {
      setIndex(0);
      return;
    }

    if (index >= availableImages.length) {
      setIndex(0);
    }
  }, [availableImages.length, index]);

  useEffect(() => {
    if (availableImages.length <= 1) return;

    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % availableImages.length);
    }, Math.max(1200, intervalMs));

    return () => window.clearInterval(id);
  }, [availableImages.length, intervalMs]);

  const current = availableImages[index] ?? null;
  const next = availableImages.length > 1 ? availableImages[(index + 1) % availableImages.length] : null;

  function markFailed(src: string | null) {
    if (!src) return;
    setFailedImages((prev) => (prev.includes(src) ? prev : [...prev, src]));
  }

  return (
    <div className={className}>
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-white/15 bg-white/[0.03]">
        <div className="pointer-events-none absolute inset-0">
          <div className="orb orb-rose orb-drift-a -left-12 top-6 h-36 w-36" />
          <div className="orb orb-gold orb-drift-b right-6 top-10 h-28 w-28" />
          <div className="orb orb-blue orb-drift-c -bottom-10 right-10 h-44 w-44" />
          <div className="orb orb-mint orb-drift-a bottom-14 left-10 h-24 w-24" />
        </div>

        {current ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={current}
              src={current}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-84 transition-opacity duration-700"
              loading="eager"
              onError={() => markFailed(current)}
            />
            {next ? (
              // Preload the next image for smoother transitions.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={next} alt="" className="hidden" loading="eager" onError={() => markFailed(next)} />
            ) : null}
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <div className="glass-panel max-w-[19rem] rounded-[1.5rem] px-5 py-4 text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-200">
                <ImageIcon className="h-4 w-4 text-[color:var(--color-brand-cloud)]" />
                Jah and Co.
              </div>
              <div className="mt-3 text-sm font-semibold text-white">
                Product imagery is loading in.
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                This slideshow now falls back to in-app product images when object storage is unavailable.
              </p>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.56))]" />

        <div className="absolute bottom-4 left-4 right-4">
          <div className="glass-panel rounded-[1.5rem] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.32em] text-white/60">
                  Jah and Co.
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  Original pieces and custom-ready looks
                </div>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(6, Math.max(1, availableImages.length)) }).map((_, i) => (
                  <div
                    key={i}
                    className={
                      "h-1.5 w-5 rounded-full transition " +
                      (i === index % Math.min(6, Math.max(1, availableImages.length))
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
