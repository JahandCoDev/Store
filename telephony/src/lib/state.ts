// telephony/src/lib/state.ts
// Converted from state.go — in-memory call state (works with replicas: 1)

export interface CallState {
  call_control_id: string;
  call_session_id: string;
  from: string;
  livekit_room?: string;
  status: string; // "ringing" | "in_menu" | "in_agent" | "waiting" | "held" | "answered" | "escalating" | "in_voicemail"
  started_at: string; // ISO timestamp

  // Internal (not serialised to clients)
  escalationStartedAt?: Date;
  escalationLegID?: string;
  escalationScheduled?: boolean;
  escalationInProgress?: boolean;
  escalationAnswered?: boolean;
  menuRetries?: number;
  inVoicemail?: boolean;
  pendingLiveKitTransfer?: boolean;
  liveKitTransferred?: boolean;
  pendingTransferTo?: string;
}

export type OutboundLegKind = "livekit" | "escalation" | "unknown";

export interface OutboundLeg {
  callControlID: string;
  callSessionID: string;
  to: string;
  kind: OutboundLegKind;
  parentCallID: string;
}

// ─── Global maps (module-level singletons, safe with replicas: 1) ────────────

declare global {
  // eslint-disable-next-line no-var
  var __activeCalls: Map<string, CallState> | undefined;
  // eslint-disable-next-line no-var
  var __inboundBySession: Map<string, string> | undefined;
  // eslint-disable-next-line no-var
  var __outboundLegs: Map<string, OutboundLeg> | undefined;
}

const activeCalls: Map<string, CallState> =
  global.__activeCalls ?? (global.__activeCalls = new Map());

const inboundBySession: Map<string, string> =
  global.__inboundBySession ?? (global.__inboundBySession = new Map());

const outboundLegs: Map<string, OutboundLeg> =
  global.__outboundLegs ?? (global.__outboundLegs = new Map());

// ─── Call State ───────────────────────────────────────────────────────────────

export function storeCall(state: CallState): void {
  activeCalls.set(state.call_control_id, state);
  if (state.call_session_id) {
    inboundBySession.set(state.call_session_id, state.call_control_id);
  }
}

export function getCall(callControlID: string): CallState | undefined {
  return activeCalls.get(callControlID);
}

export function removeCall(callControlID: string): void {
  const st = activeCalls.get(callControlID);
  if (st?.call_session_id) {
    if (inboundBySession.get(st.call_session_id) === callControlID) {
      inboundBySession.delete(st.call_session_id);
    }
  }
  activeCalls.delete(callControlID);
  removeAgentState(callControlID);
}

export function getInboundBySession(callSessionID: string): string | undefined {
  return inboundBySession.get(callSessionID);
}

export function getActiveCalls(): CallState[] {
  return Array.from(activeCalls.values());
}

// ─── Outbound Legs ────────────────────────────────────────────────────────────

export function storeOutboundLeg(leg: OutboundLeg): void {
  outboundLegs.set(leg.callControlID, leg);
}

export function getOutboundLeg(callControlID: string): OutboundLeg | undefined {
  return outboundLegs.get(callControlID);
}

export function removeOutboundLeg(callControlID: string): void {
  outboundLegs.delete(callControlID);
}

// ─── Agent State ──────────────────────────────────────────────────────────────

export interface AgentTurn {
  role: string;
  text: string;
}

export interface AgentState {
  enabled: boolean;
  speaking: boolean;
  processing: boolean;
  pendingUtterances: string[];
  history: AgentTurn[];
  lastUserTranscript: string;
  lastUserAt?: Date;
}

declare global {
  // eslint-disable-next-line no-var
  var __agentStates: Map<string, AgentState> | undefined;
}

const agentStates: Map<string, AgentState> =
  global.__agentStates ?? (global.__agentStates = new Map());

export function getAgentState(callControlID: string): AgentState {
  let st = agentStates.get(callControlID);
  if (!st) {
    st = {
      enabled: false,
      speaking: false,
      processing: false,
      pendingUtterances: [],
      history: [],
      lastUserTranscript: "",
    };
    agentStates.set(callControlID, st);
  }
  return st;
}

export function removeAgentState(callControlID: string): void {
  agentStates.delete(callControlID);
}

// ─── Push Subscriptions ───────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __pushSubscriptions: PushSubscriptionJSON[] | undefined;
}

export type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

const pushSubscriptions: PushSubscriptionJSON[] =
  global.__pushSubscriptions ?? (global.__pushSubscriptions = []);

export function addPushSubscription(sub: PushSubscriptionJSON): void {
  const exists = pushSubscriptions.some((s) => s.endpoint === sub.endpoint);
  if (!exists) pushSubscriptions.push(sub);
}

export function getPushSubscriptions(): PushSubscriptionJSON[] {
  return [...pushSubscriptions];
}

export function removePushSubscription(endpoint: string): void {
  const idx = pushSubscriptions.findIndex((s) => s.endpoint === endpoint);
  if (idx !== -1) pushSubscriptions.splice(idx, 1);
}
