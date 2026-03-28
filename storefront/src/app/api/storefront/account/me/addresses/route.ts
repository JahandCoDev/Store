import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = normalizeEmail(session?.user?.email);
  if (!session?.user || !email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await req.json().catch(() => ({}));
  const bodyObj = isRecord(body) ? body : null;

  const firstName = bodyObj && typeof bodyObj.firstName === "string" ? bodyObj.firstName.trim() || null : null;
  const lastName = bodyObj && typeof bodyObj.lastName === "string" ? bodyObj.lastName.trim() || null : null;
  const line1 = bodyObj && typeof bodyObj.line1 === "string" ? bodyObj.line1.trim() : "";
  const line2 = bodyObj && typeof bodyObj.line2 === "string" ? bodyObj.line2.trim() || null : null;
  const city = bodyObj && typeof bodyObj.city === "string" ? bodyObj.city.trim() : "";
  const state = bodyObj && typeof bodyObj.state === "string" ? bodyObj.state.trim() : "";
  const zip = bodyObj && typeof bodyObj.zip === "string" ? bodyObj.zip.trim() : "";
  const country = bodyObj && typeof bodyObj.country === "string" ? bodyObj.country.trim() || "US" : "US";
  const phone = bodyObj && typeof bodyObj.phone === "string" ? bodyObj.phone.trim() || null : null;
  const isDefault = bodyObj && typeof bodyObj.isDefault === "boolean" ? bodyObj.isDefault : false;

  if (!line1 || !city || !state || !zip) {
    return NextResponse.json(
      { error: "line1, city, state, and zip are required" },
      { status: 400 }
    );
  }

  const customer = await prisma.user.upsert({
    where: { email },
    create: { email },
    update: {},
    select: { id: true },
  });

  const address = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.address.updateMany({ where: { userId: customer.id }, data: { isDefault: false } });
    }

    const created = await tx.address.create({
      data: {
        userId: customer.id,
        firstName: firstName ?? "",
        lastName: lastName ?? "",
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

    if (!isDefault) {
      const hasDefault = await tx.address.count({ where: { userId: customer.id, isDefault: true } });
      if (hasDefault === 0) {
        await tx.address.update({ where: { id: created.id }, data: { isDefault: true } });
        return { ...created, isDefault: true };
      }
    }

    return created;
  });

  return NextResponse.json(address, { status: 201 });
}
