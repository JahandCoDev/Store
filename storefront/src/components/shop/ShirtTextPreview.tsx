"use client";

import { useCallback, useMemo, useRef, useState } from "react";

export type ShirtTextPosition = { x: number; y: number };

export function ShirtTextPreview({
  imageUrl,
  label,
  text,
  position,
  onChange,
}: {
  imageUrl: string | null;
  label: string;
  text: string;
  position: ShirtTextPosition;
  onChange: (next: ShirtTextPosition) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const displayText = useMemo(() => (text ?? "").slice(0, 10), [text]);

  const updateFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;

      onChange({
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      });
    },
    [onChange]
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-xs uppercase tracking-[0.22em] text-zinc-500">{label}</div>

      <div
        ref={containerRef}
        className="mt-3 relative overflow-hidden rounded-xl border border-white/10 bg-black/40"
        onPointerDown={(e) => {
          setDragging(true);
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          updateFromEvent(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          updateFromEvent(e.clientX, e.clientY);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        role="application"
        aria-label="Text position preview"
      >
        <div className="aspect-square">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover opacity-90" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">No preview image</div>
          )}
        </div>

        <div
          className={
            "absolute left-0 top-0 select-none rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs font-semibold text-white shadow-sm " +
            (dragging ? "cursor-grabbing" : "cursor-grab")
          }
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: "translate(-50%, -50%)",
            maxWidth: "90%",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {displayText || "(text)"}
        </div>

        <div className="pointer-events-none absolute bottom-2 right-2 rounded-full border border-white/10 bg-black/50 px-2 py-1 text-[11px] text-zinc-200">
          Drag to position
        </div>
      </div>
    </div>
  );
}
