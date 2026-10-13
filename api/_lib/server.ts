import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'node:crypto';

export function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server is missing Supabase configuration.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export async function ensureAllowedEmail(email: string) {
  const domain = email.split('@')[1] || '';
  if (!domain) throw new Error('Enter a valid email address.');
  const db = admin();
  const { data, error } = await db.from('allowed_email_domains').select('domain').eq('domain', domain).eq('active', true).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Please use a recognised email provider such as Gmail, Yahoo, Outlook, iCloud or Proton.');
}

export function makeCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashCode(code: string) {
  return crypto.createHash('sha256').update(code + (process.env.VERIFICATION_PEPPER || '')).digest('hex');
}

export async function sendVerificationEmail(to: string, code: string) {
  const from = process.env.AUTH_EMAIL_ADDRESS;
  const password = process.env.AUTH_EMAIL_APP_PASSWORD;
  if (!from || !password) throw new Error('Verification email is not configured.');
  const transport = nodemailer.createTransport({ service: 'gmail', auth: { user: from, pass: password } });
  await transport.sendMail({
    from: 'Unmask <' + from + '>',
    to,
    subject: 'Your Unmask verification code',
    text: 'Your Unmask verification code is ' + code + '. It expires in 15 minutes.',
    html: '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px"><h2 style="color:#701A2E;margin:0 0 12px">Verify your Unmask email</h2><p>Use this code to finish creating your account:</p><div style="font-size:34px;font-weight:800;letter-spacing:8px;margin:24px 0">' + code + '</div><p style="color:#6B6B6B">This code expires in 15 minutes.</p></div>'
  });
}

export function json(res: any, status: number, body: any) {
  res.status(status).json(body);
}
