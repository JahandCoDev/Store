import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { resolveCoreShopIdFromCookie } from "@/lib/serviceAuth";
import { sendQuoteSubmissionEmails } from "@/lib/email/quoteSubmissionMailer";

const VALID_STATUSES = ["NEW", "REVIEWED", "CONTACTED", "ARCHIVED"] as const;
type QuoteSubmissionStatus = (typeof VALID_STATUSES)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function requireAdminAndShopAccess() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string; role?: string } | null | undefined)?.id;
  const role = (session?.user as { id?: string; role?: string } | null | undefined)?.role;
  if (!session || !userId || role !== "ADMIN") return null;

  const shopId = await resolveCoreShopIdFromCookie();
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
    select: { id: true },
  });

  if (!membership) return null;
  return { shopId };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireAdminAndShopAccess();
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await ctx.params;
    const body: unknown = await req.json().catch(() => ({}));
    const bodyObj = isRecord(body) ? body : null;
    const nextStatus = typeof bodyObj?.status === "string" ? bodyObj.status : "";

    if (!VALID_STATUSES.includes(nextStatus as QuoteSubmissionStatus)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
    }

    const updated = await prisma.quoteSubmission.updateMany({
      where: { id, shopId: access.shopId },
      data: { status: nextStatus as QuoteSubmissionStatus },
    });

    if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) {
    console.error("Failed to update quote submission status:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireAdminAndShopAccess();
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await ctx.params;
    const submission = await prisma.quoteSubmission.findFirst({
      where: { id, shopId: access.shopId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        selectedPlan: true,
        projectType: true,
        budgetRange: true,
        timeline: true,
        addOns: true,
        details: true,
        createdAt: true,
      },
    });

    if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const emailResult = await sendQuoteSubmissionEmails(submission);

    await prisma.quoteSubmission.update({
      where: { id: submission.id },
      data: {
        adminNotifiedAt: emailResult.adminNotified ? new Date() : null,
        customerAcknowledgedAt: emailResult.customerAcknowledged ? new Date() : null,
        lastEmailError: emailResult.error,
      },
    });

    if (emailResult.error) {
      return NextResponse.json({ error: emailResult.error }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to resend quote submission emails:", error);
    return NextResponse.json({ error: "Failed to resend emails" }, { status: 500 });
  }
}