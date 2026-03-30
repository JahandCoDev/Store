// telephony/src/lib/holdRoomSystem.ts
// Converted from agent.go (HoldRoomSystem)
//
// The Go version used the Go LiveKit server SDK (livekit-server-sdk-go) together
// with Pion WebRTC to connect as a participant and stream Opus audio.  The Node.js
// LiveKit server SDK only covers token generation and room admin; it does not
// expose a participant connection API.  Audio publishing would require the
// @livekit/rtc-node native addon (Rust bindings) or the LiveKit Agents
// framework — neither of which is bundled here to keep the container lean.
//
// What this module *does* provide:
//  1. Room-participant polling (mirrors the Go ParticipantCallback logic).
//  2. Correct call-state transitions (waiting → answered) when an agent joins.
//  3. A close() method that cleans up the poll loop.
//  4. If you need actual hold-music audio in the room, deploy a LiveKit Agent
//     (livekit.io/docs/agents) alongside this service.

import { RoomServiceClient } from "livekit-server-sdk";
import { getConfig } from "./config";
import { getCall } from "./state";

function liveKitHTTPURL(url: string): string {
  let s = url.trim().replace(/\/$/, "");
  if (s.startsWith("wss://")) return "https://" + s.slice(6);
  if (s.startsWith("ws://")) return "http://" + s.slice(5);
  return s;
}

export class HoldRoomSystem {
  private abortController = new AbortController();
  private finished = false;

  constructor(
    private readonly roomName: string,
    private readonly callControlID: string
  ) {}

  start(): void {
    void this.pollLoop();
  }

  private async pollLoop(): Promise<void> {
    const cfg = getConfig();
    if (!cfg.liveKitAPIKey || !cfg.liveKitAPISecret || !cfg.liveKitURL) {
      console.warn("[hold] LiveKit credentials not set; skipping participant monitoring");
      return;
    }

    const roomSvc = new RoomServiceClient(
      liveKitHTTPURL(cfg.liveKitURL),
      cfg.liveKitAPIKey,
      cfg.liveKitAPISecret
    );

    const signal = this.abortController.signal;
    const knownParticipants = new Set<string>();

    while (!signal.aborted) {
      try {
        const participants = await roomSvc.listParticipants(this.roomName);

        for (const p of participants) {
          const id = p.identity ?? "";
          if (knownParticipants.has(id)) continue;
          knownParticipants.add(id);

          console.log("[hold] Participant joined hold room", { participant: id, room: this.roomName });

          if (id.startsWith("agent-")) {
            console.log("[hold] Agent joined — stopping hold", { agent: id });
            this.close();
            const st = getCall(this.callControlID);
            if (st) st.status = "answered";
            return;
          }
        }

        // Detect caller leaving (was known, now gone)
        const currentIds = new Set(participants.map((p) => p.identity ?? ""));
        for (const id of Array.from(knownParticipants)) {
          if (!currentIds.has(id) && !id.startsWith("agent-")) {
            console.log("[hold] Caller left the hold room", { participant: id });
            this.close();
            return;
          }
        }
      } catch (err) {
        if (!signal.aborted) {
          console.warn("[hold] Failed to poll participants", err);
        }
      }

      await new Promise<void>((resolve, reject) => {
        if (signal.aborted) return reject();
        const t = setTimeout(resolve, 2_000);
        signal.addEventListener("abort", () => { clearTimeout(t); reject(); });
      }).catch(() => {});
    }
  }

  close(): void {
    if (this.finished) return;
    this.finished = true;
    this.abortController.abort();
    console.log("[hold] HoldRoomSystem closed", { room: this.roomName });
  }
}

// ─── Global hold rooms registry ───────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __holdRooms: Map<string, HoldRoomSystem> | undefined;
}

export const holdRooms: Map<string, HoldRoomSystem> =
  global.__holdRooms ?? (global.__holdRooms = new Map());
