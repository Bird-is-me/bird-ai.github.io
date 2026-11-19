import { getSession, json, readJson, withSessionCookie } from "../lib/server.js";
import config from "../config.js";

export async function POST(request) {
  const auth = await getSession(request);
  if (!auth) return json({ error: "Please sign in again." }, 401, { "Cache-Control": "no-store" });
  const key = config.OPENROUTER_API_KEY;
  if (!key) return json({ error: "OPENROUTER_API_KEY is not configured on the server." }, 503);
  try {
    const body = await readJson(request);
    if (typeof body.model !== "string" || body.model.length > 200) return json({ error: "Choose a valid model." }, 400);
    if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 100) return json({ error: "Invalid message history." }, 400);
    const messages = body.messages.map(message => {
      if (!message || !["system", "user", "assistant"].includes(message.role) || typeof message.content !== "string") throw new Error("Invalid message format.");
      return { role: message.role, content: message.content.slice(0, 30_000) };
    });
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-Title": "Bird AI" },
      body: JSON.stringify({ model: body.model, messages, temperature: 0.7, max_tokens: 4096 }),
      signal: AbortSignal.timeout(240_000)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return json({ error: data?.error?.message || `OpenRouter request failed (${upstream.status}).` }, upstream.status);
    return withSessionCookie(json(data, 200, { "Cache-Control": "no-store" }), auth);
  } catch (error) {
    const status = error.name === "TimeoutError" ? 504 : 400;
    return json({ error: error.message || "Unable to reach OpenRouter." }, status);
  }
}
