// src/app/api/push/subscribe/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { addPushSubscription } from "@/lib/state";
import { getVapidPublicKey } from "@/lib/push";

export async function GET() {
  return NextResponse.json({ publicKey: getVapidPublicKey() });
}

export async function POST(req: NextRequest) {
  const sub = await req.text();
  if (sub) addPushSubscription(sub);
  return NextResponse.json({ ok: true });
}
