import { admin, json } from '../lib/server';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });

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

  try {
    const db = admin();
    const { error } = await db.from('allowed_email_domains').select('domain').limit(1);
    supabase = !error;
    allowedDomains = !error;
  } catch {
    supabase = false;
  }

  return json(res, 200, {
    ok: Object.values(env).every(Boolean) && supabase,
    env,
    supabase,
    allowedDomains
  });
}
