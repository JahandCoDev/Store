import Image from "next/image";
import Link from "next/link";

import { getOriginForStore } from "@/lib/storefront/routing";

function getStoreEntryHref(store: "shop" | "dev") {
  if (process.env.NODE_ENV !== "production") return `/${store}`;
  return getOriginForStore(store);
}

export default function Home() {
  return (
    <main className="relative min-h-svh overflow-hidden bg-[#020817] text-zinc-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-8%] h-64 w-64 rounded-full bg-cyan-500/14 blur-3xl" />
        <div className="absolute right-[-8%] top-[16%] h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-[-8%] left-[30%] h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="animate-fade-in">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Image
                src="/jahandco-logo.svg"
                alt="JahandCo"
                width={280}
                height={82}
                priority
                className="h-12 w-auto sm:h-14"
              />
              <h1 className="mt-6 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
                Pick your JahandCo experience.
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-zinc-300 sm:text-base">
                Choose a storefront to continue.
              </p>
            </div>
            <div className="glass-pill rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-100/80">
              Studio + Commerce
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            <section className="glass-panel rounded-3xl p-6 sm:p-8">
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
                Apparel
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                Apparel
              </h2>
              <p className="mt-2 text-sm sm:text-base text-zinc-300">
                Shop our latest drops, essentials, and collections.
              </p>
              <div className="mt-6">
                <Link className="btn btn-primary" href={getStoreEntryHref("shop")}>
                  Enter Apparel Storefront
                </Link>
              </div>
            </section>

            <section className="glass-panel rounded-3xl p-6 sm:p-8">
              <div className="inline-flex rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-violet-100">
                Dev
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                Dev
              </h2>
              <p className="mt-2 text-sm sm:text-base text-zinc-300">
                Explore services, portfolio, pricing, and request a quote.
              </p>
              <div className="mt-6">
                <Link className="btn btn-secondary" href={getStoreEntryHref("dev")}>
                  Enter Dev Storefront
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
