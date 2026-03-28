import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function PrintJobsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const jobs = await prisma.printJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  type PrintJobRow = (typeof jobs)[number];

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Print Jobs</h1>
          <p className="mt-1 text-sm text-gray-400">Latest print queue activity.</p>
        </header>

        <div className="rounded-xl border border-gray-800 bg-gray-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-900">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-400">
                      No print jobs yet.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job: PrintJobRow) => {
                    const url = typeof job.assetUrl === "string" && job.assetUrl.trim() ? job.assetUrl.trim() : "";
                    return (
                      <tr key={job.id} className="hover:bg-gray-800/40">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-200">{job.type}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">{job.status}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-400">
                          {new Date(job.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-gray-200 hover:underline"
                            >
                              Open
                            </a>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
