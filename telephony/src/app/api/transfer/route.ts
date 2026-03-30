// src/app/api/transfer/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { sendCommand } from "@/lib/telnyx";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { call_control_id?: string; extension?: string };
  if (!body.call_control_id || !body.extension) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400, headers: CORS });
  }

  let dest = body.extension;
  if (dest.length === 10) dest = "+1" + dest;
  await sendCommand(body.call_control_id, "actions/transfer", { to: dest });
  return NextResponse.json({ status: "success" }, { headers: CORS });
}
