// telephony/src/app/api/push/subscribe/route.ts
// Web Push subscription management

import { NextRequest, NextResponse } from "next/server";
import { addPushSubscription, removePushSubscription, type PushSubscriptionJSON } from "@/lib/state";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as PushSubscriptionJSON & { action?: string };

  if (body.action === "unsubscribe") {
    if (body.endpoint) removePushSubscription(body.endpoint);
    return NextResponse.json({ ok: true });
  }

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  addPushSubscription({ endpoint: body.endpoint, keys: body.keys });
  console.log("[push] Subscription registered", { endpoint: body.endpoint.slice(0, 40) + "..." });

  return NextResponse.json({ ok: true });
}

export async function GET(): Promise<NextResponse> {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? "";
  return NextResponse.json({ vapidPublicKey: publicKey });
}
