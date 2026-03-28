import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export default async function FormsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const quoteSubmissionCount = await prisma.quoteSubmission.count();

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-foreground">Forms</h1>
          <p className="mt-1 text-sm text-gray-400">Form inboxes.</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/forms/quote-submissions"
            className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm transition hover:border-navy-800/60 hover:bg-gray-800/40"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Available Form</div>
                <h2 className="mt-3 text-lg font-semibold text-foreground">Quote Submissions</h2>
                <p className="mt-2 text-sm text-gray-400">Review inbound quote requests, update status, resend emails, and remove stale entries.</p>
              </div>
              <div className="rounded-full border border-navy-800/60 bg-navy-900/20 px-3 py-1 text-sm font-semibold text-navy-100">
                {quoteSubmissionCount}
              </div>
            </div>
            <div className="mt-6 text-xs uppercase tracking-[0.18em] text-navy-200">Open inbox</div>
          </Link>
        </div>
      </div>
    </div>
  );
}