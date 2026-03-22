import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-svh bg-black text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="animate-fade-in">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h1 className="text-balance text-2xl sm:text-3xl font-semibold tracking-tight">
                JahandCo
              </h1>
              <p className="mt-2 text-sm sm:text-base text-zinc-300">
                Choose a storefront to continue.
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <section className="rounded-2xl border border-white/10 bg-white/0 p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                Apparel
              </h2>
              <p className="mt-2 text-sm sm:text-base text-zinc-300">
                Shop our latest drops, essentials, and collections.
              </p>
              <div className="mt-6">
                <Link className="btn btn-primary" href="/shop">
                  Enter Apparel Storefront
                </Link>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/0 p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                Dev
              </h2>
              <p className="mt-2 text-sm sm:text-base text-zinc-300">
                Explore services, portfolio, pricing, and request a quote.
              </p>
              <div className="mt-6">
                <Link className="btn btn-secondary" href="/dev">
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
