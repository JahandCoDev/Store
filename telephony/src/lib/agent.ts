// src/lib/agent.ts
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import { getConfig } from "./config";
import { log } from "./log";
import { getAgentState, getCall } from "./state";
import { say, sendCommand } from "./telnyx";
import { generateGeminiReply } from "./gemini";
import { startVoicemail } from "./voicemail";
import {
  getOrderSupportSummary,
  humanizeStatus,
  identifyCustomerFromContact,
  type InventorySupportSummary,
  lookupCustomerByPhone,
  type OrderSupportSummary,
  recordCustomerSupportNote,
  searchInventory,
} from "./support-tools";

interface SupportPromptConfig {
  instructions: string;
  escalation_trigger_phrases: string[];
  escalation_number: string;
}

let _supportPrompt: SupportPromptConfig | null = null;

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const ORDER_NUMBER_PATTERN = /(?:order(?:\s+number|\s+no\.?|\s*#)?\s*)(\d{3,})|#(\d{3,})|\b(\d{4,})\b/i;
const PHONE_CHUNK_PATTERN = /(?:\+?\d[\d()\s.-]{8,}\d)/;
const ORDER_INTENT_PATTERNS = [
  /order/i,
  /tracking/i,
  /shipment/i,
  /shipping status/i,
  /where('?s| is) my package/i,
  /payment status/i,
  /invoice/i,
];
const STOCK_INTENT_PATTERNS = [
  /in stock/i,
  /availability/i,
  /available/i,
  /inventory/i,
  /do you have/i,
  /can you check stock/i,
  /sku/i,
];
const ORDER_CHANGE_PATTERNS = [
  /cancel (?:my |the )?order/i,
  /modify (?:my |the )?order/i,
  /change (?:my |the )?order/i,
  /update (?:my |the )?order/i,
  /edit (?:my |the )?order/i,
  /change (?:the )?(?:address|size|color|item)/i,
];
const PAYMENT_ESCALATION_PATTERNS = [
  /pay (?:my |the )?(?:invoice|bill|balance|order) over the phone/i,
  /take (?:my )?payment/i,
  /read(?:ing)? (?:my )?card/i,
  /credit card/i,
  /debit card/i,
  /cvv/i,
];
const AUTH_HINT_PATTERNS = [
  /my email/i,
  /my phone/i,
  /my number/i,
  /it'?s under/i,
  /authenticate/i,
  /verify/i,
];

function loadSupportPrompt(): SupportPromptConfig {
  if (_supportPrompt) return _supportPrompt;
  const fallback: SupportPromptConfig = {
    instructions:
      "You are a friendly and professional customer support representative for Jah and Co, an e-commerce store. Keep answers brief and conversational for a phone call. Never use markdown or lists. If the caller asks to speak to support, offer to transfer them. If you are uncertain, say so and offer to transfer.",
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
  void initializeVirtualAgent(callControlId);
}

async function initializeVirtualAgent(callControlId: string): Promise<void> {
  const cfg = getConfig();
  const st = getAgentState(callControlId);
  st.enabled = true;

  const call = getCall(callControlId);
  if (call?.from) {
    try {
      const callerIdentity = await lookupCustomerByPhone(call.from);
      if (callerIdentity) {
        st.callerIdentity = callerIdentity;
        st.authenticatedContact = {
          type: "phone",
          value: call.from,
        };
      }
    } catch (err) {
      log.error("agent caller identity lookup failed", { call_id: callControlId, error: String(err) });
    }
  }

  // Start streaming transcription so the agent can hear the caller throughout the call.
  // Engine "A" = Telnyx's own ASR. Uses ISO 639-1 codes ("en"), NOT BCP-47 ("en-US").
  await sendCommand(callControlId, "actions/transcription_start", {
    transcription_engine: "A",
    language: "en",
    transcription_tracks: "inbound",
  });
  log.info("agent initialized", { call_id: callControlId, caller_known: !!st.callerIdentity });

  say(callControlId, buildGreeting(st.callerIdentity?.firstName ?? null, cfg.ivrAgentGreetingText));
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
    log.info("agent transcript buffered", { call_id: callControlId, transcript });
    st.pendingUtterances.push(transcript);
    return;
  }
  log.info("agent heard", { call_id: callControlId, transcript });
  processAgentUtterance(callControlId, transcript);
}

async function processAgentUtterance(callControlId: string, userText: string): Promise<void> {
  const cfg = getConfig();
  const prompt = loadSupportPrompt();
  const st = getAgentState(callControlId);
  const state = getCall(callControlId);
  if (!state) return;
  log.info("agent processing utterance", { call_id: callControlId, text: userText });

  const lowerText = userText.toLowerCase();
  const wantsEscalation = prompt.escalation_trigger_phrases.some((p) =>
    lowerText.includes(p.toLowerCase())
  );

  const providedContact = extractProvidedContact(userText);
  if (providedContact && (st.pendingIntent?.type === "order_lookup" || hasAuthHint(userText))) {
    const authReply = await handleAuthentication(callControlId, providedContact);
    if (authReply) {
      st.speaking = true;
      say(callControlId, authReply);
      return;
    }
  }

  if (ORDER_CHANGE_PATTERNS.some((pattern) => pattern.test(userText))) {
    await logSupportEvent(st, "Telephony assistant escalated an order modification or cancellation request.");
    transferToHuman(callControlId, "I need to connect you with support for order changes. Please hold while I transfer your call.");
    return;
  }

  if (PAYMENT_ESCALATION_PATTERNS.some((pattern) => pattern.test(userText))) {
    await logSupportEvent(st, "Telephony assistant escalated a phone payment request.");
    transferToHuman(callControlId, "I cannot take card or payment details over the phone. Please hold while I connect you with support.");
    return;
  }

  if (wantsEscalation) {
    transferToHuman(callControlId, cfg.ivrTransferText);
    return;
  }

  const dtmfPatterns = [/^[01]$/, /press\s*1/, /press\s*0/, /option\s*1/, /voicemail/];
  if (dtmfPatterns.some((p) => p.test(lowerText))) {
    if (lowerText.includes("0") || lowerText.includes("voicemail")) {
      startVoicemail(callControlId);
    } else {
      transferToHuman(callControlId, cfg.ivrTransferText);
    }
    return;
  }

  const orderReply = await maybeHandleOrderIntent(callControlId, userText);
  if (orderReply) {
    st.speaking = true;
    say(callControlId, orderReply);
    return;
  }

  const stockReply = await maybeHandleStockIntent(callControlId, userText);
  if (stockReply) {
    st.speaking = true;
    say(callControlId, stockReply);
    return;
  }

  st.processing = true;
  try {
    const reply = await generateGeminiReply(
      cfg.googleCloudProject,
      cfg.googleGenAiModel,
      buildDynamicInstructions(prompt.instructions, st),
      st.history,
      userText,
      cfg.googleCloudRegion
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
    log.error("agent gemini error", { call_id: callControlId, error: String(err) });
  } finally {
    st.processing = false;
  }
}

const GREETINGS_NAMED: Array<(n: string) => string> = [
  (n) => `Hi ${n}! Thanks for calling Jah and Co. I'm your virtual assistant — ask about an order, check what's in stock, or say agent to reach the team.`,
  (n) => `Hey ${n}! Great to hear from you. I'm the Jah and Co virtual assistant. What can I help you with today?`,
  (n) => `Hello ${n}, welcome back! I'm the Jah and Co assistant. Feel free to ask about your order, our products, or say agent if you'd like to speak with someone.`,
];
const GREETINGS_ANONYMOUS = [
  `Hi there! Thanks for calling Jah and Co. I'm your virtual assistant. Ask about an order, check what's in stock, or press zero to leave a voicemail.`,
  `Hey, thanks for calling Jah and Co! I'm here to help. Ask about your order, check availability, or say agent to reach the team.`,
  `Hello! Welcome to Jah and Co. I'm the virtual support assistant, ready to help with orders, inventory, or anything else on your mind.`,
  `Thanks for calling Jah and Co! I'm your virtual assistant. Ask about an order, check product availability, or say agent to speak with someone.`,
];

function buildGreeting(firstName: string | null, fallbackGreeting: string): string {
  if (firstName) {
    const pick = GREETINGS_NAMED[Math.floor(Math.random() * GREETINGS_NAMED.length)];
    return pick(firstName);
  }
  const pool = [fallbackGreeting, ...GREETINGS_ANONYMOUS];
  return pool[Math.floor(Math.random() * pool.length)];
}

function extractProvidedContact(userText: string): string | null {
  const emailMatch = userText.match(EMAIL_PATTERN);
  if (emailMatch) return emailMatch[0];

  const phoneMatch = userText.match(PHONE_CHUNK_PATTERN);
  if (phoneMatch) return phoneMatch[0];

  return null;
}

function extractOrderNumber(userText: string): number | null {
  const match = userText.match(ORDER_NUMBER_PATTERN);
  const raw = match?.[1] ?? match?.[2] ?? match?.[3];
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasAuthHint(userText: string): boolean {
  return AUTH_HINT_PATTERNS.some((pattern) => pattern.test(userText));
}

function transferToHuman(callControlId: string, message: string): void {
  const cfg = getConfig();
  const st = getAgentState(callControlId);
  const state = getCall(callControlId);
  if (!state) return;

  if (cfg.liveKitSipUri) {
    state.pendingLiveKitTransfer = true;
  } else if (cfg.humanEscalationNumber) {
    state.pendingTransferTo = cfg.humanEscalationNumber;
  } else {
    startVoicemail(callControlId);
    return;
  }

  say(callControlId, message);
  st.speaking = true;
}

function buildDynamicInstructions(baseInstructions: string, st: ReturnType<typeof getAgentState>): string {
  const context: string[] = [baseInstructions.trim()];
  context.push(
    "Operational guardrails: For order-specific details, require an order number and verified email or phone unless the inbound caller phone already matches the customer record. Never invent order, payment, or inventory details. Never collect or repeat credit card numbers, CVV codes, or bank details. Transfer order modifications, cancellations, and payment collection requests to a human immediately."
  );

  if (st.callerIdentity) {
    context.push(`Known caller: ${st.callerIdentity.fullName}. Use their first name naturally when appropriate.`);
  }

  if (st.authenticatedContact) {
    context.push(`Verified contact on this call: ${st.authenticatedContact.type}.`);
  }

  if (st.pendingIntent?.type === "order_lookup" && st.pendingIntent.orderNumber) {
    context.push(`Pending task: help with order ${st.pendingIntent.orderNumber}.`);
  }

  if (st.pendingIntent?.type === "stock_lookup" && st.pendingIntent.productQuery) {
    context.push(`Pending task: help with stock for ${st.pendingIntent.productQuery}.`);
  }

  return context.join("\n\n");
}

async function handleAuthentication(callControlId: string, contactValue: string): Promise<string | null> {
  const st = getAgentState(callControlId);
  const result = await identifyCustomerFromContact(contactValue);
  if (!result.contact) return null;

  st.authenticatedContact = result.contact;
  if (result.identity) {
    st.callerIdentity = result.identity;
  }

  if (st.pendingIntent?.type === "order_lookup" && st.pendingIntent.orderNumber) {
    const pendingOrderNumber = st.pendingIntent.orderNumber;
    const orderResult = await getOrderSupportSummary(
      pendingOrderNumber,
      st.authenticatedContact,
      st.callerIdentity
    );

    if (orderResult.kind === "ok") {
      st.pendingIntent = undefined;
      return buildOrderReply(orderResult.order, st.callerIdentity?.firstName ?? null);
    }

    if (orderResult.kind === "not_found") {
      st.pendingIntent = undefined;
      return `I could not find order ${pendingOrderNumber}. Please say the order number again, or say agent if you want support.`;
    }

    return `Thanks. I still cannot verify that order with that ${result.contact.type}. Please try the other contact used on the order, or say agent for support.`;
  }

  if (result.identity?.firstName) {
    return `Thanks ${result.identity.firstName}. I found your account. What order number or product would you like me to check?`;
  }

  return `Thanks. I have that ${result.contact.type} on file. What order number or product would you like me to check?`;
}

async function maybeHandleOrderIntent(callControlId: string, userText: string): Promise<string | null> {
  const st = getAgentState(callControlId);
  const orderNumber = extractOrderNumber(userText) ?? st.pendingIntent?.orderNumber ?? null;
  const wantsOrderHelp =
    st.pendingIntent?.type === "order_lookup" ||
    orderNumber !== null ||
    ORDER_INTENT_PATTERNS.some((pattern) => pattern.test(userText));

  if (!wantsOrderHelp) return null;

  if (orderNumber === null) {
    st.pendingIntent = { type: "order_lookup" };
    return "I can check that. Please tell me your order number.";
  }

  st.pendingIntent = {
    type: "order_lookup",
    orderNumber,
  };

  const orderResult = await getOrderSupportSummary(
    orderNumber,
    st.authenticatedContact,
    st.callerIdentity
  );

  if (orderResult.kind === "not_found") {
    st.pendingIntent = undefined;
    return `I could not find order ${orderNumber}. Please check the number and say it again.`;
  }

  if (orderResult.kind === "auth_required") {
    return `I found order ${orderNumber}. For security, please tell me the email address or phone number used on that order.`;
  }

  st.pendingIntent = undefined;
  return buildOrderReply(orderResult.order, st.callerIdentity?.firstName ?? null);
}

async function maybeHandleStockIntent(callControlId: string, userText: string): Promise<string | null> {
  const st = getAgentState(callControlId);
  const wantsStockHelp =
    st.pendingIntent?.type === "stock_lookup" ||
    STOCK_INTENT_PATTERNS.some((pattern) => pattern.test(userText));

  if (!wantsStockHelp) return null;

  const query =
    st.pendingIntent?.type === "stock_lookup" && !STOCK_INTENT_PATTERNS.some((pattern) => pattern.test(userText))
      ? userText.trim()
      : extractProductQuery(userText);

  if (!query) {
    st.pendingIntent = { type: "stock_lookup" };
    return "I can check stock. Please say the product name or SKU.";
  }

  st.pendingIntent = {
    type: "stock_lookup",
    productQuery: query,
  };

  const matches = await searchInventory(query);
  st.pendingIntent = undefined;

  if (matches.length === 0) {
    return `I could not find a product matching ${query}. Please say the product name or SKU again.`;
  }

  return buildInventoryReply(matches);
}

function buildOrderReply(order: OrderSupportSummary, firstName: string | null): string {
  const parts: string[] = [];
  const intro = firstName ? `${firstName}, order ${order.orderNumber}` : `Order ${order.orderNumber}`;
  parts.push(`${intro} is currently ${humanizeStatus(order.status)}.`);
  parts.push(
    `Payment is ${humanizeStatus(order.financialStatus)}, and fulfillment is ${humanizeStatus(order.fulfillmentStatus)}.`
  );

  if (order.trackingNumber) {
    const carrier = order.carrier ? ` with ${order.carrier}` : "";
    parts.push(`I also see tracking${carrier} on file.`);
  }

  const note = sanitizeForSpeech(order.note || order.fulfillmentNotes || "");
  if (note) {
    parts.push(`The latest note says ${note}.`);
  }

  return parts.join(" ");
}

function buildInventoryReply(items: InventorySupportSummary[]): string {
  if (items.length === 1) {
    const item = items[0];
    if (item.inStock) {
      if (item.inventory === null) {
        return `${item.variantTitle} is available right now.`;
      }
      return `${item.variantTitle} is in stock. I currently see ${item.inventory} available.`;
    }
    return `${item.variantTitle} is currently out of stock.`;
  }

  const spokenMatches = items
    .slice(0, 3)
    .map((item) => {
      if (item.inStock) {
        if (item.inventory === null) {
          return `${item.variantTitle} is available`;
        }
        return `${item.variantTitle} has ${item.inventory} in stock`;
      }
      return `${item.variantTitle} is out of stock`;
    })
    .join(". ");

  return `I found a few matches. ${spokenMatches}.`;
}

function extractProductQuery(userText: string): string {
  return userText
    .replace(/can you/gi, " ")
    .replace(/please/gi, " ")
    .replace(/check/gi, " ")
    .replace(/do you have/gi, " ")
    .replace(/is there/gi, " ")
    .replace(/in stock/gi, " ")
    .replace(/availability/gi, " ")
    .replace(/available/gi, " ")
    .replace(/inventory/gi, " ")
    .replace(/for me/gi, " ")
    .replace(/sku/gi, " ")
    .replace(/product/gi, " ")
    .replace(/item/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeForSpeech(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[<>]/g, "").trim().slice(0, 180);
}

async function logSupportEvent(st: ReturnType<typeof getAgentState>, message: string): Promise<void> {
  if (!st.callerIdentity?.userId) return;
  try {
    await recordCustomerSupportNote(st.callerIdentity.userId, message);
  } catch (err) {
    log.error("agent support note write failed", { error: String(err) });
  }
}
