import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
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

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code + (process.env.VERIFICATION_PEPPER || '')).digest('hex');
}

async function logFailure(message, details = {}) {
  const safe = { ...details };
  for (const key of ['password','token','code','secret','authorization']) {
    if (key in safe) safe[key] = '[redacted]';
  }
  console.error('[signup]', message, safe);
  try {
    await db().from('app_error_logs').insert({
      source: 'vercel-api',
      route: '/api/auth/signup',
      code: crypto.randomUUID(),
      message,
      details: safe
    });
  } catch (e) {
    console.error('[signup-logger]', e?.message || e);
  }
}

async function sendCode(email, code) {
  const from = process.env.AUTH_EMAIL_ADDRESS;
  const appPassword = String(process.env.AUTH_EMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  if (!from || !appPassword) throw new Error('Verification email is not configured.');
  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: from, pass: appPassword }
  });
  await transport.sendMail({
    from: 'Unmask <' + from + '>',
    to: email,
    subject: 'Your Unmask verification code',
    text: 'Your Unmask verification code is ' + code + '. It expires in 15 minutes.',
    html: '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px"><h2 style="color:#701A2E;margin:0 0 12px">Verify your Unmask email</h2><p>Use this code to finish creating your account:</p><div style="font-size:34px;font-weight:800;letter-spacing:8px;margin:24px 0">' + code + '</div><p style="color:#6B6B6B">This code expires in 15 minutes.</p></div>'
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { error: 'Method not allowed.' });

  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const fullName = String(req.body?.fullName || '').trim();
    const country = String(req.body?.country || '').trim();
    const region = String(req.body?.region || '').trim();

    if (!fullName) return reply(res, 400, { error: 'Enter your full name.' });
    if (!email.includes('@')) return reply(res, 400, { error: 'Enter a valid email address.' });
    if (password.length < 8) return reply(res, 400, { error: 'Use at least 8 characters for your password.' });

    const admin = db();
    const domain = email.split('@')[1] || '';
    const { data: allowed, error: domainError } = await admin.from('allowed_email_domains').select('domain').eq('domain', domain).eq('active', true).maybeSingle();
    if (domainError) throw domainError;
    if (!allowed) return reply(res, 400, { error: 'Please use a recognised email provider such as Gmail, Yahoo, Outlook, iCloud or Proton.' });

    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name: fullName }
    });

    if (created.error || !created.data.user) {
      const message = created.error?.message || 'Could not create account.';
      if (/already|registered|exists/i.test(message)) return reply(res, 409, { error: 'An account already exists with this email. Log in instead.' });
      throw created.error || new Error(message);
    }

    const user = created.data.user;
    const { error: profileError } = await admin.from('profiles').upsert({
      id: user.id,
      display_name: fullName,
      country: country || null,
      region: region || null,
      email_verified_custom: false
    }, { onConflict: 'id' });
    if (profileError) throw profileError;

    const code = String(crypto.randomInt(100000, 1000000));
    const { error: challengeError } = await admin.from('email_verification_challenges').insert({
      user_id: user.id,
      email,
      code_hash: hashCode(code),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });
    if (challengeError) throw challengeError;

    try {
      await sendCode(email, code);
    } catch (mailError) {
      await logFailure(mailError?.message || 'Verification email failed.', { stage: 'send_email', userId: user.id });
      return reply(res, 500, { error: 'Your account was created, but we could not send the verification email. Please try again shortly.' });
    }

    return reply(res, 200, { success: true });
  } catch (error) {
    const message = error?.message || 'Could not create your account.';
    await logFailure(message, { stage: 'signup' });
    return reply(res, 500, { error: message });
  }
}
