// src/lib/state.ts
export interface CallState {
  callControlId: string;
  callSessionId: string;
  from: string;
  livekitRoom?: string;
  escalationStartedAt?: Date;
  escalationLegId?: string;
  escalationScheduled: boolean;
  escalationInProgress: boolean;
  escalationAnswered: boolean;
  menuRetries: number;
  inVoicemail: boolean;
  pendingLiveKitTransfer: boolean;
  liveKitTransferred: boolean;
  pendingTransferTo?: string;
  status: string; // "ringing" | "in_menu" | "waiting" | "in_voicemail" | "answered" | "held" | "escalating"
  startedAt: Date;
}

export interface CallStateJSON {
  call_control_id: string;
  call_session_id: string;
  from: string;
  livekit_room?: string;
  status: string;
  started_at: string;
}

export interface CallerIdentity {
  userId: string;
  displayId: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
}

export interface AuthenticatedContact {
  type: "email" | "phone";
  value: string;
}

export interface PendingSupportIntent {
  type: "order_lookup" | "stock_lookup";
  orderNumber?: number;
  productQuery?: string;
}

export type OutboundLegKind = "livekit" | "escalation" | "unknown";

export interface OutboundLeg {
  callControlId: string;
  callSessionId: string;
  to: string;
  kind: OutboundLegKind;
  parentCallId: string;
}

// Module-level singletons — intentionally in-memory for single-process deployments.
// NOTE: In multi-replica deployments these maps will not be shared across pods.
// For multi-replica production use, replace with a shared store (e.g. Redis).
const activeCalls = new Map<string, CallState>();
const inboundBySession = new Map<string, string>();
const outboundLegs = new Map<string, OutboundLeg>();
const holdRooms = new Map<string, AbortController>();

export function storeCall(state: CallState): void {
  activeCalls.set(state.callControlId, state);
  if (state.callSessionId) {
    inboundBySession.set(state.callSessionId, state.callControlId);
  }
}

export function getCall(callControlId: string): CallState | undefined {
  return activeCalls.get(callControlId);
}

export function removeCall(callControlId: string): void {
  const st = activeCalls.get(callControlId);
  if (st?.callSessionId) {
    if (inboundBySession.get(st.callSessionId) === callControlId) {
      inboundBySession.delete(st.callSessionId);
    }
  }
  activeCalls.delete(callControlId);
  removeAgentState(callControlId);
}

export function getInboundBySession(sessionId: string): string | undefined {
  return inboundBySession.get(sessionId);
}

export function getWaitingCalls(): CallStateJSON[] {
  const result: CallStateJSON[] = [];
  activeCalls.forEach((call) => {
    if (call.status === "waiting") {
      result.push({
        call_control_id: call.callControlId,
        call_session_id: call.callSessionId,
        from: call.from,
        livekit_room: call.livekitRoom,
        status: call.status,
        started_at: call.startedAt.toISOString(),
      });
    }
  });
  return result;
}

export function storeOutboundLeg(leg: OutboundLeg): void {
  outboundLegs.set(leg.callControlId, leg);
}

export function getOutboundLeg(callControlId: string): OutboundLeg | undefined {
  return outboundLegs.get(callControlId);
}

export function removeOutboundLeg(callControlId: string): void {
  outboundLegs.delete(callControlId);
}

export function storeHoldRoom(callControlId: string, controller: AbortController): void {
  holdRooms.set(callControlId, controller);
}

export function getHoldRoom(callControlId: string): AbortController | undefined {
  return holdRooms.get(callControlId);
}

export function removeHoldRoom(callControlId: string): void {
  holdRooms.delete(callControlId);
}

// Agent state
interface AgentTurn {
  role: string;
  text: string;
}
interface AgentState {
  enabled: boolean;
  speaking: boolean;
  processing: boolean;
  pendingUtterances: string[];
  history: AgentTurn[];
  lastUserTranscript: string;
  lastUserAt?: Date;
  callerIdentity?: CallerIdentity;
  authenticatedContact?: AuthenticatedContact;
  pendingIntent?: PendingSupportIntent;
}
const agentStates = new Map<string, AgentState>();

export function getAgentState(callControlId: string): AgentState {
  let st = agentStates.get(callControlId);
  if (!st) {
    st = {
      enabled: false,
      speaking: false,
      processing: false,
      pendingUtterances: [],
      history: [],
      lastUserTranscript: "",
    };
    agentStates.set(callControlId, st);
  }
  return st;
}

export function removeAgentState(callControlId: string): void {
  agentStates.delete(callControlId);
}

// Push subscriptions store (in-memory, could be moved to DB)
const pushSubscriptions = new Set<string>(); // serialized PushSubscription JSON

export function addPushSubscription(sub: string): void {
  pushSubscriptions.add(sub);
}

export function getPushSubscriptions(): string[] {
  return Array.from(pushSubscriptions);
}
