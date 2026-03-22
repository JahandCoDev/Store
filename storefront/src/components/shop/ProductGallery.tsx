"use client";

import { useMemo, useState } from "react";

export function ProductGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const normalized = useMemo(() => images.filter(Boolean), [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = normalized[activeIndex] ?? normalized[0] ?? null;

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="aspect-square">
          {active ? (
            <img
              src={active}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
              No image
            </div>
          )}
        </div>
      </div>

      {normalized.length > 1 ? (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {normalized.slice(0, 10).map((url, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={`${url}-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={
                  "aspect-square overflow-hidden rounded-lg border bg-white/[0.03] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 " +
                  (isActive
                    ? "border-white/30"
                    : "border-white/10 hover:border-white/20")
                }
                aria-label={`View image ${idx + 1}`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
