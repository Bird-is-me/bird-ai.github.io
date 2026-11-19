# Bird AI backend setup

Bird AI uses Vercel Functions for its API. Deploy the project to Vercel so `/api/*` and the static `index.html` share the same origin. GitHub Pages cannot run these API functions.

The backend reads server secrets from [`config.js`](config.js), which resolves them from environment variables. The browser reads public API URLs from [`client-config.js`](client-config.js). Never put private keys in the browser config.

## 1. Create the Supabase table

In Supabase, open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. RLS policies scope each row to the signed-in Supabase Auth user.

## 2. Enable Supabase Auth and configure environment variables

In Supabase **Authentication → URL Configuration**, set the Site URL to your Vercel deployment URL. Choose whether email confirmation is enabled in **Authentication → Providers → Email**. With confirmation enabled, new users must click the Supabase email link before signing in.

In Vercel, open the project’s **Settings → Environment Variables** and add:

| Variable | Value |
| --- | --- |
| `SESSION_SECRET` | A random string with at least 32 characters |
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `SUPABASE_URL` | The Supabase Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | The Supabase publishable key (`sb_publishable_…`) |

Keep the OpenRouter key and session secret in Vercel’s server environment. The Supabase publishable key is safe to use as a client key, but this app currently sends it through its backend. Do not use a Supabase secret/service-role key for normal chat requests; user JWTs and RLS enforce per-account access.

Redeploy after adding or changing environment variables.

## 3. Deploy and sign in

Import this repository into Vercel and deploy it. Open the deployment URL, choose **Sign up**, create an account, and sign in. Then choose an OpenRouter model in **Settings**. Chat requests and database reads/writes go through authenticated backend routes.

For local development, copy `.env.example` to `.env.local`, fill in the values, and run `npx vercel dev`.

Each Supabase Auth account sees only its own chats through row-level security policies.
