// telephony/src/app/api/end-call/route.ts
// Converted from handleEndCallAPI in handlers_api.go

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
  try {
    const body = (await req.json()) as { call_control_id?: string };
    if (body.call_control_id) {
      sendCommand(body.call_control_id, "actions/hangup", {});
      console.log("[end-call] Admin ended call", { call_id: body.call_control_id });
    }
  } catch {
    // Non-fatal parse error
  }

  return new NextResponse(null, { status: 200, headers: CORS });
}
