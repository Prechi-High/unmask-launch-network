# Unmask Launch Network

**Unmask — Know before you buy.**

This is the standalone launch-network website for Unmask. It is designed for Vercel and uses the existing **proCommunity** Supabase project for accounts, live voting, suggestions, ownership verification, product intelligence, experiences and Unmask Coins.

## What is implemented

- Email + password account creation.
- Custom verification email sent with Nodemailer/Gmail.
- Normal returning login with email + password.
- Recognised email-domain allowlist.
- Persistent Supabase sessions.
- Live dashboard — no fabricated users, products or counts.
- Top categories and products from real launch activity.
- Dashboard build-list tasks.
- X follow task: +100 Coins.
- TikTok follow task: +100 Coins.
- Category voting after joining, not during signup.
- Camera-first product Unmask flow.
- Product photo identification through the existing `product-vision` service.
- Product matching/search through the existing `product-intelligence` service.
- Existing ownership verification reused for current owners.
- Structured usage duration, frequency and acquisition source.
- Product suggestions and long-term experience storage.
- Evidence/reward separation retained.

## Vercel environment variables

Add these in **Vercel → Project → Settings → Environment Variables**:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key

SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

AUTH_EMAIL_ADDRESS=your_sender_gmail
AUTH_EMAIL_APP_PASSWORD=your_16_character_gmail_app_password

VERIFICATION_PEPPER=use_a_long_random_secret
```

The `VITE_` variables are public browser configuration. Never put the service-role key or Gmail App Password in a `VITE_` variable.

## Deploy

1. Import this repository into Vercel.
2. Keep the detected framework as **Vite**.
3. Add the environment variables above.
4. Deploy.

Vercel will automatically redeploy whenever changes are pushed to `main`.

## Local development

```bash
npm install
npm run dev
```

For local serverless API testing, use the Vercel CLI if needed.

## Architecture

The launch site does not duplicate the product-intelligence stack. Product search and camera recognition call the existing Supabase Edge Functions, where the current NVIDIA / Gemini / OpenRouter fallback configuration remains managed.
