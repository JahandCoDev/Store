// admin/src/app/api/print-jobs/[id]/route.ts
// GET: Retrieve a single print job
// PATCH: Agent reports status (PRINTING / DONE / FAILED)

import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { cookies } from "next/headers";

const VALID_REPORT_STATUSES = ["PRINTING", "DONE", "FAILED"] as const;
type ReportStatus = (typeof VALID_REPORT_STATUSES)[number];

function getSelectedShopId(): string | null {
  return cookies().get("shopId")?.value ?? null;
}

async function resolveAuth(req: NextRequest): Promise<{ shopId: string; isAgent: boolean } | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const agentToken = process.env.PRINT_AGENT_TOKEN;
    if (agentToken && token === agentToken) {
      const agentShopId = req.headers.get("x-shop-id");
      if (agentShopId) return { shopId: agentShopId, isAgent: true };
    }
    return null;
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string; role?: string })?.id;
  const role = (session?.user as { id?: string; role?: string })?.role;
  if (!session || !userId || role !== "ADMIN") return null;

  const shopId = getSelectedShopId();
  if (!shopId) return null;

  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
    select: { id: true },
  });
  if (!membership) return null;

  return { shopId, isAgent: false };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await resolveAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const job = await prisma.printJob.findFirst({ where: { id, shopId: auth.shopId } });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(job);
  } catch (error) {
    console.error("Failed to fetch print job:", error);
    return NextResponse.json({ error: "Failed to fetch print job" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await resolveAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    const status = body?.status as string | undefined;
    if (!status || !VALID_REPORT_STATUSES.includes(status as ReportStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_REPORT_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const existing = await prisma.printJob.findFirst({ where: { id, shopId: auth.shopId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.printJob.update({
      where: { id },
      data: {
        status: status as ReportStatus,
        errorText: typeof body?.errorText === "string" ? body.errorText : null,
        reportedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update print job:", error);
    return NextResponse.json({ error: "Failed to update print job" }, { status: 500 });
  }
}
