import nodemailer from 'nodemailer';

export default async function handler(_req, res) {
  const from = process.env.AUTH_EMAIL_ADDRESS;
  const appPassword = String(process.env.AUTH_EMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

  if (!from || !appPassword) {
    return res.status(503).json({ ok: false, error: 'Email credentials are missing.' });
  }

  try {
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: from, pass: appPassword }
    });
    await transport.verify();
    return res.status(200).json({ ok: true, gmail: true });
  } catch (error) {
    console.error('[mail-auth-check]', error?.message || error);
    return res.status(503).json({
      ok: false,
      gmail: false,
      error: error?.code || error?.responseCode || error?.message || 'Gmail authentication failed.'
    });
  }
}
