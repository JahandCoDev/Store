import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export default async function StyleSurveySubmissionsPage(props: { searchParams: Promise<{ q?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { q } = await props.searchParams;
  const query = (q ?? "").trim();

  const submissions = await prisma.styleSurveySubmission.findMany({
    where: query
      ? {
          OR: [
            { user: { email: { contains: query, mode: "insensitive" } } },
            { user: { displayId: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {},
    include: {
      user: { select: { email: true, displayId: true, firstName: true, lastName: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: 100,
  });

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Forms / Style Survey Submissions</div>
            <h1 className="mt-2 text-2xl font-bold text-foreground">Style Survey Submissions</h1>
            <p className="mt-1 text-sm text-gray-400">Submitted style surveys (latest per customer).</p>
          </div>
          <Link href="/forms" className="rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800">
            Back to Forms
          </Link>
        </header>

        <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900/40 p-4">
          <form action="/forms/style-surveys" method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              name="q"
              defaultValue={query}
              placeholder="Search email or displayId"
              className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 placeholder-gray-400 focus:border-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-800/40 sm:max-w-xl"
            />
            <button type="submit" className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">
              Search
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900 px-6 py-12 text-center text-sm text-gray-400">
              No style survey submissions found.
            </div>
          ) : (
            submissions.map((submission) => {
              const userLabel = submission.user.email || submission.user.displayId;
              const customerName = [submission.user.firstName, submission.user.lastName].filter(Boolean).join(" ");
              const entries = submission.answers && typeof submission.answers === "object" && submission.answers !== null ? Object.entries(submission.answers as Record<string, unknown>) : [];

              return (
                <article key={submission.id} className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-lg font-semibold text-foreground">{userLabel || "Unknown user"}</div>
                      <div className="mt-1 text-sm text-gray-400">
                        {customerName ? `${customerName} • ` : ""}
                        {submission.user.displayId ? (
                          <Link href={`/customers/${submission.user.displayId}`} className="text-gray-200 hover:underline">
                            Open customer
                          </Link>
                        ) : (
                          "No customer link"
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">{new Date(submission.submittedAt).toLocaleString()}</div>
                  </div>

                  {entries.length ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {entries.map(([key, value]) => (
                        <div key={key} className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
                          <div className="text-xs uppercase tracking-wider text-gray-500">{key}</div>
                          <div className="mt-2 text-sm text-gray-200">{typeof value === "string" ? value : JSON.stringify(value)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 text-sm text-gray-400">No answers stored.</div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
