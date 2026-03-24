import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import MediaLibraryManager from "@/components/MediaLibraryManager";

export default async function MediaPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <MediaLibraryManager />
      </div>
    </div>
  );
}