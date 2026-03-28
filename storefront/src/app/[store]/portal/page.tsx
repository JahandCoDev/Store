import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { isValidStore } from "@/lib/storefront/store";
import { publicObjectUrl } from "@/lib/objectStorage";
import DesignPortalDashboard from "@/components/portal/DesignPortalDashboard";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export default async function PortalPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) return null;

  const { publicBasePath } = await getStorefrontRequestContext(store);

  const session = await getServerSession(authOptions);
  const email = normalizeEmail(session?.user?.email);

  const title = store === "dev" ? "Client Portal" : "Design Portal";
  const subtitle =
    store === "dev"
      ? "Project iterations, add-ons, and client-only tools."
      : "Draft reviews, approvals, and designer collaboration.";

  if (!session?.user) {
    const callbackUrl = resolveStorefrontHref(publicBasePath, "/portal");
    redirect(resolveStorefrontHref(publicBasePath, `/portal/login?callbackUrl=${encodeURIComponent(callbackUrl)}`));
  }

  const customer = await prisma.user.findUnique({
    where: { email },
    select: {
      email: true,
      styleSurvey: { select: { id: true } },
      customDesignRequests: {
        orderBy: { createdAt: "desc" },
        include: {
          proposals: {
            orderBy: { createdAt: "desc" },
            include: { asset: true },
          },
        },
        take: 50,
      },
    },
  });

  const safeRequests = (customer?.customDesignRequests ?? []).map((req) => {
    return {
      id: req.id,
      createdAt: req.createdAt.toISOString(),
      status: req.status,
      shirtSize: req.shirtSize,
      shirtColor: req.shirtColor,
      galleryDesignRef: req.galleryDesignRef,
      basedOnStyleProfile: req.basedOnStyleProfile,
      notes: req.notes,
      proposals: req.proposals.map((proposal) => {
        const assetUrl = proposal.asset?.storageKey ? (() => {
          try {
            return publicObjectUrl(proposal.asset!.storageKey);
          } catch {
            return null;
          }
        })() : null;

        return {
          id: proposal.id,
          createdAt: proposal.createdAt.toISOString(),
          adminMessage: proposal.adminMessage,
          assetUrl,
          assetLabel: proposal.asset?.title || proposal.asset?.originalFilename || null,
          customerDecision: proposal.customerDecision,
          customerFeedback: proposal.customerFeedback,
          decidedAt: proposal.decidedAt ? proposal.decidedAt.toISOString() : null,
        };
      }),
    };
  });

  const portalHref = resolveStorefrontHref(publicBasePath, "/portal");
  const requestHref = resolveStorefrontHref(publicBasePath, "/portal/request-custom-design");
  const questionnaireHref = resolveStorefrontHref(publicBasePath, "/customer-questionnaire");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl animate-fade-in">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-zinc-400">{subtitle}</p>

        <div className="mt-8 grid gap-4 rounded-xl border border-white/10 bg-zinc-950/40 p-6">
          <div className="text-sm text-zinc-300">
            <span className="text-zinc-500">Signed in as:</span> {customer?.email || email}
          </div>

          <div className="flex flex-wrap gap-3">
            {store === "shop" ? (
              <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/collections/all")}>
                Continue shopping
              </Link>
            ) : (
              <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/")}>
                Back to site
              </Link>
            )}

            <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/portal/logout")}>
              Sign out
            </Link>
          </div>
        </div>

        <DesignPortalDashboard
          requests={safeRequests}
          styleSurveyCompleted={Boolean(customer?.styleSurvey)}
          portalHref={portalHref}
          requestHref={requestHref}
          questionnaireHref={questionnaireHref}
        />
      </div>
    </div>
  );
}
