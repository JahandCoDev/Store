import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { parseQuoteSubmissionInput } from "@/lib/dev/quoteSubmission";
import { sendQuoteSubmissionEmails } from "@/lib/email/quoteMailer";
import { isValidStore, resolveShopIdForStore } from "@/lib/storefront/store";

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  const input = parseQuoteSubmissionInput(body);

  if (!input || !isValidStore(input.store) || input.store !== "dev") {
    return NextResponse.json({ error: "Invalid quote submission payload" }, { status: 400 });
  }

  const shopId = resolveShopIdForStore(input.store);
  if (!shopId) {
    return NextResponse.json({ error: "Dev storefront is not configured" }, { status: 400 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const firstName = input.name.split(/\s+/)[0] || input.name;
    const lastName = input.name.split(/\s+/).slice(1).join(" ") || null;

    const customer = await tx.customer.upsert({
      where: { shopId_email: { shopId, email: input.email } },
      create: {
        shopId,
        email: input.email,
        firstName,
        lastName,
        phone: input.phone || null,
      },
      update: {
        firstName,
        lastName,
        phone: input.phone || undefined,
      },
      select: { id: true },
    });

    return tx.quoteSubmission.create({
      data: {
        shopId,
        customerId: customer.id,
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        selectedPlan: input.selectedPlan || null,
        projectType: input.projectType,
        budgetRange: input.budgetRange,
        timeline: input.timeline,
        addOns: input.addOns,
        details: input.details,
      },
    });
  });

  const emailResult = await sendQuoteSubmissionEmails({
    id: created.id,
    name: created.name,
    email: created.email,
    phone: created.phone,
    selectedPlan: created.selectedPlan,
    projectType: created.projectType,
    budgetRange: created.budgetRange,
    timeline: created.timeline,
    addOns: created.addOns,
    details: created.details,
    createdAt: created.createdAt,
  });

  await prisma.quoteSubmission.update({
    where: { id: created.id },
    data: {
      adminNotifiedAt: emailResult.adminNotified ? new Date() : null,
      customerAcknowledgedAt: emailResult.customerAcknowledged ? new Date() : null,
      lastEmailError: emailResult.error,
    },
  });

  return NextResponse.json({ ok: true, id: created.id });
}