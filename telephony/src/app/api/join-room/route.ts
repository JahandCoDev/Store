// telephony/src/app/api/join-room/route.ts
// Converted from handleJoinRoom in handlers_api.go

import { NextRequest, NextResponse } from "next/server";
import { AccessToken, VideoGrant } from "livekit-server-sdk";
import { getConfig } from "@/lib/config";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cfg = getConfig();
  const { searchParams } = req.nextUrl;
  const roomName = searchParams.get("room") ?? "";
  const agentName = searchParams.get("agent") ?? "";

  if (!roomName || !agentName) {
    return NextResponse.json({ error: "room and agent required" }, { status: 400 });
  }

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

  return NextResponse.json({ token, url: cfg.liveKitURL }, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
