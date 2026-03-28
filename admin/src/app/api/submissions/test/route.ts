import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getQuoteEmailPreview, sendQuotePreviewEmail } from "@/lib/email/quoteSubmissionMailer";

async function requireAdminAndShopAccess() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string; role?: string; email?: string } | null | undefined)?.id;
  const role = (session?.user as { id?: string; role?: string; email?: string } | null | undefined)?.role;
  const email = (session?.user as { id?: string; role?: string; email?: string } | null | undefined)?.email;

  if (!session || !userId || role !== "ADMIN") return null;

  return { email: email || null };
}

function getMode(req: Request) {
  const url = new URL(req.url);
  return url.searchParams.get("mode") === "admin" ? "admin" : "customer";
}

export async function GET(req: Request) {
  const access = await requireAdminAndShopAccess();
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const preview = getQuoteEmailPreview({ mode: getMode(req) });
  return new NextResponse(preview.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: Request) {
  const access = await requireAdminAndShopAccess();
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { email?: string; mode?: string };
  const to = typeof body.email === "string" && body.email.trim() ? body.email.trim() : access.email;
  if (!to) {
    return NextResponse.json({ error: "Provide an email or sign in with an email-based admin account" }, { status: 400 });
  }

  const mode = body.mode === "admin" ? "admin" : "customer";
  const result = await sendQuotePreviewEmail({ to, mode });
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Failed to send preview email" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, to, mode });
}