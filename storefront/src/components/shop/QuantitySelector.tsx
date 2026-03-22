"use client";

export function QuantitySelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        className="px-3 text-zinc-200 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <div className="flex min-w-12 items-center justify-center px-3 text-sm font-semibold text-white">
        {value}
      </div>
      <button
        type="button"
        className="px-3 text-zinc-200 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
