import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { isValidStore } from "@/lib/storefront/store";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) return null;

  const { publicBasePath } = await getStorefrontRequestContext(store);

  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string | null } | undefined;

  const title = store === "dev" ? "Client Portal" : "Design Portal";
  const subtitle =
    store === "dev"
      ? "Project iterations, add-ons, and client-only tools."
      : "Draft reviews, approvals, and designer collaboration.";

  if (!session?.user) {
    const callbackUrl = resolveStorefrontHref(publicBasePath, "/portal");
    redirect(resolveStorefrontHref(publicBasePath, `/portal/login?callbackUrl=${encodeURIComponent(callbackUrl)}`));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl animate-fade-in">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-zinc-400">{subtitle}</p>

        <div className="mt-8 grid gap-4 rounded-xl border border-white/10 bg-zinc-950/40 p-6">
          <div className="text-sm text-zinc-300">
            <span className="text-zinc-500">Signed in as:</span> {user?.email}
          </div>

          <div className="flex flex-wrap gap-3">
            {store === "shop" ? (
              <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/collections/all")}>
                Continue shopping
              </Link>
            ) : (
              <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/")}>
                Back to site
              </Link>
            )}

            <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/portal/logout")}>
              Sign out
            </Link>
          </div>

          <div className="pt-2 text-sm text-zinc-400">Portal features are coming soon.</div>
        </div>
      </div>
    </div>
  );
}
