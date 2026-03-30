// telephony/src/lib/livekitRoom.ts
// Converted from livekit_room.go

import { RoomServiceClient } from "livekit-server-sdk";
import { getConfig } from "./config";

export function liveKitRoomName(callerNumber: string): string {
  const cfg = getConfig();
  const prefix = cfg.liveKitRoomPrefix || "voice-";
  return prefix + callerNumber;
}

function liveKitRoomServiceURL(liveKitURL: string): string {
  let s = liveKitURL.trim().replace(/\/$/, "");
  if (s.startsWith("wss://")) return "https://" + s.slice("wss://".length);
  if (s.startsWith("ws://")) return "http://" + s.slice("ws://".length);
  return s;
}

export function sipUserPart(sipURI: string): string {
  let s = sipURI.trim().replace(/^sip:/i, "");
  const at = s.indexOf("@");
  return at >= 0 ? s.slice(0, at) : "";
}

export async function waitForDispatchedLiveKitRoom(
  signal: AbortSignal,
  callerNumber: string,
  sipCallee: string
): Promise<string> {
  const cfg = getConfig();
  if (!cfg.liveKitAPIKey || !cfg.liveKitAPISecret || !cfg.liveKitURL) {
    throw new Error("LiveKit credentials not configured");
  }

  const roomSvc = new RoomServiceClient(
    liveKitRoomServiceURL(cfg.liveKitURL),
    cfg.liveKitAPIKey,
    cfg.liveKitAPISecret
  );

  const prefix = cfg.liveKitRoomPrefix || "voice-";
  const candidatePrefixes: string[] = [];
  if (callerNumber) candidatePrefixes.push(prefix + callerNumber);
  if (sipCallee) candidatePrefixes.push(prefix + sipCallee);
  candidatePrefixes.push(prefix);

  const deadline = Date.now() + 25_000;

  while (Date.now() < deadline && !signal.aborted) {
    try {
      const rooms = await roomSvc.listRooms();
      for (const room of rooms) {
        if (!room.name) continue;
        const matches = candidatePrefixes.some((pfx) => room.name.startsWith(pfx));
        if (!matches) continue;

        const participants = await roomSvc.listParticipants(room.name);
        for (const p of participants) {
          const id = p.identity ?? "";
          if (id.startsWith("agent-") || id.startsWith("system-hold-")) continue;
          if (
            id.startsWith("sip_") ||
            (callerNumber && id.includes(callerNumber)) ||
            (sipCallee && id.includes(sipCallee))
          ) {
            return room.name;
          }
        }
      }
    } catch (err) {
      console.warn("[livekit] Failed to list rooms while waiting for SIP dispatch", err);
    }

    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) return reject(new Error("aborted"));
      const t = setTimeout(resolve, 750);
      signal.addEventListener("abort", () => { clearTimeout(t); reject(new Error("aborted")); });
    });
  }

  throw new Error("Timed out waiting for LiveKit SIP dispatch room");
}
