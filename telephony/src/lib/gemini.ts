// src/lib/gemini.ts — uses Vertex AI endpoint with Application Default Credentials
import { GoogleAuth } from "google-auth-library";

interface GeminiPart {
  text: string;
}
interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}

export interface AgentTurn {
  role: string;
  text: string;
}

// Singleton auth client — reuses tokens until expiry
const _auth = new GoogleAuth({
  scopes: "https://www.googleapis.com/auth/cloud-platform",
});

export async function generateGeminiReply(
  project: string,
  model: string,
  systemInstruction: string,
  history: AgentTurn[],
  userText: string,
  region = "us-central1"
): Promise<string> {
  if (!project) throw new Error("Missing GOOGLE_CLOUD_PROJECT");
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

  const client = await _auth.getClient();
  const tokenRes = await client.getAccessToken();
  const token = tokenRes.token;
  if (!token) throw new Error("Failed to obtain GCP access token");

  const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/publishers/google/models/${m}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Vertex AI error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content: GeminiContent }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}
