import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function CiRunPage({ params }: { params: Promise<{ uniqueId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { uniqueId } = await params;

  const cookieStore = await cookies();
  const cookieShopId = cookieStore.get("shopId")?.value ?? "";
  const shopId = cookieShopId === "jahandco-shop" || cookieShopId === "jahandco-dev" ? cookieShopId : "jahandco-shop";

  const run = await prisma.ciPipelineRun.findUnique({
    where: { shopId_uniqueId: { shopId, uniqueId } },
  });

  if (!run) notFound();

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{run.name}</h1>
            <p className="mt-1 text-sm text-gray-400">
              {run.status} • {run.sha.slice(0, 7)} • {run.authorEmail || "—"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/ci" className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 hover:bg-gray-900">
              Back
            </Link>
            {run.url ? (
              <a
                href={run.url}
                className="rounded-md bg-navy-800 px-3 py-2 text-sm font-medium text-white hover:bg-navy-900"
                target="_blank"
                rel="noreferrer"
              >
                Open Dashboard URL
              </a>
            ) : null}
          </div>
        </header>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-400">Unique ID</div>
            <div className="mt-1 break-all text-sm text-gray-200">{run.uniqueId}</div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-400">Repo</div>
            <div className="mt-1 break-all text-sm text-gray-200">{run.repositoryUrl}</div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-400">Start</div>
            <div className="mt-1 text-sm text-gray-200">{new Date(run.start).toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-400">End</div>
            <div className="mt-1 text-sm text-gray-200">{run.end ? new Date(run.end).toLocaleString() : "—"}</div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 shadow-sm">
          <div className="border-b border-gray-800 px-6 py-4">
            <h2 className="text-lg font-medium text-foreground">Logs</h2>
            <p className="mt-1 text-sm text-gray-400">Tail of the post-receive pipeline output.</p>
          </div>
          <div className="p-6">
            {run.log ? (
              <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-lg border border-gray-800 bg-gray-950 p-4 text-xs leading-relaxed text-gray-200">
                {run.log}
              </pre>
            ) : (
              <p className="text-sm text-gray-400">No log captured for this run.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
