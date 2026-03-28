import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { generateUserDisplayId } from "@/lib/displayId";
import prisma from "@/lib/prisma";
import { logServerEvent } from "@/lib/observability/serverLogger";
import { parseQuoteSubmissionInput } from "@/lib/dev/quoteSubmission";
import { isValidStore } from "@/lib/storefront/store";

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

    logServerEvent("info", "Quote submission received", {
      requestId,
      route: "/api/dev/quote-submissions",
      store: input.store,
      email: input.email,
      selectedPlan: input.selectedPlan ?? null,
    });

    const created = await prisma.$transaction(async (tx) => {
      const firstName = input.name.split(/\s+/)[0] || input.name;
      const lastName = input.name.split(/\s+/).slice(1).join(" ") || null;
      const displayId = await generateUserDisplayId(tx, {
        email: input.email,
        firstName,
        lastName,
      });

      const customer = await tx.user.upsert({
        where: { email: input.email },
        create: {
          displayId,
          email: input.email,
          firstName,
          lastName,
          phone: input.phone || null,
        },
        update: {
          displayId,
          firstName,
          lastName,
          phone: input.phone || undefined,
        },
        select: { id: true },
      });

      return tx.quoteSubmission.create({
        data: {
          userId: customer.id,
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

    const { sendQuoteSubmissionEmails } = await import("@/lib/email/quoteMailer");
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

    const emailConfigured = emailResult.error !== "SMTP not configured";
    logServerEvent(emailConfigured && emailResult.error ? "warn" : "info", "Quote submission completed", {
      requestId,
      route: "/api/dev/quote-submissions",
      submissionId: created.id,
      adminNotified: emailResult.adminNotified,
      customerAcknowledged: emailResult.customerAcknowledged,
      emailError: emailResult.error,
      emailConfigured,
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