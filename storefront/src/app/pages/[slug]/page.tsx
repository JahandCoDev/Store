import { redirect } from "next/navigation";

import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { buildStorePath } from "@/lib/storefront/routing";

export default async function ContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { store, publicBasePath } = await getStorefrontRequestContext("shop");
  void store;
  redirect(buildStorePath(publicBasePath, `/${slug}`));
}
