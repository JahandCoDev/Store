// admin/src/app/api/orders/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { resolveDatadogAppAuth } from "@/lib/serviceAuth";

const VALID_STATUSES = ["PENDING", "AUTHORIZED", "PROCESSING", "COMPLETED", "CANCELLED", "REFUNDED"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasBearerAuth(req: Request): boolean {
  return (req.headers.get("authorization") ?? "").startsWith("Bearer ");
}

async function requireAdminAccess() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string; role?: string })?.id;
  const role = (session?.user as { id?: string; role?: string })?.role;
  if (!session || !userId || role !== "ADMIN") return null;

  return { userId };
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
    const order = await prisma.order.findFirst({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        orderItems: {
          include: { variant: true },
        },
        fulfillment: true,
      },
    });

    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(order);
  } catch (error) {
    console.error("Failed to fetch order:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
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

    const existing = await prisma.order.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: {
      status?: OrderStatus;
      shippingName?: string | null;
      shippingPhone?: string | null;
      shippingLine1?: string | null;
      shippingLine2?: string | null;
      shippingCity?: string | null;
      shippingState?: string | null;
      shippingZip?: string | null;
      shippingCountry?: string | null;
    } = {};

    if (bodyObj && typeof bodyObj.status === "string") {
      const status = bodyObj.status;
      if (!VALID_STATUSES.includes(status as OrderStatus)) {
        return NextResponse.json(
          { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }
      data.status = status as OrderStatus;
    }

    const shippingAddress = bodyObj?.shippingAddress;
    if (isRecord(shippingAddress)) {
      if (typeof shippingAddress.name === "string") data.shippingName = shippingAddress.name.trim() || null;
      if (typeof shippingAddress.phone === "string") data.shippingPhone = shippingAddress.phone.trim() || null;
      if (typeof shippingAddress.line1 === "string") data.shippingLine1 = shippingAddress.line1.trim() || null;
      if (typeof shippingAddress.line2 === "string") data.shippingLine2 = shippingAddress.line2.trim() || null;
      if (typeof shippingAddress.city === "string") data.shippingCity = shippingAddress.city.trim() || null;
      if (typeof shippingAddress.state === "string") data.shippingState = shippingAddress.state.trim() || null;
      if (typeof shippingAddress.zip === "string") data.shippingZip = shippingAddress.zip.trim() || null;
      if (typeof shippingAddress.country === "string")
        data.shippingCountry = shippingAddress.country.trim() || "US";
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const updated = await prisma.order.update({
      where: { id },
      data,
      select: {
        id: true,
        status: true,
        shippingName: true,
        shippingPhone: true,
        shippingLine1: true,
        shippingLine2: true,
        shippingCity: true,
        shippingState: true,
        shippingZip: true,
        shippingCountry: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
