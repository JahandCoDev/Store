// telephony/src/app/api/transfer/route.ts
// Converted from handleTransfer in handlers_api.go

import { NextRequest, NextResponse } from "next/server";
import { sendCommand } from "@/lib/telnyxClient";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { call_control_id?: string; extension?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request format" }, { status: 400, headers: CORS });
  }

  const { call_control_id, extension } = body;
  if (!call_control_id || !extension) {
    return NextResponse.json({ error: "Missing call_control_id or extension" }, { status: 400, headers: CORS });
  }

  console.log("[transfer] Transfer requested", { call_id: call_control_id, extension });

  let destination = extension;
  if (destination.replace(/\D/g, "").length === 10) {
    destination = "+1" + destination.replace(/\D/g, "");
  }

  sendCommand(call_control_id, "actions/transfer", { to: destination });

  return NextResponse.json({ status: "success" }, { headers: CORS });
}
