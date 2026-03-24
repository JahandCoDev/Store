import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import MarketingComposer from "@/components/MarketingComposer";
import { getManualEmailTemplatesForShop } from "@/lib/email/manualEmailMailer";
import { resolveCoreShopIdFromCookie } from "@/lib/serviceAuth";

export default async function MarketingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as { email?: string | null } | undefined;
  const shopId = await resolveCoreShopIdFromCookie();
  const templates = getManualEmailTemplatesForShop(shopId);

  return (
    <div className="p-8">
      <div className="mx-auto max-w-[1600px]">
        <MarketingComposer defaultTo={user?.email ?? ""} shopId={shopId} templates={templates} />
      </div>
    </div>
  );
}