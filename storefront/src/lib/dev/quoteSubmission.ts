import { resolveShopIdForStore } from "@/lib/storefront/store";

export type QuoteSubmissionInput = {
  store: string;
  name: string;
  email: string;
  phone?: string;
  selectedPlan?: string;
  projectType: string;
  budgetRange: string;
  timeline: string;
  addOns: string[];
  details: string;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

export function parseQuoteSubmissionInput(body: unknown): QuoteSubmissionInput | null {
  if (!body || typeof body !== "object") return null;

  const record = body as Record<string, unknown>;
  const input: QuoteSubmissionInput = {
    store: normalizeString(record.store),
    name: normalizeString(record.name),
    email: normalizeString(record.email).toLowerCase(),
    phone: normalizeString(record.phone) || undefined,
    selectedPlan: normalizeString(record.selectedPlan) || undefined,
    projectType: normalizeString(record.projectType),
    budgetRange: normalizeString(record.budgetRange),
    timeline: normalizeString(record.timeline),
    addOns: normalizeArray(record.addOns),
    details: normalizeString(record.details),
  };

  if (
    !input.store ||
    !input.name ||
    !input.email.includes("@") ||
    !input.projectType ||
    !input.budgetRange ||
    !input.timeline ||
    !input.details
  ) {
    return null;
  }

  return input;
}

export function resolveQuoteShopId(store: string) {
  return resolveShopIdForStore(store === "dev" ? "dev" : "shop");
}

export function formatQuoteAddOns(addOns: string[]) {
  return addOns.length ? addOns.join(", ") : "None selected";
}