import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import * as crypto from 'node:crypto';

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server is missing Supabase configuration.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function send(res, status, body) {
  return res.status(status).json(body);
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code + (process.env.VERIFICATION_PEPPER || '')).digest('hex');
}

async function writeError(message, details = {}) {
  console.error('[signup]', message, details);
  try {
    await adminClient().from('app_error_logs').insert({
      source: 'vercel-api',
      route: '/api/auth/signup',
      code: crypto.randomUUID(),
      message,
      details
    });
  } catch (e) {
    console.error('[signup-logger]', e?.message || e);
  }
}

async function sendVerificationEmail(email, code) {
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
    subject: 'Verify your email • Unmask',
    text: 'Welcome to Unmask. Your verification code is ' + code + '. It expires in 15 minutes. If you did not create an Unmask account, you can ignore this email.',
    html: `<!doctype html>
<html>
  <body style="margin:0;background:#f6f1ee;font-family:Arial,Helvetica,sans-serif;color:#231b1e;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Unmask verification code is ${code}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1ee;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #eadfd9;">
            <tr>
              <td style="background:#701A2E;padding:24px 28px;">
                <img src="https://unmask-launch-network.vercel.app/resources/unmask-logo.png" alt="Unmask" width="180" style="display:block;max-width:180px;height:auto;">
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 10px;">
                <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#9b6f79;font-weight:700;">Know before you buy.</div>
                <h1 style="margin:10px 0 12px;font-size:30px;line-height:1.18;color:#261a1e;">Verify your email</h1>
                <p style="margin:0;font-size:15px;line-height:1.7;color:#665b5f;">Welcome to Unmask. Use the code below to confirm your email and finish becoming an Unmasker.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 28px 10px;">
                <div style="display:inline-block;background:#fbf3f5;border:1px solid #ead6dc;border-radius:16px;padding:18px 26px;">
                  <div style="font-size:11px;color:#8b737b;text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin-bottom:8px;">Verification code</div>
                  <div style="font-size:36px;line-height:1;letter-spacing:.18em;font-weight:800;color:#701A2E;">${code}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 26px;">
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#756b6e;">This code expires in <strong>15 minutes</strong>.</p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#756b6e;">If you didn’t create an Unmask account, you can safely ignore this email.</p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #eee5e1;padding:18px 28px 24px;font-size:11px;line-height:1.6;color:#9a8f92;">
                Unmask — Know before you buy.<br>
                Real experiences. Clearer decisions.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });

  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const fullName = String(req.body?.fullName || '').trim();
    const country = String(req.body?.country || '').trim();
    const region = String(req.body?.region || '').trim();

    if (!fullName) return send(res, 400, { error: 'Enter your full name.' });
    if (!email.includes('@')) return send(res, 400, { error: 'Enter a valid email address.' });
    if (password.length < 8) return send(res, 400, { error: 'Use at least 8 characters for your password.' });

    const admin = adminClient();
    const domain = email.split('@')[1] || '';
    const allowedResult = await admin.from('allowed_email_domains').select('domain').eq('domain', domain).eq('active', true).maybeSingle();
    if (allowedResult.error) throw allowedResult.error;
    if (!allowedResult.data) return send(res, 400, { error: 'Please use a recognised email provider such as Gmail, Yahoo, Outlook, iCloud or Proton.' });

    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name: fullName }
    });

    if (created.error || !created.data.user) {
      const message = created.error?.message || 'Could not create account.';
      if (/already|registered|exists/i.test(message)) {
        return send(res, 409, { error: 'An account already exists with this email. Log in instead.' });
      }
      throw created.error || new Error(message);
    }

    const user = created.data.user;
    const profile = await admin.from('profiles').upsert({
      id: user.id,
      display_name: fullName,
      country: country || null,
      region: region || null,
      email_verified_custom: false
    }, { onConflict: 'id' });
    if (profile.error) throw profile.error;

    const code = String(crypto.randomInt(100000, 1000000));
    const challenge = await admin.from('email_verification_challenges').insert({
      user_id: user.id,
      email,
      code_hash: hashCode(code),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });
    if (challenge.error) throw challenge.error;

    try {
      await sendVerificationEmail(email, code);
    } catch (mailError) {
      await writeError(mailError?.message || 'Verification email failed.', { stage: 'send_email', userId: user.id });
      return send(res, 500, { error: 'Your account was created, but we could not send the verification email. Please try again shortly.' });
    }

    return send(res, 200, { success: true });
  } catch (error) {
    const message = error?.message || 'Could not create your account.';
    await writeError(message, { stage: 'signup' });
    return send(res, 500, { error: message });
  }
}
