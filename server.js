import { createHmac, timingSafeEqual } from "node:crypto";
import config from "../config.js";

const COOKIE = "bird_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

export function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers });
}

export function methodNotAllowed(allowed) {
  return json({ error: "Method not allowed" }, 405, { Allow: allowed.join(", ") });
}

function signature(value) {
  const secret = config.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function readCookie(request) {
  const raw = request.headers.get("cookie") || "";
  const entry = raw.split(";").map(part => part.trim()).find(part => part.startsWith(COOKIE + "="));
  if (!entry) return null;
  try {
    const token = decodeURIComponent(entry.slice(COOKIE.length + 1));
    const splitAt = token.lastIndexOf(".");
    if (splitAt < 1) return null;
    const payload = token.slice(0, splitAt), supplied = token.slice(splitAt + 1), expected = signature(payload);
    const a = Buffer.from(supplied), b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString());
    return session.exp > Date.now() && session.accessToken && session.refreshToken && session.userId ? session : null;
  } catch { return null; }
}

function cookieFor(session) {
  const payload = Buffer.from(JSON.stringify({ ...session, exp: Date.now() + SESSION_SECONDS * 1000 })).toString("base64url");
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${encodeURIComponent(payload + "." + signature(payload))}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`;
}

export async function getSession(request) {
  const session = readCookie(request);
  if (!session) return null;
  if (session.tokenExpiresAt > Date.now() + 60_000) return { session, cookie: null };
  if (!config.SUPABASE_URL || !config.SUPABASE_PUBLISHABLE_KEY) return null;
  try {
    const response = await fetch(`${config.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: config.SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
      signal: AbortSignal.timeout(15_000)
    });
    const tokens = await response.json();
    if (!response.ok || !tokens.access_token || !tokens.refresh_token) return null;
    const renewed = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: (tokens.expires_at || Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600)) * 1000,
      userId: tokens.user?.id || session.userId,
      email: tokens.user?.email || session.email || ""
    };
    return { session: renewed, cookie: cookieFor(renewed) };
  } catch { return null; }
}

export function withSessionCookie(response, sessionResult) {
  if (!sessionResult?.cookie) return response;
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", sessionResult.cookie);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function sessionCookie(tokens) {
  const session = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiresAt: (tokens.expires_at || Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600)) * 1000,
    userId: tokens.user?.id,
    email: tokens.user?.email || ""
  };
  return cookieFor(session);
}

export function supabaseUserHeaders(session) {
  if (!config.SUPABASE_URL || !config.SUPABASE_PUBLISHABLE_KEY) throw new Error("Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in the server environment.");
  return {
    url: config.SUPABASE_URL.replace(/\/$/, ""),
    headers: { apikey: config.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" }
  };
}

export async function readJson(request, maxBytes = 2_000_000) {
  const text = await request.text();
  if (text.length > maxBytes) throw new Error("Request is too large.");
  try { return JSON.parse(text); } catch { throw new Error("Invalid JSON request."); }
}
