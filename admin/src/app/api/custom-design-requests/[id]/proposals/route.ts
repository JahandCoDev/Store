import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export const runtime = "nodejs";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const body: unknown = await req.json().catch(() => ({}));
  const bodyObj = isRecord(body) ? body : null;
  const assetId = asString(bodyObj?.assetId).trim();
  const adminMessage = asString(bodyObj?.adminMessage).trim();

  if (!assetId) return NextResponse.json({ error: "assetId is required" }, { status: 400 });

  const request = await prisma.customDesignRequest.findUnique({ where: { id }, select: { id: true } });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  await prisma.customDesignProposal.create({
    data: {
      requestId: request.id,
      assetId,
      adminMessage: adminMessage || null,
    },
    select: { id: true },
  });

  await prisma.customDesignRequest.update({
    where: { id: request.id },
    data: { status: "DESIGN_SENT" },
    select: { id: true },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
