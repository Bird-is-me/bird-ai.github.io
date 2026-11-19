import { getSession, json, methodNotAllowed, readJson, supabaseUserHeaders, withSessionCookie } from "../lib/server.js";

async function handle(request) {
  const auth = await getSession(request);
  if (!auth) return json({ error: "Please sign in again." }, 401, { "Cache-Control": "no-store" });
  try {
    const { url, headers } = supabaseUserHeaders(auth.session);
    const table = `${url}/rest/v1/bird_chats`;
    if (request.method === "GET") {
      const response = await fetch(`${table}?select=id,title,messages,updated&order=updated.desc`, { headers, signal: AbortSignal.timeout(20_000) });
      const data = await response.json().catch(() => ({}));
      return withSessionCookie(json(data, response.status, { "Cache-Control": "no-store" }), auth);
    }
    if (request.method === "POST") {
      const body = await readJson(request);
      if (!Array.isArray(body.chats) || body.chats.length > 200) return json({ error: "Invalid chat list." }, 400);
      const chats = body.chats.map(chat => {
        if (!chat || typeof chat.id !== "string" || typeof chat.title !== "string" || !Array.isArray(chat.messages)) throw new Error("Invalid chat data.");
        return { id: chat.id.slice(0, 100), owner_id: auth.session.userId, title: chat.title.slice(0, 300), messages: chat.messages, updated: Number(chat.updated) || Date.now() };
      });
      const response = await fetch(`${table}?on_conflict=id`, { method: "POST", headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(chats), signal: AbortSignal.timeout(20_000) });
      if (!response.ok) return json({ error: await response.text() || "Supabase save failed." }, response.status);
      return withSessionCookie(json({ ok: true }), auth);
    }
    if (request.method === "DELETE") {
      const query = new URL(request.url).searchParams;
      const filter = query.get("all") === "1" ? "id=not.is.null" : `id=eq.${encodeURIComponent(query.get("id") || "")}`;
      if (query.get("all") !== "1" && !query.get("id")) return json({ error: "Chat id is required." }, 400);
      const response = await fetch(`${table}?${filter}`, { method: "DELETE", headers: { ...headers, Prefer: "return=minimal" }, signal: AbortSignal.timeout(20_000) });
      if (!response.ok) return json({ error: await response.text() || "Supabase delete failed." }, response.status);
      return withSessionCookie(json({ ok: true }), auth);
    }
    return methodNotAllowed(["GET", "POST", "DELETE"]);
  } catch (error) {
    return json({ error: error.message || "Supabase request failed." }, 503);
  }
}

export function GET(request) { return handle(request); }
export function POST(request) { return handle(request); }
export function DELETE(request) { return handle(request); }
