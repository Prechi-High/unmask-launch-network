import crypto from 'node:crypto';
import { admin, ensureAllowedEmail, hashCode, json, logError, makeCode, normalizeEmail, sendVerificationEmail } from '../../lib/server';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const fullName = String(req.body?.fullName || '').trim();
    const country = String(req.body?.country || '').trim();
    const region = String(req.body?.region || '').trim();

    if (!fullName) return json(res, 400, { error: 'Enter your full name.' });
    if (!email.includes('@')) return json(res, 400, { error: 'Enter a valid email address.' });
    if (password.length < 8) return json(res, 400, { error: 'Use at least 8 characters for your password.' });
    await ensureAllowedEmail(email);

    const db = admin();
    const created = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name: fullName }
    });

    if (created.error || !created.data.user) {
      const message = created.error?.message || '';
      if (/already|registered|exists/i.test(message)) {
        return json(res, 409, { error: 'An account already exists with this email. Log in instead.' });
      }
      throw created.error || new Error('Could not create account.');
    }

    const user = created.data.user;
    const { error: profileError } = await db.from('profiles').upsert({
      id: user.id,
      display_name: fullName,
      country: country || null,
      region: region || null,
      email_verified_custom: false
    }, { onConflict: 'id' });
    if (profileError) throw profileError;

    const code = makeCode();
    const { error: challengeError } = await db.from('email_verification_challenges').insert({
      user_id: user.id,
      email,
      code_hash: hashCode(code),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });
    if (challengeError) throw challengeError;

    await sendVerificationEmail(email, code);
    return json(res, 200, { success: true });
  } catch (error: any) {
    const message = error?.message || 'Could not create your account.';
    const errorId = crypto.randomUUID();
    await logError({
      source: 'vercel-api',
      route: '/api/auth/signup',
      code: errorId,
      message,
      details: {
        hasEmail: Boolean(req.body?.email),
        hasFullName: Boolean(req.body?.fullName),
        hasCountry: Boolean(req.body?.country),
        hasRegion: Boolean(req.body?.region)
      }
    });
    return json(res, 500, { error: message, errorId });
  }
}
