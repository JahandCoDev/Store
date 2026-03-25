import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { isValidStore } from "@/lib/storefront/store";
import AccountProfileEditor from "./AccountProfileEditor";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) return null;
  const { publicBasePath } = await getStorefrontRequestContext(store);

  if (store === "dev") {
    redirect(resolveStorefrontHref(publicBasePath, "/portal"));
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const accountPath = resolveStorefrontHref(publicBasePath, "/account");
    redirect(resolveStorefrontHref(publicBasePath, `/account/login?callbackUrl=${encodeURIComponent(accountPath)}`));
  }

  const user = session.user as { email?: string | null; role?: string | null };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl animate-fade-in">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Account</h1>
        <p className="mt-3 text-sm text-zinc-400">Signed in as {user.email}</p>

        <div className="mt-8 grid gap-4 rounded-xl border border-white/10 bg-zinc-950/40 p-6">
          <div className="text-sm text-zinc-300">
            <span className="text-zinc-500">Role:</span> {user.role ?? "USER"}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/collections/all")}>
              Continue shopping
            </Link>
            <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/cart")}>
              View cart
            </Link>
            <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/account/logout")}>
              Sign out
            </Link>
          </div>

          {user.role === "ADMIN" ? (
            <div className="pt-2 text-sm text-zinc-400">
              <a className="text-white hover:underline" href={(process.env.ADMIN_APP_URL || "/admin").replace(/\/$/, "")}>
                Open Admin
              </a>
            </div>
          ) : null}
        </div>

        <AccountProfileEditor store={store} />
      </div>
    </div>
  );
}
