import { notFound } from "next/navigation";

import { CartClient } from "@/components/CartClient";
import { isValidStore } from "@/lib/storefront/store";

export default async function CartPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) notFound();

  return <CartClient store={store} />;
}
