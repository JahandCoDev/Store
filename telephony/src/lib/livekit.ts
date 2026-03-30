// src/lib/livekit.ts
import { AccessToken, RoomServiceClient, SipClient, IngressClient, IngressInput } from "livekit-server-sdk";
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

// ── Hold music ────────────────────────────────────────────────────────────────

export async function startHoldMusic(roomName: string): Promise<string | null> {
  const cfg = getConfig();
  if (!cfg.holdAudioUrl || !cfg.liveKitApiKey || !cfg.liveKitApiSecret || !cfg.liveKitUrl)
    return null;
  try {
    const ic = new IngressClient(
      liveKitRoomServiceUrl(cfg.liveKitUrl),
      cfg.liveKitApiKey,
      cfg.liveKitApiSecret
    );
    const ingress = await ic.createIngress(IngressInput.URL_INPUT, {
      name: "hold-music",
      roomName,
      participantIdentity: "system-hold-music",
      participantName: "Hold Music",
      url: cfg.holdAudioUrl,
    });
    console.log(`[livekit] hold music ingress started: ${ingress.ingressId} in ${roomName}`);
    return ingress.ingressId || null;
  } catch (err) {
    console.warn("[livekit] failed to start hold music ingress:", err);
    return null;
  }
}

export async function stopHoldMusic(ingressId: string): Promise<void> {
  const cfg = getConfig();
  if (!cfg.liveKitApiKey || !cfg.liveKitApiSecret || !cfg.liveKitUrl) return;
  try {
    const ic = new IngressClient(
      liveKitRoomServiceUrl(cfg.liveKitUrl),
      cfg.liveKitApiKey,
      cfg.liveKitApiSecret
    );
    await ic.deleteIngress(ingressId);
    console.log(`[livekit] hold music ingress stopped: ${ingressId}`);
  } catch (err) {
    console.warn("[livekit] failed to stop hold music ingress:", err);
  }
}

// ── Outbound SIP escalation ───────────────────────────────────────────────────

/**
 * Dials the human escalation number directly into the caller's LiveKit room via
 * LiveKit outbound SIP. Returns true if the dial was initiated successfully.
 * Requires LIVEKIT_OUTBOUND_TRUNK_ID to be configured.
 */
export async function dialHumanToRoom(roomName: string, toNumber: string): Promise<boolean> {
  const cfg = getConfig();
  if (!cfg.liveKitOutboundTrunkId || !cfg.liveKitApiKey || !cfg.liveKitApiSecret || !cfg.liveKitUrl)
    return false;
  try {
    const sc = new SipClient(
      liveKitRoomServiceUrl(cfg.liveKitUrl),
      cfg.liveKitApiKey,
      cfg.liveKitApiSecret
    );
    await sc.createSipParticipant(cfg.liveKitOutboundTrunkId, toNumber, roomName, {
      participantIdentity: "agent-human",
      participantName: "Support Agent",
      playDialtone: true,
    });
    console.log(`[livekit] dialing human ${toNumber} into room ${roomName}`);
    return true;
  } catch (err) {
    console.warn("[livekit] failed to dial human to room:", err);
    return false;
  }
}

/**
 * Polls the LiveKit room until the "agent-human" participant joins (answered),
 * or until the timeout elapses. Calls onAnswered() once when confirmed.
 */
export async function pollForHumanAnswer(
  roomName: string,
  timeoutMs: number,
  onAnswered: () => void
): Promise<void> {
  const cfg = getConfig();
  if (!cfg.liveKitApiKey || !cfg.liveKitApiSecret || !cfg.liveKitUrl) return;

  const roomSvc = new RoomServiceClient(
    liveKitRoomServiceUrl(cfg.liveKitUrl),
    cfg.liveKitApiKey,
    cfg.liveKitApiSecret
  );

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const parts = await roomSvc.listParticipants(roomName);
      if (parts.some((p) => p.identity === "agent-human")) {
        onAnswered();
        return;
      }
    } catch {
      // ignore transient errors
    }
  }
}

/**
 * Removes the "agent-human" SIP participant from the room (unanswered escalation cleanup).
 */
export async function removeHumanParticipant(roomName: string): Promise<void> {
  const cfg = getConfig();
  if (!cfg.liveKitApiKey || !cfg.liveKitApiSecret || !cfg.liveKitUrl) return;
  try {
    const roomSvc = new RoomServiceClient(
      liveKitRoomServiceUrl(cfg.liveKitUrl),
      cfg.liveKitApiKey,
      cfg.liveKitApiSecret
    );
    await roomSvc.removeParticipant(roomName, "agent-human");
  } catch {
    // participant may already be gone
  }
}
