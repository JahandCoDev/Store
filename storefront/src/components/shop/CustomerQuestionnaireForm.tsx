"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { usePublicBasePath } from "@/lib/storefront/usePublicBasePath";

type StyleSurveySubmission = {
  id: string;
  answers: unknown;
  version: string | null;
  submittedAt: string;
  updatedAt: string;
} | null;

type Customer = {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  styleSurvey?: StyleSurveySubmission;
} | null;

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  horoscope: string;
  favoriteColor: string;
  personalInterest: string;
  specificInterests: string[];
};

const HOROSCOPES = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

const SPECIFIC_INTERESTS = [
  "Sun, Moon, Stars",
  "Skulls, Crossbones",
  "Butterflies and Flowers",
  "Rad Graphics, Bright Colors",
  "Vintage",
  "Retro",
] as const;

const MAX_SPECIFIC_INTERESTS = 3;
const VERSION = "customer-questionnaire-v1";
const PENDING_STORAGE_KEY = "pendingStyleSurveySubmission";

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parsePending(raw: string | null): { answers: Record<string, unknown>; version: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    if (!obj.answers || typeof obj.answers !== "object") return null;
    const version = typeof obj.version === "string" ? obj.version : VERSION;
    return { answers: obj.answers as Record<string, unknown>, version };
  } catch {
    return null;
  }
}

function hydrateStateFromAnswers(prev: FormState, incoming: Record<string, unknown>): FormState {
  const next: FormState = { ...prev };

  if (typeof incoming.firstName === "string") next.firstName = incoming.firstName;
  if (typeof incoming.lastName === "string") next.lastName = incoming.lastName;
  if (typeof incoming.email === "string") next.email = incoming.email;
  if (typeof incoming.phone === "string") next.phone = incoming.phone;
  if (typeof incoming.dateOfBirth === "string") next.dateOfBirth = incoming.dateOfBirth;

  if (typeof incoming.horoscope === "string") next.horoscope = incoming.horoscope;
  if (typeof incoming.favoriteColor === "string") next.favoriteColor = incoming.favoriteColor;
  if (typeof incoming.personalInterest === "string") next.personalInterest = incoming.personalInterest;
  if (Array.isArray(incoming.specificInterests)) {
    next.specificInterests = incoming.specificInterests
      .filter((v): v is string => typeof v === "string")
      .slice(0, MAX_SPECIFIC_INTERESTS);
  }

  return next;
}

export default function CustomerQuestionnaireForm({ store }: { store: string }) {
  const router = useRouter();
  const publicBasePath = usePublicBasePath(store);

  const loginHrefBase = resolveStorefrontHref(publicBasePath, "/account/login");
  const registerHrefBase = resolveStorefrontHref(publicBasePath, "/account/register");
  const callbackUrl = resolveStorefrontHref(publicBasePath, "/customer-questionnaire");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<StyleSurveySubmission>(null);

  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [state, setState] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    horoscope: "",
    favoriteColor: "",
    personalInterest: "",
    specificInterests: [],
  });

  const answers = useMemo(
    () => ({
      firstName: state.firstName.trim(),
      lastName: state.lastName.trim(),
      email: state.email.trim().toLowerCase(),
      phone: state.phone.trim(),
      dateOfBirth: state.dateOfBirth.trim(),
      horoscope: state.horoscope,
      favoriteColor: state.favoriteColor.trim(),
      personalInterest: state.personalInterest.trim(),
      specificInterests: state.specificInterests.slice(0, MAX_SPECIFIC_INTERESTS),
    }),
    [state],
  );

  const loginHref = useMemo(() => {
    const url = new URL(loginHrefBase, "http://localhost");
    url.searchParams.set("callbackUrl", callbackUrl);
    if (answers.email) url.searchParams.set("email", answers.email);
    return url.pathname + url.search;
  }, [answers.email, callbackUrl, loginHrefBase]);

  const registerHref = useMemo(() => {
    const url = new URL(registerHrefBase, "http://localhost");
    url.searchParams.set("callbackUrl", callbackUrl);
    if (answers.firstName) url.searchParams.set("firstName", answers.firstName);
    if (answers.lastName) url.searchParams.set("lastName", answers.lastName);
    if (answers.email) url.searchParams.set("email", answers.email);
    if (answers.phone) url.searchParams.set("phone", answers.phone);
    if (answers.dateOfBirth) url.searchParams.set("dateOfBirth", answers.dateOfBirth);
    return url.pathname + url.search;
  }, [answers, callbackUrl, registerHrefBase]);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomer() {
      setLoading(true);
      setError(null);
      setShowAuthPrompt(false);

      try {
        const res = await fetch("/api/storefront/account/me", { method: "GET" });
        if (res.status === 401) {
          if (cancelled) return;
          setIsLoggedIn(false);
          setExistingSubmission(null);

          const pendingRaw = localStorage.getItem(PENDING_STORAGE_KEY);
          const pending = parsePending(pendingRaw);
          if (pending) {
            setState((prev) => hydrateStateFromAnswers(prev, pending.answers));
          }

          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error(await res.text());

        const customer = (await res.json()) as Customer;
        if (cancelled) return;

        setIsLoggedIn(true);
        setExistingSubmission(customer?.styleSurvey ?? null);

        const nextState: FormState = {
          firstName: safeString(customer?.firstName),
          lastName: safeString(customer?.lastName),
          email: safeString(customer?.email).toLowerCase(),
          phone: safeString(customer?.phone),
          dateOfBirth: toDateInputValue(customer?.dateOfBirth ?? null),
          horoscope: "",
          favoriteColor: "",
          personalInterest: "",
          specificInterests: [],
        };

        // If we already have a submission, show it (no resubmits).
        const existingAnswers = customer?.styleSurvey?.answers;
        if (existingAnswers && typeof existingAnswers === "object") {
          const obj = existingAnswers as Record<string, unknown>;
          nextState.horoscope = safeString(obj.horoscope);
          nextState.favoriteColor = safeString(obj.favoriteColor);
          nextState.personalInterest = safeString(obj.personalInterest);
          const list = Array.isArray(obj.specificInterests) ? obj.specificInterests : [];
          nextState.specificInterests = list.filter((v): v is string => typeof v === "string").slice(0, MAX_SPECIFIC_INTERESTS);
        }

        setState((prev) => ({
          ...prev,
          ...nextState,
        }));

        // Restore + auto-submit pending payload after login.
        const pendingRaw = localStorage.getItem(PENDING_STORAGE_KEY);
        const pending = parsePending(pendingRaw);
        if (!pending) {
          setLoading(false);
          return;
        }

        setState((prev) => hydrateStateFromAnswers(prev, pending.answers));

        // If already submitted, drop pending.
        if (customer?.styleSurvey) {
          localStorage.removeItem(PENDING_STORAGE_KEY);
          setLoading(false);
          return;
        }

        setSaving(true);
        try {
          const submitRes = await fetch(`/api/storefront/style-survey?store=${encodeURIComponent(store)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pending),
          });

          if (submitRes.status === 409) {
            localStorage.removeItem(PENDING_STORAGE_KEY);
            const json = (await submitRes.json().catch(() => null)) as { submission?: StyleSurveySubmission } | null;
            setExistingSubmission(json?.submission ?? null);
            setLoading(false);
            return;
          }

          if (!submitRes.ok) throw new Error(await submitRes.text());
          localStorage.removeItem(PENDING_STORAGE_KEY);
          router.push(resolveStorefrontHref(publicBasePath, "/survey-thank-you"));
          return;
        } finally {
          if (!cancelled) setSaving(false);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCustomer();
    return () => {
      cancelled = true;
    };
  }, [publicBasePath, router, store]);

  function toggleSpecificInterest(value: string) {
    setState((s) => {
      const already = s.specificInterests.includes(value);
      if (already) {
        return { ...s, specificInterests: s.specificInterests.filter((v) => v !== value) };
      }
      if (s.specificInterests.length >= MAX_SPECIFIC_INTERESTS) {
        return s;
      }
      return { ...s, specificInterests: [...s.specificInterests, value] };
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (existingSubmission) {
      setError("This survey has already been submitted.");
      return;
    }

    // Client-side required fields per survey.txt
    if (!answers.firstName || !answers.lastName || !answers.email || !answers.dateOfBirth) {
      setError("First name, last name, email, and date of birth are required.");
      return;
    }

    if (!answers.horoscope) {
      setError("Horoscope is required.");
      return;
    }

    if (!answers.favoriteColor) {
      setError("Favorite color is required.");
      return;
    }

    if (!answers.personalInterest) {
      setError("Personal interest is required.");
      return;
    }

    if (!answers.specificInterests.length) {
      setError(`Select up to ${MAX_SPECIFIC_INTERESTS} specific interests.`);
      return;
    }

    if (!isLoggedIn) {
      localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify({ answers, version: VERSION }));
      setShowAuthPrompt(true);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/storefront/style-survey?store=${encodeURIComponent(store)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, version: VERSION }),
      });

      if (res.status === 409) {
        const json = (await res.json().catch(() => null)) as { submission?: StyleSurveySubmission } | null;
        setExistingSubmission(json?.submission ?? null);
        setError("This survey has already been submitted.");
        return;
      }

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify({ answers, version: VERSION }));
          setShowAuthPrompt(true);
          return;
        }
        throw new Error(await res.text());
      }

      router.push(resolveStorefrontHref(publicBasePath, "/survey-thank-you"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-zinc-400">Loading…</div>;
  }

  const infoDisabled = isLoggedIn;
  const alreadySubmitted = Boolean(existingSubmission);

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="grid gap-6 rounded-2xl border border-white/10 bg-zinc-950/40 p-6">
        <div className="space-y-1">
          <div className="text-lg font-semibold text-white">Customer questionnaire</div>
          <div className="text-sm text-zinc-400">
            {alreadySubmitted
              ? `Submitted ${new Date(existingSubmission!.submittedAt).toLocaleString()}`
              : "Complete the survey to create your Style Profile."}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="text-sm font-medium text-zinc-200">Info</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm text-zinc-300">First name *</span>
              <input
                value={state.firstName}
                disabled={infoDisabled}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setState((s) => ({ ...s, firstName: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="First name"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-zinc-300">Last name *</span>
              <input
                value={state.lastName}
                disabled={infoDisabled}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setState((s) => ({ ...s, lastName: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="Last name"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">Email *</span>
            <input
              type="email"
              value={state.email}
              disabled={infoDisabled}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setState((s) => ({ ...s, email: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="you@example.com"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">Phone</span>
            <input
              value={state.phone}
              disabled={infoDisabled}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setState((s) => ({ ...s, phone: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="(optional)"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">Date of birth *</span>
            <input
              type="date"
              value={state.dateOfBirth}
              disabled={infoDisabled}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setState((s) => ({ ...s, dateOfBirth: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </label>
        </div>

        <div className="grid gap-4">
          <div className="text-sm font-medium text-zinc-200">Style</div>

          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">Horoscope *</span>
            <select
              value={state.horoscope}
              disabled={alreadySubmitted}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setState((s) => ({ ...s, horoscope: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <option value="">Select</option>
              {HOROSCOPES.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">Favorite color *</span>
            <input
              value={state.favoriteColor}
              disabled={alreadySubmitted}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setState((s) => ({ ...s, favoriteColor: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="e.g. black"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">Personal interest *</span>
            <textarea
              value={state.personalInterest}
              disabled={alreadySubmitted}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setState((s) => ({ ...s, personalInterest: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/20"
              rows={4}
              placeholder="Tell us about your personal interests"
            />
          </label>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-zinc-300">Specific interests (pick up to {MAX_SPECIFIC_INTERESTS}) *</div>
              <div className="text-xs text-zinc-500">{state.specificInterests.length}/{MAX_SPECIFIC_INTERESTS}</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {SPECIFIC_INTERESTS.map((opt) => {
                const checked = state.specificInterests.includes(opt);
                const disabled = alreadySubmitted || (!checked && state.specificInterests.length >= MAX_SPECIFIC_INTERESTS);

                return (
                  <label key={opt} className="flex items-start gap-3 rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleSpecificInterest(opt)}
                      className="mt-1"
                    />
                    <span className={disabled ? "opacity-60" : ""}>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {showAuthPrompt ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-medium text-white">Sign in required</div>
            <div className="mt-1 text-sm text-zinc-400">
              Create an account or sign in to submit. After you sign in, we’ll bring you back here and submit automatically.
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className="btn btn-primary" href={loginHref}>
                Sign in
              </Link>
              <Link className="btn btn-secondary" href={registerHref}>
                Create account
              </Link>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" type="submit" disabled={saving || alreadySubmitted}>
            {alreadySubmitted ? "Submitted" : saving ? "Submitting…" : "Submit survey"}
          </button>
          <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/custom-apparel")}>
            Back to Custom Apparel
          </Link>
        </div>
      </form>

      <div className="text-xs text-zinc-500">
        {isLoggedIn ? "You’re signed in." : "You can view this page without an account."}
      </div>
    </div>
  );
}
