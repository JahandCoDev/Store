import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { resolveCoreShopIdFromCookie, resolveDatadogAppAuth } from "@/lib/serviceAuth";
import { NextRequest } from "next/server";

async function getSelectedShopId(): Promise<string> {
  return resolveCoreShopIdFromCookie();
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

  return { userId, shopUserId: membership.id };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

export async function GET(req: NextRequest) {
  try {
    let shopId: string;
    if ((req.headers.get("authorization") ?? "").startsWith("Bearer ")) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return NextResponse.json({ error: dd.error }, { status: dd.status });
      shopId = dd.shopId;
    } else {
      shopId = await getSelectedShopId();
      const auth = await requireShopAccess(shopId);
      if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

    const customers = await prisma.customer.findMany({
      where: {
        shopId,
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        tags: true,
        createdAt: true,
      },
      take: 100,
    });

    return NextResponse.json(customers);
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let shopId: string;
    if ((req.headers.get("authorization") ?? "").startsWith("Bearer ")) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return NextResponse.json({ error: dd.error }, { status: dd.status });
      shopId = dd.shopId;
    } else {
      shopId = await getSelectedShopId();
      const auth = await requireShopAccess(shopId);
      if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: unknown = await req.json().catch(() => ({}));
    const bodyObj = isRecord(body) ? body : null;
    const email = bodyObj && typeof bodyObj.email === "string" ? bodyObj.email.trim().toLowerCase() : "";
    const phone = bodyObj && typeof bodyObj.phone === "string" ? bodyObj.phone.trim() : null;
    const firstName = bodyObj && typeof bodyObj.firstName === "string" ? bodyObj.firstName.trim() : null;
    const lastName = bodyObj && typeof bodyObj.lastName === "string" ? bodyObj.lastName.trim() : null;
    const tags =
      bodyObj && Array.isArray(bodyObj.tags)
        ? bodyObj.tags.filter(isString).map((t) => t.trim()).filter(Boolean)
        : [];

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: {
        shopId,
        email,
        phone,
        firstName,
        lastName,
        tags,
        consent: {
          create: {
            emailMarketingOptIn: false,
          },
        },
      },
      select: { id: true, email: true, phone: true, firstName: true, lastName: true, tags: true, createdAt: true },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("Failed to create customer:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
