import Link from "next/link";

export function SiteHeader({
  store,
  shopName,
}: {
  store: string;
  shopName: string | null;
}) {
  return (
    <header className="section section--page-width" style={{ padding: "16px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <Link href={`/${store}`} style={{ fontWeight: 700 }}>
          {shopName || "Jah and Co"}
        </Link>

        <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }} aria-label="Main">
          <Link href={`/${store}/collections/all`}>Shop</Link>
          <Link href={`/${store}/pages/contact`}>Contact</Link>
          <Link href={`/${store}/search`}>Search</Link>
          <Link href={`/${store}/cart`}>Cart</Link>
        </nav>
      </div>
    </header>
  );
}
