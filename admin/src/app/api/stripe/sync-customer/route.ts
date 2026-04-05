// admin/src/app/api/stripe/sync-customer/route.ts
// POST /api/stripe/sync-customer
// Upserts a local User to a Stripe Customer and stores the resulting
// stripeCustomerId back on the User row.
//
// Body: { userId: string }   OR   { email: string }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "ADMIN") return null;
  return session;
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const obj = isRecord(body) ? body : {};
  const userId = typeof obj.userId === "string" ? obj.userId.trim() : null;
  const emailInput = typeof obj.email === "string" ? obj.email.trim().toLowerCase() : null;

  if (!userId && !emailInput) {
    return NextResponse.json({ error: "Provide userId or email" }, { status: 400 });
  }

  // Load user from DB
  const user = await prisma.user.findFirst({
    where: userId ? { id: userId } : { email: emailInput! },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      stripeCustomerId: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!user.email) return NextResponse.json({ error: "User has no email address" }, { status: 400 });

  const stripe = getStripe();

  let stripeCustomer: import("stripe").Stripe.Customer;

  if (user.stripeCustomerId) {
    // Update existing Stripe customer
    stripeCustomer = await stripe.customers.update(user.stripeCustomerId, {
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
      phone: user.phone ?? undefined,
      metadata: { localUserId: user.id },
    });
  } else {
    // Check if customer already exists in Stripe by email
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    if (existing.data[0]) {
      stripeCustomer = existing.data[0];
    } else {
      stripeCustomer = await stripe.customers.create({
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
        phone: user.phone ?? undefined,
        metadata: { localUserId: user.id },
      });
    }
  }

  // Persist the Stripe customer ID
  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: stripeCustomer.id },
  });

  return NextResponse.json({ stripeCustomerId: stripeCustomer.id });
}
