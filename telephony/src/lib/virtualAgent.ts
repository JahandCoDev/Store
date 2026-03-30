// telephony/src/lib/virtualAgent.ts
// Converted from virtual_agent.go

import { promises as fs } from "fs";
import { parse as parseYAML } from "yaml";
import { sendCommand, say } from "./telnyxClient";
import { getConfig } from "./config";
import { getCall, getAgentState, removeAgentState, AgentTurn } from "./state";
import { generateGeminiReply } from "./gemini";
import { startVoicemail } from "./voicemail";
import type { CallPayload } from "../types/telnyx";

// ─── Support Prompt ───────────────────────────────────────────────────────────

interface SupportPromptConfig {
  instructions: string;
  escalation_trigger_phrases: string[];
  escalation_number: string;
}

const FALLBACK_PROMPT: SupportPromptConfig = {
  instructions:
    "You are a friendly and professional customer support representative for Jah and Co, an e-commerce platform. Keep answers brief and conversational for a phone call. Never use markdown or lists. If the caller asks to speak to support, offer to transfer them. If you are uncertain, say so and offer to transfer.",
  escalation_trigger_phrases: [
    "transfer me",
    "speak to someone",
    "talk to a person",
    "live agent",
    "human agent",
    "real person",
    "connect me",
    "connect to support",
  ],
  escalation_number: "",
};

let _supportPrompt: SupportPromptConfig | null = null;

async function loadSupportPrompt(): Promise<SupportPromptConfig> {
  if (_supportPrompt) return _supportPrompt;
  try {
    const raw = await fs.readFile("prompts/support.yaml", "utf8");
    const cfg: SupportPromptConfig = parseYAML(raw);
    if (!cfg.instructions?.trim()) cfg.instructions = FALLBACK_PROMPT.instructions;
    if (!cfg.escalation_trigger_phrases?.length)
      cfg.escalation_trigger_phrases = FALLBACK_PROMPT.escalation_trigger_phrases;
    _supportPrompt = cfg;
    return cfg;
  } catch {
    console.warn("[agent] Support prompt not found; using fallback");
    _supportPrompt = FALLBACK_PROMPT;
    return FALLBACK_PROMPT;
  }
}

// ─── Start Virtual Agent ──────────────────────────────────────────────────────

export function startVirtualAgent(callControlID: string): void {
  const st = getCall(callControlID);
  if (!st) return;
  st.status = "in_agent";

  const cfg = getConfig();
  const ag = getAgentState(callControlID);
  ag.enabled = true;
  ag.speaking = true;
  ag.processing = false;
  ag.pendingUtterances = [];
  ag.history = [];
  ag.lastUserTranscript = "";
  ag.lastUserAt = undefined;

  sendCommand(callControlID, "actions/transcription_start", {
    transcription_engine: "Google",
    transcription_tracks: "inbound",
  });

  sendCommand(callControlID, "actions/speak", {
    language: "en-US",
    voice: cfg.telnyxVoice,
    payload: cfg.ivrAgentGreetingText,
  });
}

// ─── DTMF Handler ─────────────────────────────────────────────────────────────

export function handleDTMFReceived(p: CallPayload): void {
  const cfg = getConfig();
  const state = getCall(p.call_control_id);
  if (!state) return;
  if (state.inVoicemail) return;
  if (state.pendingLiveKitTransfer || state.liveKitTransferred) return;

  const d = (p.digit ?? "").trim();
  if (!d) return;

  console.log("[agent] DTMF received", { call_id: p.call_control_id, digit: d });

  switch (d) {
    case "1":
      if (cfg.liveKitSIPURI.trim()) {
        disableVirtualAgent(p.call_control_id);
        state.pendingLiveKitTransfer = true;
        markAgentSpeaking(p.call_control_id, true);
        say(p.call_control_id, cfg.ivrTransferText);
        return;
      }
      {
        const to = cfg.humanEscalationNumber.trim();
        if (!to) { disableVirtualAgent(p.call_control_id); startVoicemail(p.call_control_id); return; }
        disableVirtualAgent(p.call_control_id);
        state.pendingTransferTo = to;
        markAgentSpeaking(p.call_control_id, true);
        say(p.call_control_id, cfg.ivrTransferText);
      }
      break;
    case "0":
      disableVirtualAgent(p.call_control_id);
      startVoicemail(p.call_control_id);
      break;
    default:
      break;
  }
}

// ─── Transcription Handler ────────────────────────────────────────────────────

export function handleTranscription(p: CallPayload): void {
  const cfg = getConfig();
  if (!cfg.enableVoiceAgent) return;

  const state = getCall(p.call_control_id);
  if (!state) return;
  if (state.inVoicemail) return;
  if (state.pendingLiveKitTransfer || state.liveKitTransferred) return;
  if (!p.transcription_data?.is_final) return;

  const text = p.transcription_data.transcript.trim();
  if (!text) return;

  const ag = getAgentState(p.call_control_id);
  if (!ag.enabled) return;

  // De-dupe
  if (
    text.toLowerCase() === ag.lastUserTranscript.toLowerCase() &&
    ag.lastUserAt &&
    Date.now() - ag.lastUserAt.getTime() < 2_000
  ) {
    return;
  }
  ag.lastUserTranscript = text;
  ag.lastUserAt = new Date();

  if (ag.speaking || ag.processing) {
    ag.pendingUtterances.push(text);
    if (ag.pendingUtterances.length > 3) {
      ag.pendingUtterances = ag.pendingUtterances.slice(-3);
    }
    return;
  }

  ag.processing = true;
  void processAgentUtterance(p.call_control_id, text);
}

export function onAgentSpeakEnded(callControlID: string): void {
  const ag = getAgentState(callControlID);
  if (!ag.enabled) return;
  ag.speaking = false;

  if (!ag.processing && ag.pendingUtterances.length > 0) {
    const next = ag.pendingUtterances[ag.pendingUtterances.length - 1];
    ag.pendingUtterances = [];
    ag.processing = true;
    void processAgentUtterance(callControlID, next);
  }
}

export function disableVirtualAgent(callControlID: string): void {
  const ag = getAgentState(callControlID);
  ag.enabled = false;
  ag.speaking = false;
  ag.processing = false;
  ag.pendingUtterances = [];
}

export function markAgentSpeaking(callControlID: string, speaking: boolean): void {
  getAgentState(callControlID).speaking = speaking;
}

// ─── Process Utterance ────────────────────────────────────────────────────────

async function processAgentUtterance(callControlID: string, userText: string): Promise<void> {
  const ag = getAgentState(callControlID);
  try {
    const cfg = getConfig();
    const state = getCall(callControlID);
    if (!state || state.inVoicemail) return;

    const norm = userText.toLowerCase().trim();

    if (norm.includes("voicemail") || norm.includes("leave a message") || norm.includes("leave message")) {
      disableVirtualAgent(callControlID);
      startVoicemail(callControlID);
      return;
    }

    const prompt = await loadSupportPrompt();
    if (await wantsEscalation(norm, prompt)) {
      if (!cfg.liveKitSIPURI.trim()) {
        const to = cfg.humanEscalationNumber.trim();
        if (!to) { disableVirtualAgent(callControlID); startVoicemail(callControlID); return; }
        state.pendingTransferTo = to;
        markAgentSpeaking(callControlID, true);
        say(callControlID, "Please hold while I transfer your call.");
        return;
      }
      disableVirtualAgent(callControlID);
      state.pendingLiveKitTransfer = true;
      markAgentSpeaking(callControlID, true);
      say(callControlID, cfg.ivrTransferText);
      return;
    }

    if (!cfg.googleAPIKey.trim()) {
      markAgentSpeaking(callControlID, true);
      say(callControlID, "I'm sorry, I'm having trouble accessing our assistant right now. You can press 1 to reach support, or press 0 to leave a voicemail.");
      return;
    }

    const history: AgentTurn[] = [...(ag.history ?? [])];
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 12_000);
    let resp: string;
    try {
      resp = await generateGeminiReply(ac.signal, cfg.googleAPIKey, cfg.googleGenAIModel, prompt.instructions, history, userText);
    } finally {
      clearTimeout(t);
    }

    resp = sanitizeSpokenText(resp);
    if (!resp) resp = "I can help with orders, returns, shipping, or product questions. What can I help you with today?";

    ag.history = [
      ...ag.history,
      { role: "user", text: userText },
      { role: "assistant", text: resp },
    ].slice(-12);

    markAgentSpeaking(callControlID, true);
    say(callControlID, resp);
  } catch (err) {
    console.warn("[agent] LLM error", { call_id: callControlID, err });
    markAgentSpeaking(callControlID, true);
    say(callControlID, "I'm sorry, I had trouble with that. You can ask again, press 1 to reach support, or press 0 to leave a voicemail.");
  } finally {
    ag.processing = false;
    removeAgentState; // no-op reference to keep import live
    const current = getAgentState(callControlID);
    current.processing = false;
  }
}

async function wantsEscalation(normalizedLower: string, prompt: SupportPromptConfig): Promise<boolean> {
  for (const phrase of prompt.escalation_trigger_phrases) {
    if (normalizedLower.includes(phrase.toLowerCase().trim())) return true;
  }
  if (normalizedLower.includes("connect") && (normalizedLower.includes("support") || normalizedLower.includes("agent") || normalizedLower.includes("representative"))) return true;
  if (normalizedLower.includes("speak") && normalizedLower.includes("support")) return true;
  return false;
}

function sanitizeSpokenText(s: string): string {
  return s.trim().replace(/[\n\r]+/g, " ").replace(/\s+/g, " ");
}
