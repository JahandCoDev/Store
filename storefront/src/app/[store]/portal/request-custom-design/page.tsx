import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { isValidStore } from "@/lib/storefront/store";
import CustomDesignRequestForm from "@/components/portal/CustomDesignRequestForm";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export default async function PortalRequestCustomDesignPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) return null;

  const { publicBasePath } = await getStorefrontRequestContext(store);

  const session = await getServerSession(authOptions);
  const email = normalizeEmail(session?.user?.email);

  if (!session?.user || !email) {
    const callbackUrl = resolveStorefrontHref(publicBasePath, "/portal/request-custom-design");
    redirect(resolveStorefrontHref(publicBasePath, `/portal/login?callbackUrl=${encodeURIComponent(callbackUrl)}`));
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, styleSurvey: { select: { id: true } } },
  });

  const portalHref = resolveStorefrontHref(publicBasePath, "/portal");

  if (!user?.styleSurvey) {
    return (
      <div className="store-section py-8 sm:py-10">
        <div className="store-container max-w-2xl animate-fade-in">
          <h1 className="store-title text-3xl font-semibold tracking-tight sm:text-4xl">Request a custom design</h1>
          <p className="store-copy mt-3 text-sm">
            You’ll need to complete the Style Survey before requesting a custom design.
          </p>

          <div className="store-card-soft mt-8 rounded-[1.5rem] p-6">
            <div className="flex flex-wrap gap-3">
              <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, "/customer-questionnaire")}>
                Go to Style Survey
              </Link>
              <Link className="btn btn-secondary" href={portalHref}>
                Back to portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="store-section py-8 sm:py-10">
      <div className="store-container max-w-2xl animate-fade-in">
        <h1 className="store-title text-3xl font-semibold tracking-tight sm:text-4xl">Request a custom design</h1>
        <p className="store-copy mt-3 text-sm">
          Tell us your shirt details and optionally pick something from the gallery.
        </p>

        <CustomDesignRequestForm portalHref={portalHref} />
      </div>
    </div>
  );
}
