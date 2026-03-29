import { redirect } from "next/navigation";

import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { buildStorePath } from "@/lib/storefront/routing";

function toQueryString(searchParams: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      query.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        query.append(key, entry);
      }
    }
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export default async function AccountAliasPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = toQueryString(await searchParams);
  const { publicBasePath } = await getStorefrontRequestContext("shop");

  const pathSuffix = slug?.length ? `/${slug.join("/")}` : "";
  redirect(`${buildStorePath(publicBasePath, `/account${pathSuffix}`)}${query}`);
}