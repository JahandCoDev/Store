import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { resolveCoreShopIdFromCookie, resolveDatadogAppAuth } from "@/lib/serviceAuth";

async function getSelectedShopId(): Promise<string> {
  return resolveCoreShopIdFromCookie();
}

function hasBearerAuth(req: Request): boolean {
  return (req.headers.get("authorization") ?? "").startsWith("Bearer ");
}

async function requireShopAccess(shopId: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | null | undefined)?.id;
  const role = (session?.user as { role?: string } | null | undefined)?.role;
  if (!session || !userId || role !== "ADMIN") return null;

  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
    select: { id: true },
  });
  if (!membership) return null;

  return { userId };
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    let shopId: string;
    if (hasBearerAuth(req)) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return NextResponse.json({ error: dd.error }, { status: dd.status });
      shopId = dd.shopId;
    } else {
      shopId = await getSelectedShopId();
      const auth = await requireShopAccess(shopId);
      if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: customerId } = await ctx.params;

    const customer = await prisma.customer.findFirst({ where: { id: customerId, shopId }, select: { id: true } });
    if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));

    const line1 = typeof body?.line1 === "string" ? body.line1.trim() : "";
    const line2 = typeof body?.line2 === "string" ? body.line2.trim() || null : null;
    const city = typeof body?.city === "string" ? body.city.trim() : "";
    const state = typeof body?.state === "string" ? body.state.trim() : "";
    const zip = typeof body?.zip === "string" ? body.zip.trim() : "";
    const country = typeof body?.country === "string" ? body.country.trim() || "US" : "US";
    const name = typeof body?.name === "string" ? body.name.trim() || null : null;
    const phone = typeof body?.phone === "string" ? body.phone.trim() || null : null;
    const isDefault = typeof body?.isDefault === "boolean" ? body.isDefault : false;

    if (!line1 || !city || !state || !zip) {
      return NextResponse.json(
        { error: "line1, city, state, and zip are required" },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });
      }

      const address = await tx.customerAddress.create({
        data: {
          customerId,
          name,
          line1,
          line2,
          city,
          state,
          zip,
          country,
          phone,
          isDefault,
        },
      });

      // If this is the first address, make it default.
      if (!isDefault) {
        const hasDefault = await tx.customerAddress.count({ where: { customerId, isDefault: true } });
        if (hasDefault === 0) {
          await tx.customerAddress.update({ where: { id: address.id }, data: { isDefault: true } });
          return { ...address, isDefault: true };
        }
      }

      return address;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create customer address:", error);
    return NextResponse.json({ error: "Failed to create address" }, { status: 500 });
  }
}
