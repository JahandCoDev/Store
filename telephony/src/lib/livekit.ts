// src/lib/livekit.ts
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { getConfig } from "./config";

export function liveKitRoomName(callerNumber: string): string {
  const cfg = getConfig();
  const prefix = cfg.liveKitRoomPrefix || "voice-";
  return `${prefix}${callerNumber}`;
}

export function liveKitRoomServiceUrl(liveKitUrl: string): string {
  const s = liveKitUrl.trim().replace(/\/$/, "");
  if (s.startsWith("wss://")) return "https://" + s.slice(6);
  if (s.startsWith("ws://")) return "http://" + s.slice(5);
  return s;
}

export function sipUserPart(sipUri: string): string {
  const s = sipUri.trim().toLowerCase().replace(/^sip:/, "");
  const at = s.indexOf("@");
  if (at >= 0) return s.slice(0, at);
  return "";
}

export function generateLiveKitToken(
  apiKey: string,
  apiSecret: string,
  roomName: string,
  identity: string
): Promise<string> {
  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    ttl: 3600,
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  });
  return at.toJwt();
}

export async function waitForDispatchedLiveKitRoom(
  callerNumber: string,
  signal: AbortSignal,
  timeoutMs = 25000
): Promise<string | null> {
  const cfg = getConfig();
  if (!cfg.liveKitApiKey || !cfg.liveKitApiSecret || !cfg.liveKitUrl) return null;

  const roomSvc = new RoomServiceClient(
    liveKitRoomServiceUrl(cfg.liveKitUrl),
    cfg.liveKitApiKey,
    cfg.liveKitApiSecret
  );

  const prefix = cfg.liveKitRoomPrefix || "voice-";
  const sipCallee = sipUserPart(cfg.liveKitSipUri);

  const candidatePrefixes: string[] = [];
  if (callerNumber) candidatePrefixes.push(prefix + callerNumber);
  if (sipCallee) candidatePrefixes.push(prefix + sipCallee);
  candidatePrefixes.push(prefix);

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (signal.aborted) return null;
    try {
      const rooms = await roomSvc.listRooms();
      for (const room of rooms) {
        const matches = candidatePrefixes.some((pfx) => room.name.startsWith(pfx));
        if (!matches) continue;
        const parts = await roomSvc.listParticipants(room.name);
        for (const p of parts) {
          if (p.identity.startsWith("agent-") || p.identity.startsWith("system-hold-")) continue;
          if (
            p.identity.startsWith("sip_") ||
            (callerNumber && p.identity.includes(callerNumber)) ||
            (sipCallee && p.identity.includes(sipCallee))
          ) {
            return room.name;
          }
        }
      }
    } catch (err) {
      console.warn("[livekit] failed to list rooms:", err);
    }
    await new Promise((res) => setTimeout(res, 750));
  }
  return null;
}
