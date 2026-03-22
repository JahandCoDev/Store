"use client";

import { useState } from "react";

type State =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export default function HomeEmailSignup({ store }: { store: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });

  function errorFromJson(value: unknown): string | null {
    if (!value || typeof value !== "object") return null;
    if (!("error" in value)) return null;
    const err = (value as { error?: unknown }).error;
    return typeof err === "string" ? err : null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state.status === "saving") return;

    const trimmed = email.trim();
    if (!trimmed) {
      setState({ status: "error", message: "Email is required." });
      return;
    }

    setState({ status: "saving" });

    try {
      const res = await fetch(`/api/storefront/email-signup?store=${encodeURIComponent(store)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) {
        const json: unknown = await res.json().catch(() => null);
        const message =
          errorFromJson(json) ?? "Failed to sign up.";
        throw new Error(message);
      }

      setEmail("");
      setState({ status: "success", message: "You’re in. Watch your inbox." });
      setTimeout(() => setState({ status: "idle" }), 2000);
    } catch (err: unknown) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Failed to sign up." });
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        className="w-full flex-1 rounded-full border border-white/10 bg-zinc-950/60 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
      />
      <button className="btn btn-primary" type="submit" disabled={state.status === "saving"}>
        {state.status === "saving" ? "Signing up…" : "Sign up"}
      </button>

      {state.status === "error" ? (
        <div className="text-sm text-red-200">{state.message}</div>
      ) : null}
      {state.status === "success" ? (
        <div className="text-sm text-emerald-200">{state.message}</div>
      ) : null}
    </form>
  );
}
