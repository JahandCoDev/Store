import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export const runtime = "nodejs";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const email = normalizeEmail(session?.user?.email);
  if (!session?.user || !email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const body: unknown = await req.json().catch(() => ({}));
  const bodyObj = isRecord(body) ? body : null;
  const decisionRaw = asString(bodyObj?.decision).trim().toUpperCase();
  const feedback = asString(bodyObj?.feedback).trim();

  if (decisionRaw !== "APPROVED" && decisionRaw !== "DENIED") {
    return NextResponse.json({ error: "decision must be APPROVED or DENIED" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const proposal = await prisma.customDesignProposal.findUnique({
    where: { id },
    include: { request: { select: { id: true, userId: true } } },
  });

  if (!proposal || proposal.request.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.customDesignProposal.update({
    where: { id },
    data: {
      customerDecision: decisionRaw as "APPROVED" | "DENIED",
      customerFeedback: feedback || null,
      decidedAt: new Date(),
    },
    select: { id: true, requestId: true },
  });

  // Keep request status aligned with latest decision
  if (decisionRaw === "APPROVED") {
    await prisma.customDesignRequest.update({
      where: { id: updated.requestId },
      data: { status: "APPROVED" },
      select: { id: true },
    });
  }

  if (decisionRaw === "DENIED") {
    await prisma.customDesignRequest.update({
      where: { id: updated.requestId },
      data: { status: "DENIED" },
      select: { id: true },
    });
  }

  return NextResponse.json({ ok: true });
}
