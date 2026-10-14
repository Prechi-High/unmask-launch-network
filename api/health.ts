import { createClient } from '@supabase/supabase-js';

export default async function handler(_req, res) {
  const env = {
    VITE_SUPABASE_URL: Boolean(process.env.VITE_SUPABASE_URL),
    VITE_SUPABASE_PUBLISHABLE_KEY: Boolean(process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    AUTH_EMAIL_ADDRESS: Boolean(process.env.AUTH_EMAIL_ADDRESS),
    AUTH_EMAIL_APP_PASSWORD: Boolean(process.env.AUTH_EMAIL_APP_PASSWORD),
    VERIFICATION_PEPPER: Boolean(process.env.VERIFICATION_PEPPER)
  };

  let supabase = false;
  let allowedDomains = false;
  let error = null;

  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase server configuration.');
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await admin.from('allowed_email_domains').select('domain').limit(1);
    if (result.error) throw result.error;
    supabase = true;
    allowedDomains = true;
  } catch (e) {
    error = e?.message || 'Supabase check failed.';
  }

  const ok = Object.values(env).every(Boolean) && supabase;
  return res.status(ok ? 200 : 503).json({ ok, env, supabase, allowedDomains, error });
}
