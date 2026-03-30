// src/app/api/join-room/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { generateLiveKitToken } from "@/lib/livekit";

export async function GET(req: NextRequest) {
  const cfg = getConfig();
  const roomName = req.nextUrl.searchParams.get("room") || "";
  const agentName = req.nextUrl.searchParams.get("agent") || "";
  if (!roomName || !agentName) {
    return NextResponse.json({ error: "room and agent required" }, { status: 400 });
  }
  const token = await generateLiveKitToken(
    cfg.liveKitApiKey,
    cfg.liveKitApiSecret,
    roomName,
    `agent-${agentName}`
  );
  return NextResponse.json(
    { token, url: cfg.liveKitUrl },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}
