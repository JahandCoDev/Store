"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { usePublicBasePath } from "@/lib/storefront/usePublicBasePath";

export default function LoginForm({
  store,
  basePath,
  title = "Sign in",
  subtitle,
}: {
  store: string;
  basePath: "/account" | "/portal";
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const publicBasePath = usePublicBasePath(store);

  const callbackUrl = useMemo(() => {
    const cb = searchParams.get("callbackUrl");
    if (cb && cb.startsWith("/")) return cb;
    return resolveStorefrontHref(publicBasePath, basePath);
  }, [basePath, publicBasePath, searchParams]);

  const registerHref = resolveStorefrontHref(publicBasePath, `${basePath}/register`);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prefillEmail = searchParams.get("email");
    if (prefillEmail && !email) setEmail(prefillEmail);
  }, [email, searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl,
    });

    if (!res || res.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    router.push(res.url ?? callbackUrl);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md animate-fade-in">
        <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
        {subtitle ? <p className="mt-3 text-sm text-zinc-400">{subtitle}</p> : null}

        <form onSubmit={onSubmit} className="mt-8 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="you@example.com"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="••••••••"
            />
          </label>

          {error ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-sm text-zinc-400">
            Don’t have an account?{" "}
            <Link className="text-white hover:underline" href={registerHref}>
              Create one
            </Link>
            .
          </div>
        </form>
      </div>
    </div>
  );
}
