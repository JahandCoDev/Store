import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import MarketingComposer from "@/components/MarketingComposer";
import { getManualEmailTemplatesForShop } from "@/lib/email/manualEmailMailer";

export default async function MarketingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as { email?: string | null } | undefined;
  const templates = getManualEmailTemplatesForShop();

  return (
    <div className="p-8">
      <div className="mx-auto max-w-[1600px]">
        <MarketingComposer defaultTo={user?.email ?? ""} templates={templates} />
      </div>
    </div>
  );
}