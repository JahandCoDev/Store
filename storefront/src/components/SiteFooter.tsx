export function SiteFooter({
  shopName,
  footerCopy,
}: {
  shopName: string | null;
  footerCopy: string | null;
}) {
  return (
    <footer className="section section--page-width" style={{ padding: "32px 0" }}>
      <div style={{ fontSize: 14, opacity: 0.8 }}>
        {footerCopy || `© ${new Date().getFullYear()} ${shopName || "Jah and Co"}`}
      </div>
    </footer>
  );
}
