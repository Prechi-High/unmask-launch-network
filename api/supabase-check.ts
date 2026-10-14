import { createClient } from '@supabase/supabase-js';

export default function handler(_req: any, res: any) {
  res.status(200).json({ ok: true, createClient: typeof createClient === 'function' });
}
