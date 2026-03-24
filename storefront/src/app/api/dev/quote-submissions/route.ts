import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import prisma from "@/lib/prisma";
import { logServerEvent } from "@/lib/observability/serverLogger";
import { parseQuoteSubmissionInput } from "@/lib/dev/quoteSubmission";
import { sendQuoteSubmissionEmails } from "@/lib/email/quoteMailer";
import { isValidStore } from "@/lib/storefront/store";
import { ensurePersistedShopIdForStore } from "@/lib/storefront/store.server";

export async function POST(req: Request) {
  const requestId = randomUUID();
  const body: unknown = await req.json().catch(() => null);
  const input = parseQuoteSubmissionInput(body);

  if (!input || !isValidStore(input.store) || input.store !== "dev") {
    logServerEvent("warn", "Quote submission rejected: invalid payload", {
      requestId,
      route: "/api/dev/quote-submissions",
    });
    return NextResponse.json({ error: "Invalid quote submission payload" }, { status: 400 });
  }

  try {
    const shopId = await ensurePersistedShopIdForStore(input.store);

    logServerEvent("info", "Quote submission received", {
      requestId,
      route: "/api/dev/quote-submissions",
      shopId,
      store: input.store,
      email: input.email,
      selectedPlan: input.selectedPlan ?? null,
    });

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

    logServerEvent(emailResult.error ? "warn" : "info", "Quote submission completed", {
      requestId,
      route: "/api/dev/quote-submissions",
      shopId,
      submissionId: created.id,
      adminNotified: emailResult.adminNotified,
      customerAcknowledged: emailResult.customerAcknowledged,
      emailError: emailResult.error,
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (error) {
    logServerEvent("error", "Quote submission failed", {
      requestId,
      route: "/api/dev/quote-submissions",
      store: input.store,
      email: input.email,
    }, error);
    return NextResponse.json({ error: "Failed to submit quote request", requestId }, { status: 500 });
  }
}