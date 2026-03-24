import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import SubmissionActions from "@/components/SubmissionActions";

export default async function SubmissionsPage(props: { searchParams: Promise<{ q?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const cookieShopId = cookieStore.get("shopId")?.value ?? "";
  const shopId = cookieShopId === "jahandco-shop" || cookieShopId === "jahandco-dev" ? cookieShopId : "jahandco-shop";

  const { q } = await props.searchParams;
  const query = (q ?? "").trim();

  const submissions = await prisma.quoteSubmission.findMany({
    where: {
      shopId,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { projectType: { contains: query, mode: "insensitive" } },
              { selectedPlan: { contains: query, mode: "insensitive" } },
              { details: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quote Submissions</h1>
            <p className="mt-1 text-sm text-gray-400">Inbound quote requests for the selected shop.</p>
          </div>
        </header>

        <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900/40 p-4">
          <form action="/submissions" method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              name="q"
              defaultValue={query}
              placeholder="Search name, email, project type, plan, details"
              className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 placeholder-gray-400 focus:border-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-800/40 sm:max-w-xl"
            />
            <button
              type="submit"
              className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700"
            >
              Search
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900 px-6 py-12 text-center text-sm text-gray-400">
              No quote submissions found.
            </div>
          ) : (
            submissions.map((submission) => (
              <article key={submission.id} className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-foreground">{submission.name}</h2>
                      <span className="rounded-full border border-gray-800 bg-gray-950 px-2 py-0.5 text-xs font-semibold text-gray-200">
                        {submission.status}
                      </span>
                      {submission.selectedPlan ? (
                        <span className="rounded-full border border-navy-800/60 bg-navy-800/20 px-2 py-0.5 text-xs font-semibold text-gray-100">
                          {submission.selectedPlan}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      {submission.email}
                      {submission.phone ? ` • ${submission.phone}` : ""}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(submission.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
                    <div className="text-xs uppercase tracking-wider text-gray-500">Project Type</div>
                    <div className="mt-2 text-sm text-gray-200">{submission.projectType}</div>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
                    <div className="text-xs uppercase tracking-wider text-gray-500">Budget</div>
                    <div className="mt-2 text-sm text-gray-200">{submission.budgetRange}</div>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
                    <div className="text-xs uppercase tracking-wider text-gray-500">Timeline</div>
                    <div className="mt-2 text-sm text-gray-200">{submission.timeline}</div>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-gray-800 bg-gray-950/70 p-4">
                  <div className="text-xs uppercase tracking-wider text-gray-500">Details</div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-200">{submission.details}</p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(submission.addOns.length ? submission.addOns : ["No add-ons selected"]).map((item) => (
                    <span key={item} className="rounded-full border border-gray-800 bg-gray-950 px-2 py-0.5 text-xs text-gray-200">
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4 text-sm text-gray-300">
                    <div className="text-xs uppercase tracking-wider text-gray-500">Admin Email</div>
                    <div className="mt-2">{submission.adminNotifiedAt ? new Date(submission.adminNotifiedAt).toLocaleString() : "Not sent"}</div>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4 text-sm text-gray-300">
                    <div className="text-xs uppercase tracking-wider text-gray-500">Customer Email</div>
                    <div className="mt-2">{submission.customerAcknowledgedAt ? new Date(submission.customerAcknowledgedAt).toLocaleString() : "Not sent"}</div>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4 text-sm text-gray-300">
                    <div className="text-xs uppercase tracking-wider text-gray-500">Mail Status</div>
                    <div className="mt-2 break-words">{submission.lastEmailError || "Delivered or skipped cleanly"}</div>
                  </div>
                </div>

                <SubmissionActions
                  submissionId={submission.id}
                  currentStatus={submission.status}
                  submissionEmail={submission.email}
                />
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}