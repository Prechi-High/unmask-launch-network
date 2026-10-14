import crypto from 'node:crypto';

export default function handler(_req: any, res: any) {
  res.status(200).json({ ok: true, randomUUID: typeof crypto.randomUUID === 'function' });
}
