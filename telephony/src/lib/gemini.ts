// telephony/src/lib/gemini.ts
// Converted from gemini.go

import type { AgentTurn } from "./state";

interface GeminiContent {
  role?: string;
  parts: { text: string }[];
}

interface GeminiRequest {
  systemInstruction?: { parts: { text: string }[] };
  contents: GeminiContent[];
  generationConfig?: { temperature: number; maxOutputTokens: number };
}

interface GeminiResponse {
  candidates: { content: GeminiContent }[];
}

export async function generateGeminiReply(
  signal: AbortSignal,
  apiKey: string,
  model: string,
  systemInstruction: string,
  history: AgentTurn[],
  userText: string
): Promise<string> {
  if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");
  if (!model) model = "gemini-2.0-flash";

  const contents: GeminiContent[] = [];
  for (const t of history) {
    const text = t.text.trim();
    if (!text) continue;
    contents.push({ role: t.role === "assistant" ? "model" : "user", parts: [{ text }] });
  }
  contents.push({ role: "user", parts: [{ text: userText }] });

  const reqBody: GeminiRequest = {
    contents,
    generationConfig: { temperature: 0.4, maxOutputTokens: 220 },
  };
  if (systemInstruction.trim()) {
    reqBody.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reqBody),
    signal,
  });

  const body = await resp.text();
  if (!resp.ok) {
    throw new Error(`Gemini API status ${resp.status}: ${body.slice(0, 300)}`);
  }

  const parsed: GeminiResponse = JSON.parse(body);
  if (!parsed.candidates?.length) throw new Error("No candidates");
  const c = parsed.candidates[0].content;
  if (!c.parts?.length) throw new Error("Empty response");
  return c.parts[0].text.trim();
}
