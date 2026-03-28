import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { resolveDatadogAppAuth } from "@/lib/serviceAuth";

type PrismaTx = Parameters<typeof prisma.$transaction>[0] extends (tx: infer T) => unknown ? T : never;

function hasBearerAuth(req: Request): boolean {
  return (req.headers.get("authorization") ?? "").startsWith("Bearer ");
}

async function requireAdminAccess() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | null | undefined)?.id;
  const role = (session?.user as { role?: string } | null | undefined)?.role;
  if (!session || !userId || role !== "ADMIN") return null;

  return { userId };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (hasBearerAuth(req)) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return NextResponse.json({ error: dd.error }, { status: dd.status });
    } else {
      const auth = await requireAdminAccess();
      if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const customer = await prisma.user.findFirst({
      where: { displayId: id },
      include: {
        addresses: { orderBy: { createdAt: "desc" } },
        notes: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(customer);
  } catch (error) {
    console.error("Failed to fetch customer:", error);
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (hasBearerAuth(req)) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return NextResponse.json({ error: dd.error }, { status: dd.status });
    } else {
      const auth = await requireAdminAccess();
      if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const body: unknown = await req.json().catch(() => ({}));
    const bodyObj = isRecord(body) ? body : null;

    const data: {
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      dateOfBirth?: Date | null;
    } = {};

    let hasUpdate = false;
    if (bodyObj && (typeof bodyObj.firstName === "string" || typeof bodyObj.lastName === "string")) {
      const first = typeof bodyObj.firstName === "string" ? bodyObj.firstName.trim() : "";
      const last = typeof bodyObj.lastName === "string" ? bodyObj.lastName.trim() : "";
      if (typeof bodyObj.firstName === "string") data.firstName = first || null;
      if (typeof bodyObj.lastName === "string") data.lastName = last || null;
      hasUpdate = true;
    }
    if (bodyObj && typeof bodyObj.phone === "string") {
      data.phone = bodyObj.phone.trim() || null;
      hasUpdate = true;
    }
    if (bodyObj && typeof bodyObj.dateOfBirth === "string") {
      data.dateOfBirth = bodyObj.dateOfBirth.trim() ? new Date(bodyObj.dateOfBirth.trim()) : null;
      hasUpdate = true;
    }

    const updated = await prisma.$transaction(async (tx: PrismaTx) => {
      const exists = await tx.user.findFirst({ where: { displayId: id }, select: { id: true } });
      if (!exists) return null;

      const updateData = hasUpdate ? data : {};

      const customer = await tx.user.update({
        where: { id: exists.id },
        data: updateData,
        select: {
          id: true,
          displayId: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          dateOfBirth: true,
          updatedAt: true,
        },
      });

      return customer;
    });

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update customer:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (hasBearerAuth(req)) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return NextResponse.json({ error: dd.error }, { status: dd.status });
    } else {
      const auth = await requireAdminAccess();
      if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const customer = await prisma.user.findFirst({ where: { displayId: id }, select: { id: true } });
    if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const deleted = await prisma.user.deleteMany({ where: { id: customer.id } });
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete customer:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
