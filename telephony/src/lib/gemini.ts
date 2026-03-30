// src/lib/gemini.ts
interface GeminiPart {
  text: string;
}
interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}

interface AgentTurn {
  role: string;
  text: string;
}

export async function generateGeminiReply(
  apiKey: string,
  model: string,
  systemInstruction: string,
  history: AgentTurn[],
  userText: string
): Promise<string> {
  if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");
  const m = model || "gemini-2.0-flash";

  const contents: GeminiContent[] = [];
  for (const t of history) {
    const text = t.text.trim();
    if (!text) continue;
    contents.push({ role: t.role === "assistant" ? "model" : "user", parts: [{ text }] });
  }
  contents.push({ role: "user", parts: [{ text: userText }] });

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature: 0.4, maxOutputTokens: 220 },
  };
  if (systemInstruction.trim()) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content: GeminiContent }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}
