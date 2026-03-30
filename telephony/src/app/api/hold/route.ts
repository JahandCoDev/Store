// telephony/src/app/api/hold/route.ts
// Converted from handleHoldAPI in handlers_api.go

import { NextRequest, NextResponse } from "next/server";
import { getCall } from "@/lib/state";
import { HoldRoomSystem, holdRooms } from "@/lib/holdRoomSystem";
import { liveKitRoomName } from "@/lib/livekitRoom";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { call_control_id?: string; hold?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new NextResponse(null, { status: 200, headers: CORS });
  }

  const { call_control_id, hold } = body;
  if (!call_control_id) return new NextResponse(null, { status: 200, headers: CORS });

  console.log("[hold] Admin toggled hold", { call_id: call_control_id, hold });

  if (hold) {
    const state = getCall(call_control_id);
    if (state) {
      state.status = "held";
      const roomName = state.livekit_room?.trim() || liveKitRoomName(state.from);
      if (!holdRooms.has(call_control_id)) {
        const holdSys = new HoldRoomSystem(roomName, call_control_id);
        holdRooms.set(call_control_id, holdSys);
        holdSys.start();
      }
    }
  } else {
    const state = getCall(call_control_id);
    if (state) state.status = "answered";
    const sys = holdRooms.get(call_control_id);
    if (sys) { sys.close(); holdRooms.delete(call_control_id); }
  }

  return new NextResponse(null, { status: 200, headers: CORS });
}
