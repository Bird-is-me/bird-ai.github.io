import config from "../config.js";
import { clearSessionCookie, getSession, json, methodNotAllowed, readJson, sessionCookie, withSessionCookie } from "../lib/server.js";

export async function GET(request) {
  const result = await getSession(request);
  if (!result) return json({ authenticated: false }, 200, { "Cache-Control": "no-store" });
  return withSessionCookie(json({ authenticated: true, userId: result.session.userId, email: result.session.email }, 200, { "Cache-Control": "no-store" }), result);
}

export async function POST(request) {
  if (!config.SUPABASE_URL || !config.SUPABASE_PUBLISHABLE_KEY) return json({ error: "Supabase Auth is not configured on the server." }, 503);
  try {
    const body = await readJson(request, 10_000);
    const action = body.action;
    if (action === "logout") return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
    if (!["login", "signup"].includes(action)) return json({ error: "Choose sign in or sign up." }, 400);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || email.length > 320 || !email.includes("@")) return json({ error: "Enter a valid email address." }, 400);
    if (password.length < 8 || password.length > 256) return json({ error: "Password must be 8 to 256 characters." }, 400);

    const signup = action === "signup";
    const endpoint = signup ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
    const response = await fetch(config.SUPABASE_URL.replace(/\/$/, "") + endpoint, {
      method: "POST",
      headers: { apikey: config.SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(20_000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.msg || data.message || data.error_description || data.error || "Authentication failed.";
      return json({ error: message }, response.status === 429 ? 429 : 401);
    }
    if (!data.access_token || !data.refresh_token) {
      if (signup) return json({ ok: true, confirmationRequired: true, message: "Check your email to confirm your account, then sign in." });
      return json({ error: "Supabase did not return a session. Check your email confirmation settings." }, 401);
    }
    return json({ ok: true, userId: data.user?.id, email: data.user?.email }, 200, { "Set-Cookie": sessionCookie(data), "Cache-Control": "no-store" });
  } catch (error) {
    return json({ error: error.message || "Authentication request failed." }, 400);
  }
}
