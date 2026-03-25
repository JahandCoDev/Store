"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { usePublicBasePath } from "@/lib/storefront/usePublicBasePath";

export default function RegisterForm({
  store,
  basePath,
  title = "Create account",
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

  const loginHref = resolveStorefrontHref(publicBasePath, `${basePath}/login`);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/storefront/account/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ store, email, password, firstName, lastName }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      setError(text || "Failed to create account");
      setLoading(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl,
    });

    if (!signInResult || signInResult.error) {
      router.push(resolveStorefrontHref(publicBasePath, `${basePath}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`));
      return;
    }

    router.push(signInResult.url ?? callbackUrl);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md animate-fade-in">
        <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
        {subtitle ? <p className="mt-3 text-sm text-zinc-400">{subtitle}</p> : null}

        <form onSubmit={onSubmit} className="mt-8 grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm text-zinc-300">First name</span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="Jah"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-zinc-300">Last name</span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="Doe"
              />
            </label>
          </div>

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
              placeholder="At least 8 characters"
            />
            <span className="text-xs text-zinc-500">Minimum 8 characters.</span>
          </label>

          {error ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>

          <div className="text-sm text-zinc-400">
            Already have an account?{" "}
            <Link className="text-white hover:underline" href={loginHref}>
              Sign in
            </Link>
            .
          </div>
        </form>
      </div>
    </div>
  );
}
