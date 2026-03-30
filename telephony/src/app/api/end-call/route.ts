// src/app/api/end-call/route.ts
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
  const body = (await req.json()) as { call_control_id?: string };
  if (body.call_control_id) {
    await sendCommand(body.call_control_id, "actions/hangup", {});
  }
  return new NextResponse(null, { status: 200, headers: CORS });
}
