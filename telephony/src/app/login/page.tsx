// src/app/login/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="relative min-h-screen bg-black">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-navy-800/25 blur-3xl" />
        <div className="absolute -bottom-32 right-[-6rem] h-72 w-72 rounded-full bg-gray-900/70 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-gray-900/20" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-stretch px-4 sm:px-6 lg:px-8">
        {/* Left panel */}
        <div className="hidden w-1/2 flex-col justify-between py-12 pr-10 lg:flex">
          <div>
            <div className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 ring-1 ring-gray-800">
                <span className="text-sm font-bold tracking-wider text-gray-200">JC</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-200">JahandCo</p>
                <p className="text-xs text-gray-400">Voice Admin</p>
              </div>
            </div>

            <h1 className="mt-10 text-4xl font-bold tracking-tight text-foreground">
              Telephony control panel.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-gray-400">
              Manage incoming calls, answer queued callers via WebRTC, and control the IVR. Access
              is restricted to admin accounts.
            </p>

            <div className="mt-10 grid max-w-md grid-cols-1 gap-4">
              <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4">
                <p className="text-sm font-medium text-gray-200">Real-time call queue</p>
                <p className="mt-1 text-xs text-gray-400">
                  See waiting callers and answer from your browser.
                </p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4">
                <p className="text-sm font-medium text-gray-200">WebRTC audio</p>
                <p className="mt-1 text-xs text-gray-400">
                  Crystal-clear calls via LiveKit, no phone hardware needed.
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} JahandCo. All rights reserved.
          </p>
        </div>

        {/* Right panel */}
        <div className="flex w-full items-center justify-center py-10 lg:w-1/2 lg:justify-end">
          <div className="w-full max-w-md">
            <div className="mb-6 lg:hidden">
              <p className="text-sm font-semibold text-gray-200">JahandCo</p>
              <p className="text-xs text-gray-400">Voice Admin</p>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-8 shadow-lg ring-1 ring-black/30">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Sign in</h2>
                <p className="mt-1 text-sm text-gray-400">Use your admin email and password.</p>
              </div>

              <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                {error ? (
                  <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-300">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="block w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 placeholder-gray-400 focus:border-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-800/40"
                      placeholder="admin@jahandco.dev"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1 block text-sm font-medium text-gray-300"
                    >
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      autoComplete="current-password"
                      className="block w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 placeholder-gray-400 focus:border-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-800/40"
                      placeholder="••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-md bg-navy-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-800/60 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50"
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>

                <p className="text-xs text-gray-500">
                  Access is restricted to admin accounts. If you believe this is an error, contact
                  your system administrator.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
