"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { signOut } from "next-auth/react";

export default function LogoutPage() {
  const params = useParams<{ store: string }>();

  useEffect(() => {
    signOut({ callbackUrl: `/${params.store}` });
  }, [params.store]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm text-zinc-400">Signing out…</p>
    </div>
  );
}
