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
    <footer
      className="section section--page-width"
      style={{
        padding: "32px 0",
        background: isDev ? "#202219" : undefined,
        borderTop: isDev ? "1px solid rgba(246,237,221,0.15)" : undefined,
      }}
    >
      <div style={{ fontSize: 14, opacity: 0.8, color: isDev ? "#f6eddd" : undefined }}>
        {footerCopy || `© ${new Date().getFullYear()} ${shopName || "Jah and Co"}`}
      </div>
    </footer>
  );
}
