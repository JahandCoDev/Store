// telephony/src/app/api/answer/route.ts
// Converted from handleAnswer in handlers_api.go

import { NextRequest, NextResponse } from "next/server";
import { AccessToken, VideoGrant } from "livekit-server-sdk";
import { getConfig } from "@/lib/config";
import { getCall } from "@/lib/state";
import { waitForDispatchedLiveKitRoom, liveKitRoomName, sipUserPart } from "@/lib/livekitRoom";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cfg = getConfig();
  const { searchParams } = req.nextUrl;
  const callControlID = searchParams.get("call_control_id") ?? "";
  const agentName = searchParams.get("agent") ?? "";

  if (!callControlID || !agentName) {
    return NextResponse.json({ error: "call_control_id and agent required" }, { status: 400 });
  }

  const state = getCall(callControlID);
  if (!state) {
    return NextResponse.json({ error: "call not found" }, { status: 404 });
  }

  console.log("[answer] Answer requested", {
    call_id: callControlID,
    agent: agentName,
    from: state.from,
    known_room: !!state.livekit_room,
  });

  let roomName = state.livekit_room?.trim() ?? "";
  if (!roomName) {
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 25_000);
      roomName = await waitForDispatchedLiveKitRoom(ac.signal, state.from, sipUserPart(cfg.liveKitSIPURI));
      clearTimeout(t);
      state.livekit_room = roomName;
    } catch {
      console.warn("[answer] Room not yet dispatched; using deterministic room", { call_id: callControlID });
      roomName = liveKitRoomName(state.from);
    }
  }

  console.log("[answer] Resolved room", { call_id: callControlID, agent: agentName, room: roomName });

  const canPublish = true;
  const canSubscribe = true;

  const at = new AccessToken(cfg.liveKitAPIKey, cfg.liveKitAPISecret);
  const grant: VideoGrant = {
    roomJoin: true,
    room: roomName,
    canPublish,
    canPublishData: canPublish,
    canSubscribe,
  };
  at.addGrant(grant);
  at.identity = `agent-${agentName}`;
  at.ttl = "1h";

  const token = await at.toJwt();

  return NextResponse.json({ token, url: cfg.liveKitURL, room: roomName }, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
