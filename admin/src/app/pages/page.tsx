import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { resolveCoreShopIdFromCookie } from "@/lib/serviceAuth";

export default async function PagesIndexPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const shopId = await resolveCoreShopIdFromCookie();

  const pages = await prisma.storefrontPage.findMany({
    where: { shopId },
    orderBy: [{ isHomepage: "desc" }, { sortOrder: "asc" }, { title: "asc" }],
  });

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Storefront Pages</h1>
            <p className="mt-1 text-sm text-gray-400">Manage DB-backed pages and homepage content for the storefront.</p>
          </div>
          <Link href="/pages/new" className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900">+ New Page</Link>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-900/60">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Template</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-900">
                {pages.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-400">No storefront pages yet.</td>
                  </tr>
                ) : pages.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-800/40">
                    <td className="px-6 py-4 text-sm font-medium text-gray-100">
                      <Link href={`/pages/${page.id}`} className="hover:underline">{page.title}{page.isHomepage ? " (Home)" : ""}</Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">/{page.slug}</td>
                    <td className="px-6 py-4 text-sm text-gray-200">{page.template}</td>
                    <td className="px-6 py-4 text-sm text-gray-200">{page.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}