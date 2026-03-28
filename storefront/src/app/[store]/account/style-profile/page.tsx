import Link from "next/link";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { generateUserDisplayId } from "@/lib/displayId";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getMediaUrl(storageKey: string) {
  return `/${storageKey.replace(/^\/+/, "")}`;
}

export default async function StyleProfilePage(props: { params: Promise<{ store: string }> }) {
  const { store } = await props.params;

  const session = await getServerSession(authOptions);
  const email = normalizeEmail(session?.user?.email);
  const publicBasePath = `/${store}`;

  if (!session?.user || !email) {
    const loginHref = resolveStorefrontHref(publicBasePath, "/account/login");
    const callbackUrl = resolveStorefrontHref(publicBasePath, "/account/style-profile");
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-2xl animate-fade-in">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Style Profile</h1>
          <p className="mt-4 text-sm text-zinc-300">Sign in to view your personalized Style Profile.</p>
          <div className="mt-8">
            <Link className="btn btn-primary" href={`${loginHref}?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Ensure the user exists in the DB.
  const displayId = await generateUserDisplayId(prisma, { email });
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, displayId },
    update: {},
    include: { styleSurvey: true },
  });

  const submission = user.styleSurvey;

  const answersObj =
    submission?.answers && typeof submission.answers === "object" && submission.answers !== null
      ? (submission.answers as Record<string, unknown>)
      : null;

  const styleProfileDesignStorageKey =
    typeof answersObj?.styleProfileDesignStorageKey === "string" ? answersObj.styleProfileDesignStorageKey : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl animate-fade-in">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Your Style Profile</h1>
            <p className="mt-4 text-sm leading-relaxed text-zinc-300">
              Based on your Style Survey submission, we tailor your custom apparel experience.
            </p>
          </div>
          <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/custom-apparel")}>
            Back to Custom Apparel
          </Link>
        </div>

        {!submission ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-sm font-semibold text-white">No Style Survey found</div>
            <p className="mt-2 text-sm text-zinc-300">
              Complete the Style Survey to generate your Style Profile.
            </p>
            <div className="mt-5">
              <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, "/customer-questionnaire")}>
                Take the survey
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-10 grid gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="text-sm font-semibold text-white">Custom design</div>
              <p className="mt-2 text-sm text-zinc-300">
                A personalized design can be added by our team for your profile.
              </p>
              <div className="mt-5">
                {styleProfileDesignStorageKey ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="Style Profile design"
                    src={getMediaUrl(styleProfileDesignStorageKey)}
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/40"
                  />
                ) : (
                  <div className="min-h-40 rounded-2xl border border-white/10 bg-zinc-950/40" />
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white">Your answers</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Submitted {new Date(submission.submittedAt).toLocaleString()}
                  </div>
                </div>
                <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/customer-questionnaire")}>
                  View survey
                </Link>
              </div>

              {answersObj ? (
                <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                  {Object.entries(answersObj).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-white/10 bg-zinc-950/40 p-4">
                      <dt className="text-xs uppercase tracking-wider text-zinc-500">{key}</dt>
                      <dd className="mt-2 text-sm text-white">
                        {typeof value === "string" ? value : JSON.stringify(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="mt-6 text-sm text-zinc-400">No answers stored.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
