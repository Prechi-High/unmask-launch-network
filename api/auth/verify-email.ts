import { createClient } from '@supabase/supabase-js';
import * as crypto from 'node:crypto';

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server is missing Supabase configuration.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function reply(res, status, body) {
  return res.status(status).json(body);
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code + (process.env.VERIFICATION_PEPPER || '')).digest('hex');
}

async function logFailure(message, details = {}) {
  console.error('[verify-email]', message, details);
  try {
    await db().from('app_error_logs').insert({
      source: 'vercel-api',
      route: '/api/auth/verify-email',
      code: crypto.randomUUID(),
      message,
      details
    });
  } catch (e) {
    console.error('[verify-logger]', e?.message || e);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { error: 'Method not allowed.' });

  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const code = String(req.body?.code || '').trim();
    if (!email || !/^\d{6}$/.test(code)) return reply(res, 400, { error: 'Enter the 6-digit code from your email.' });

    const admin = db();
    const { data: challenge, error } = await admin
      .from('email_verification_challenges')
      .select('id,user_id,code_hash,expires_at,attempts,verified_at')
      .eq('email', email)
      .is('verified_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!challenge) return reply(res, 400, { error: 'That verification code is no longer available. Create the account again.' });
    if (new Date(challenge.expires_at).getTime() < Date.now()) return reply(res, 400, { error: 'That code has expired. Create the account again to receive a new one.' });
    if (challenge.attempts >= 6) return reply(res, 429, { error: 'Too many attempts. Please try again later.' });

    if (challenge.code_hash !== hashCode(code)) {
      await admin.from('email_verification_challenges').update({ attempts: challenge.attempts + 1 }).eq('id', challenge.id);
      return reply(res, 400, { error: 'That code is not correct.' });
    }

    const updated = await admin.auth.admin.updateUserById(challenge.user_id, { email_confirm: true });
    if (updated.error) throw updated.error;

    await Promise.all([
      admin.from('email_verification_challenges').update({ verified_at: new Date().toISOString() }).eq('id', challenge.id),
      admin.from('profiles').update({ email_verified_custom: true }).eq('id', challenge.user_id)
    ]);

    return reply(res, 200, { success: true });
  } catch (error) {
    const message = error?.message || 'Email verification failed.';
    await logFailure(message, { stage: 'verify' });
    return reply(res, 500, { error: 'We could not verify your email right now.' });
  }
}
