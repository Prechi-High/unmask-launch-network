import crypto from 'node:crypto';
import { admin, hashCode, json, logError, normalizeEmail } from '../_lib/server';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || '').trim();
    if (!email || !/^\d{6}$/.test(code)) return json(res, 400, { error: 'Enter the 6-digit code from your email.' });

    const db = admin();
    const { data: challenge, error } = await db
      .from('email_verification_challenges')
      .select('id,user_id,code_hash,expires_at,attempts,verified_at')
      .eq('email', email)
      .is('verified_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!challenge) return json(res, 400, { error: 'That verification code is no longer available. Create the account again.' });
    if (new Date(challenge.expires_at).getTime() < Date.now()) return json(res, 400, { error: 'That code has expired. Create the account again to receive a new one.' });
    if (challenge.attempts >= 6) return json(res, 429, { error: 'Too many attempts. Please try again later.' });

    if (challenge.code_hash !== hashCode(code)) {
      await db.from('email_verification_challenges').update({ attempts: challenge.attempts + 1 }).eq('id', challenge.id);
      return json(res, 400, { error: 'That code is not correct.' });
    }

    const updated = await db.auth.admin.updateUserById(challenge.user_id, { email_confirm: true });
    if (updated.error) throw updated.error;

    await Promise.all([
      db.from('email_verification_challenges').update({ verified_at: new Date().toISOString() }).eq('id', challenge.id),
      db.from('profiles').update({ email_verified_custom: true }).eq('id', challenge.user_id)
    ]);

    return json(res, 200, { success: true });
  } catch (error: any) {
    const errorId = crypto.randomUUID();
    await logError({
      source: 'vercel-api',
      route: '/api/auth/verify-email',
      code: errorId,
      message: error?.message || 'Email verification failed.',
      details: { hasEmail: Boolean(req.body?.email) }
    });
    return json(res, 500, { error: 'We could not verify your email right now.', errorId });
  }
}
