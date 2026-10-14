import { json } from './_lib/server';

export default function handler(_req: any, res: any) {
  return json(res, 200, { ok: true, serverModule: true });
}
