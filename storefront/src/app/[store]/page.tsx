import Link from "next/link";

import { getStoreDisplayName, isValidStore } from "@/lib/storefront/store";

export default async function StoreHome({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) return null;

  return (
    <div className="section section--page-width" style={{ padding: "48px 0" }}>
      <h1 style={{ marginBottom: 12 }}>Jah and Co — {getStoreDisplayName(store)}</h1>
      <p style={{ maxWidth: 720, lineHeight: 1.6 }}>
        This storefront is served under <strong>/{store}</strong>.
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
        <Link className="button" href={`/${store}/collections/all`}>
          Browse products
        </Link>
        <Link className="button-secondary" href={`/${store}/cart`}>
          View cart
        </Link>
        <Link className="button-secondary" href={`/${store}/search`}>
          Search
        </Link>
      </div>
    </div>
  );
}
