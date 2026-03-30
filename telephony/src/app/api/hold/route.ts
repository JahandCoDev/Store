// src/app/api/hold/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getCall, getHoldRoom, removeHoldRoom } from "@/lib/state";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { call_control_id?: string; hold?: boolean };
  if (body.call_control_id !== undefined) {
    const st = getCall(body.call_control_id);
    if (body.hold) {
      if (st) st.status = "held";
    } else {
      if (st) st.status = "answered";
      const ctrl = getHoldRoom(body.call_control_id);
      if (ctrl) {
        ctrl.abort();
        removeHoldRoom(body.call_control_id);
      }
    }
  }
  return new NextResponse(null, { status: 200, headers: CORS });
}
