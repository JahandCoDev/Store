import { redirect } from "next/navigation";

import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { buildStorePath } from "@/lib/storefront/routing";

export default async function CheckoutPage() {
  const { store, publicBasePath } = await getStorefrontRequestContext("shop");
  const targetStore = store ?? "shop";

  if (targetStore === "dev") {
    redirect(buildStorePath(publicBasePath, "/"));
  }

  redirect(buildStorePath(publicBasePath, "/checkout"));
}
