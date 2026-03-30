import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { resolveDatadogAppAuth } from "@/lib/serviceAuth";
import { NextRequest } from "next/server";
import { generateUserDisplayId } from "@/lib/displayId";

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

export async function GET(req: NextRequest) {
  try {
    if ((req.headers.get("authorization") ?? "").startsWith("Bearer ")) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return NextResponse.json({ error: dd.error }, { status: dd.status });
    } else {
      const auth = await requireAdminAccess();
      if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

    const customers = await prisma.user.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        displayId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        role: true,
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
    if ((req.headers.get("authorization") ?? "").startsWith("Bearer ")) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return NextResponse.json({ error: dd.error }, { status: dd.status });
    } else {
      const auth = await requireAdminAccess();
      if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: unknown = await req.json().catch(() => ({}));
    const bodyObj = isRecord(body) ? body : null;
    const email = bodyObj && typeof bodyObj.email === "string" ? bodyObj.email.trim().toLowerCase() : "";
    const firstName = bodyObj && typeof bodyObj.firstName === "string" ? bodyObj.firstName.trim() : null;
    const lastName = bodyObj && typeof bodyObj.lastName === "string" ? bodyObj.lastName.trim() : null;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const displayId = await generateUserDisplayId(prisma, { email, firstName, lastName });

    const customer = await prisma.user.create({
      data: {
        displayId,
        email,
        firstName,
        lastName,
        role: "CUSTOMER",
      },
      select: { id: true, displayId: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("Failed to create customer:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
