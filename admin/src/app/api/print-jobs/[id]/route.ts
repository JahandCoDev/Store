// admin/src/app/api/print-jobs/[id]/route.ts
// GET: Retrieve a single print job
// PATCH: Agent reports status (PRINTING / DONE / FAILED)

import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { cookies } from "next/headers";
import { resolveDatadogAppAuth } from "@/lib/serviceAuth";

const VALID_REPORT_STATUSES = ["PRINTING", "DONE", "FAILED"] as const;
type ReportStatus = (typeof VALID_REPORT_STATUSES)[number];

async function getSelectedShopId(): Promise<string> {
  const cookieStore = await cookies();
  const shopId = cookieStore.get("shopId")?.value ?? "";
  return shopId === "jahandco-shop" || shopId === "jahandco-dev" ? shopId : "jahandco-shop";
}

type ResolvedAuth =
  | { ok: true; shopId: string; isAgent: boolean }
  | { ok: false; status: 400 | 401; error: string };

async function resolveAuth(req: NextRequest): Promise<ResolvedAuth> {
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();

    const ddToken = process.env.DD_ADMIN_APP_TOKEN;
    if (ddToken && token === ddToken) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return dd;
      return { ok: true, shopId: dd.shopId, isAgent: false };
    }

    const agentToken = process.env.PRINT_AGENT_TOKEN;
    if (agentToken && token === agentToken) {
      const agentShopId = req.headers.get("x-shop-id")?.trim() ?? "";
      if (!agentShopId) return { ok: false, status: 400, error: "x-shop-id header is required" };
      return { ok: true, shopId: agentShopId, isAgent: true };
    }

    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string; role?: string })?.id;
  const role = (session?.user as { id?: string; role?: string })?.role;
  if (!session || !userId || role !== "ADMIN") return { ok: false, status: 401, error: "Unauthorized" };

  const shopId = await getSelectedShopId();

  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
    select: { id: true },
  });
  if (!membership) return { ok: false, status: 401, error: "Unauthorized" };

  return { ok: true, shopId, isAgent: false };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await resolveAuth(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

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
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

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
