// admin/src/app/api/print-jobs/route.ts
// GET: Admin lists print jobs  |  PrintAgent polls with ?status=QUEUED
// POST: Admin (or system) creates a new print job

import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { resolveDatadogAppAuth } from "@/lib/serviceAuth";

const PRINT_JOB_TYPES = ["SHIPPING_LABEL", "INVOICE", "PACKING_SLIP", "PICK_LIST"] as const;

/**
 * Validate the request is either:
 *  a) An authenticated admin session, OR
 *  b) A Windows print agent carrying the scoped PRINT_AGENT_TOKEN.
 */
type ResolvedAuth =
  | { ok: true; isAgent: boolean }
  | { ok: false; status: 400 | 401; error: string };

async function resolveAuth(req: NextRequest): Promise<ResolvedAuth> {
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();

    const ddToken = process.env.DD_ADMIN_APP_TOKEN;
    if (ddToken && token === ddToken) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return dd;
      return { ok: true, isAgent: false };
    }

    const agentToken = process.env.PRINT_AGENT_TOKEN;
    if (agentToken && token === agentToken) {
      return { ok: true, isAgent: true };
    }

    return { ok: false, status: 401, error: "Unauthorized" };
  }

  // Admin session path
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string; role?: string })?.id;
  const role = (session?.user as { id?: string; role?: string })?.role;
  if (!session || !userId || role !== "ADMIN") return { ok: false, status: 401, error: "Unauthorized" };

  return { ok: true, isAgent: false };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuth(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const status = req.nextUrl.searchParams.get("status") ?? undefined;

    const jobs = await prisma.printJob.findMany({
      where: {
        ...(status ? { status: status as "QUEUED" | "PRINTING" | "DONE" | "FAILED" } : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Failed to fetch print jobs:", error);
    return NextResponse.json({ error: "Failed to fetch print jobs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuth(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => ({}));

    const type = typeof body?.type === "string" ? body.type.trim().toUpperCase() : "";
    if (!PRINT_JOB_TYPES.includes(type as (typeof PRINT_JOB_TYPES)[number])) {
      return NextResponse.json(
        { error: `type must be one of: ${PRINT_JOB_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const job = await prisma.printJob.create({
      data: {
        type,
        assetUrl: typeof body?.assetUrl === "string" ? body.assetUrl.trim() : null,
        printerName: typeof body?.printerName === "string" ? body.printerName.trim() : null,
        metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : {},
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("Failed to create print job:", error);
    return NextResponse.json({ error: "Failed to create print job" }, { status: 500 });
  }
}
