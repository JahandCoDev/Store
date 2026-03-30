// src/app/api/stop-hold/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getCall, getHoldRoom, removeHoldRoom } from "@/lib/state";

export async function GET(req: NextRequest) {
  const callControlId = req.nextUrl.searchParams.get("call_control_id") || "";
  if (!callControlId) {
    return NextResponse.json({ error: "call_control_id required" }, { status: 400 });
  }

  const ctrl = getHoldRoom(callControlId);
  if (ctrl) {
    ctrl.abort();
    removeHoldRoom(callControlId);
  }

  const st = getCall(callControlId);
  if (st) st.status = "answered";

  return NextResponse.json(
    { ok: true, hold_stopped: !!ctrl },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}
