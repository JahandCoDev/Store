import { notFound } from "next/navigation";

import { getMockPageBySlug } from "@/lib/mock/pages";
import { isValidStore } from "@/lib/storefront/store";

export default async function ContentPage({
  params,
}: {
  params: Promise<{ store: string; slug: string }>;
}) {
  const { store, slug } = await params;
  if (!isValidStore(store)) notFound();

  const page = getMockPageBySlug(slug);
  if (!page) notFound();

  return (
    <div className="section section--page-width" style={{ padding: "48px 0" }}>
      <h1>{page.title}</h1>
      <div style={{ marginTop: 12, maxWidth: 820, lineHeight: 1.7 }}>{page.body}</div>
    </div>
  );
}
