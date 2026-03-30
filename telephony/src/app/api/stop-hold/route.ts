// telephony/src/app/api/stop-hold/route.ts
// Converted from handleStopHold in handlers_api.go

import { NextRequest, NextResponse } from "next/server";
import { getCall } from "@/lib/state";
import { holdRooms } from "@/lib/holdRoomSystem";

const CORS = { "Access-Control-Allow-Origin": "*" };

export async function GET(req: NextRequest): Promise<NextResponse> {
  const callControlID = req.nextUrl.searchParams.get("call_control_id") ?? "";
  if (!callControlID) {
    return NextResponse.json({ error: "call_control_id required" }, { status: 400, headers: CORS });
  }

  console.log("[stop-hold] Stop-hold requested", { call_id: callControlID });

  const sys = holdRooms.get(callControlID);
  const hadSystem = !!sys;
  if (sys) {
    holdRooms.delete(callControlID);
    sys.close();
  }

  const st = getCall(callControlID);
  if (st) st.status = "answered";

  console.log("[stop-hold] Complete", { call_id: callControlID, had_hold: hadSystem });

  return NextResponse.json({ ok: true, had_hold: hadSystem, hold_stopped: hadSystem }, { headers: CORS });
}
