// src/lib/agent.ts
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import { getConfig } from "./config";
import { getAgentState, getCall } from "./state";
import { say } from "./telnyx";
import { generateGeminiReply } from "./gemini";
import { startVoicemail } from "./voicemail";

interface SupportPromptConfig {
  instructions: string;
  escalation_trigger_phrases: string[];
  escalation_number: string;
}

let _supportPrompt: SupportPromptConfig | null = null;

function loadSupportPrompt(): SupportPromptConfig {
  if (_supportPrompt) return _supportPrompt;
  const fallback: SupportPromptConfig = {
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
  const path = join(process.cwd(), "prompts", "support.yaml");
  if (!existsSync(path)) {
    _supportPrompt = fallback;
    return fallback;
  }
  try {
    const content = readFileSync(path, "utf-8");
    _supportPrompt = { ...fallback, ...(parse(content) as Partial<SupportPromptConfig>) };
    return _supportPrompt!;
  } catch {
    _supportPrompt = fallback;
    return fallback;
  }
}

export function startVirtualAgent(callControlId: string): void {
  const cfg = getConfig();
  const st = getAgentState(callControlId);
  st.enabled = true;
  say(callControlId, cfg.ivrAgentGreetingText);
  st.speaking = true;
}

export function onAgentSpeakEnded(callControlId: string): void {
  const st = getAgentState(callControlId);
  if (!st.enabled) return;
  st.speaking = false;
  const pending = st.pendingUtterances.splice(0);
  if (pending.length > 0) {
    processAgentUtterance(callControlId, pending.join(" "));
  }
}

export function handleTranscription(
  callControlId: string,
  transcript: string,
  isFinal: boolean
): void {
  if (!isFinal) return;
  const cfg = getConfig();
  if (!cfg.enableVoiceAgent) return;
  const st = getAgentState(callControlId);
  if (!st.enabled) return;
  st.lastUserTranscript = transcript;
  st.lastUserAt = new Date();
  if (st.speaking || st.processing) {
    st.pendingUtterances.push(transcript);
    return;
  }
  processAgentUtterance(callControlId, transcript);
}

async function processAgentUtterance(callControlId: string, userText: string): Promise<void> {
  const cfg = getConfig();
  const prompt = loadSupportPrompt();
  const st = getAgentState(callControlId);
  const state = getCall(callControlId);
  if (!state) return;

  const lowerText = userText.toLowerCase();
  const wantsEscalation = prompt.escalation_trigger_phrases.some((p) =>
    lowerText.includes(p.toLowerCase())
  );

  if (wantsEscalation && cfg.liveKitSipUri) {
    state.pendingLiveKitTransfer = true;
    say(callControlId, cfg.ivrTransferText);
    st.speaking = true;
    return;
  }

  if (wantsEscalation && !cfg.liveKitSipUri) {
    startVoicemail(callControlId);
    return;
  }

  const dtmfPatterns = [/^[01]$/, /press\s*1/, /press\s*0/, /option\s*1/, /voicemail/];
  if (dtmfPatterns.some((p) => p.test(lowerText))) {
    if (lowerText.includes("0") || lowerText.includes("voicemail")) {
      startVoicemail(callControlId);
    } else if (cfg.liveKitSipUri) {
      state.pendingLiveKitTransfer = true;
      say(callControlId, cfg.ivrTransferText);
      st.speaking = true;
    }
    return;
  }

  st.processing = true;
  try {
    const reply = await generateGeminiReply(
      cfg.googleApiKey,
      cfg.googleGenAiModel,
      prompt.instructions,
      st.history,
      userText
    );
    if (!reply) {
      st.processing = false;
      return;
    }
    st.history.push({ role: "user", text: userText });
    st.history.push({ role: "assistant", text: reply });
    if (st.history.length > 20) st.history = st.history.slice(-20);
    st.speaking = true;
    say(callControlId, reply);
  } catch (err) {
    console.error("[agent] Gemini error:", err);
  } finally {
    st.processing = false;
  }
}
