import { json } from '../_lib/server';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });
  const q = String(req.query?.q || '').trim();
  const country = String(req.query?.country || 'ng').trim();
  if (q.length < 2) return json(res, 200, { products: [] });
  try {
    const url = process.env.SUPABASE_URL + '/functions/v1/product-intelligence';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: 'Bearer ' + key },
      body: JSON.stringify({ action: 'search', query: q, country })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || 'Search failed.');
    const products = Array.isArray(body?.products) ? body.products.slice(0, 8).map((p: any) => ({
      id: p.id || '',
      name: p.name || '',
      brand: p.brand || '',
      category: p.category || '',
      image: p.image || p.heroImageUrl || null
    })).filter((p: any) => p.name) : [];
    return json(res, 200, { products });
  } catch (error: any) {
    console.error('[product-search]', error?.message || error);
    return json(res, 503, { error: 'Product suggestions are temporarily unavailable.' });
  }
}
