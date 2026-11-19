// Server config: set secrets only in Vercel Environment Variables or local .env.local.
const config = Object.freeze({
  SESSION_SECRET: process.env.SESSION_SECRET || "",
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || ""
});
export default config;
