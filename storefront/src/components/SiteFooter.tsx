export function SiteFooter({
  shopName,
  footerCopy,
  store,
}: {
  shopName: string | null;
  footerCopy: string | null;
  store?: string;
}) {
  const isDev = store === "dev";

  return (
    <footer className={isDev ? "border-t border-white/10 bg-zinc-950" : "border-t border-white/10 bg-black"}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-10 text-sm text-zinc-400 sm:px-6 lg:px-8">
        <div>
          {footerCopy || `© ${new Date().getFullYear()} ${shopName || "Jah and Co"}`}
        </div>
        <div className="hidden sm:block">
          <span className="text-zinc-500">Built with care.</span>
        </div>
      </div>
    </footer>
  );
}
