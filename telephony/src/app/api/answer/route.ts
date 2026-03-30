// src/app/api/answer/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { getCall } from "@/lib/state";
import {
  generateLiveKitToken,
  waitForDispatchedLiveKitRoom,
  liveKitRoomName,
} from "@/lib/livekit";

export async function GET(req: NextRequest) {
  const cfg = getConfig();
  const callControlId = req.nextUrl.searchParams.get("call_control_id") || "";
  const agentName = req.nextUrl.searchParams.get("agent") || "";
  if (!callControlId || !agentName) {
    return NextResponse.json(
      { error: "call_control_id and agent required" },
      { status: 400 }
    );
  }

  const state = getCall(callControlId);
  if (!state) return NextResponse.json({ error: "call not found" }, { status: 404 });

  let roomName = state.livekitRoom || "";
  if (!roomName) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const found = await waitForDispatchedLiveKitRoom(state.from, controller.signal, 25000);
      if (found) {
        roomName = found;
        state.livekitRoom = found;
      } else {
        roomName = liveKitRoomName(state.from);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  const token = await generateLiveKitToken(
    cfg.liveKitApiKey,
    cfg.liveKitApiSecret,
    roomName,
    `agent-${agentName}`
  );
  return NextResponse.json(
    { token, url: cfg.liveKitUrl, room: roomName },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}
