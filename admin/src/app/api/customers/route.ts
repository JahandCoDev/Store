import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

function getSelectedShopId(): string | null {
  return cookies().get("shopId")?.value ?? null;
}

async function requireShopAccess(shopId: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  const role = (session?.user as any)?.role as string | undefined;
  if (!session || !userId || role !== "ADMIN") return null;

  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
    select: { id: true },
  });
  if (!membership) return null;

  return { userId, shopUserId: membership.id };
}

export async function GET(req: NextRequest) {
  try {
    const shopId = getSelectedShopId();
    if (!shopId) return NextResponse.json({ error: "Shop not selected" }, { status: 400 });

    const auth = await requireShopAccess(shopId);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    const shopId = getSelectedShopId();
    if (!shopId) return NextResponse.json({ error: "Shop not selected" }, { status: 400 });

    const auth = await requireShopAccess(shopId);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : null;
    const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : null;
    const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : null;
    const tags = Array.isArray(body?.tags) ? body.tags.filter((t: any) => typeof t === "string").map((t: string) => t.trim()).filter(Boolean) : [];

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
