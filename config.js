// Server config: set secrets only in Vercel Environment Variables or local .env.local.
const config = Object.freeze({
  SESSION_SECRET: process.env.SESSION_SECRET || "1234567890123456789012345678901234",
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "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",
  SUPABASE_URL: process.env.SUPABASE_URL || "https://bjqbdwlavgrrowaplbav.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_OxG5gMYxCimI4Uz6HKRaIA_8YFteMkU"
});
export default config;
