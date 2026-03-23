import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "success") return "border-emerald-700/60 bg-emerald-900/20 text-emerald-200";
  if (s === "failed" || s === "error") return "border-red-700/60 bg-red-900/20 text-red-200";
  if (s === "running") return "border-navy-800/60 bg-navy-800/20 text-gray-100";
  return "border-gray-800 bg-gray-950 text-gray-200";
}

export default async function CiPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const cookieShopId = cookieStore.get("shopId")?.value ?? "";
  const shopId = cookieShopId === "jahandco-shop" || cookieShopId === "jahandco-dev" ? cookieShopId : "jahandco-shop";

  const runs = await prisma.ciPipelineRun.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      uniqueId: true,
      name: true,
      status: true,
      sha: true,
      authorEmail: true,
      start: true,
      end: true,
      createdAt: true,
    },
  });

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">CI</h1>
          <p className="mt-1 text-sm text-gray-400">Recent deploy pipelines and their captured logs.</p>
        </header>

        <div className="rounded-xl border border-gray-800 bg-gray-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Pipeline</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Commit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Author</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Start</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">End</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-900">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                      No CI runs yet.
                    </td>
                  </tr>
                ) : (
                  runs.map((run) => (
                    <tr key={run.uniqueId} className="hover:bg-gray-800/40">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-200">
                        <Link href={`/ci/${encodeURIComponent(run.uniqueId)}`} className="hover:underline">
                          {run.name}
                        </Link>
                        <div className="mt-1 text-xs text-gray-500">{run.uniqueId}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold leading-5 ${statusBadgeClass(run.status)}`}>{run.status}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-200">{run.sha.slice(0, 7)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-400">{run.authorEmail || "—"}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-400">{new Date(run.start).toLocaleString()}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-400">{run.end ? new Date(run.end).toLocaleString() : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
