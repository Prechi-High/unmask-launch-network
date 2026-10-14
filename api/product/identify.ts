import { json } from '../../lib/server';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  try {
    const imageBase64 = String(req.body?.imageBase64 || '');
    const mimeType = String(req.body?.mimeType || 'image/jpeg');
    if (!imageBase64) return json(res, 400, { error: 'Take a product photo first.' });

    const url = process.env.SUPABASE_URL + '/functions/v1/product-vision';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: 'Bearer ' + key },
      body: JSON.stringify({ imageBase64, mimeType, format: 'json' })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || 'Identification failed.');

    const guess = {
      brand: body?.brand || '',
      name: body?.name || body?.label || '',
      model: body?.model || '',
      category: body?.category || '',
      confidence: Number(body?.confidence || 0)
    };
    const query = [guess.brand, guess.name, guess.model].filter(Boolean).join(' ').trim();
    let matches: any[] = [];
    if (query) {
      const searchResponse = await fetch(process.env.SUPABASE_URL + '/functions/v1/product-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: key, Authorization: 'Bearer ' + key },
        body: JSON.stringify({ action: 'search', query, country: 'ng' })
      });
      const searchBody = await searchResponse.json().catch(() => ({}));
      if (searchResponse.ok && Array.isArray(searchBody?.products)) {
        matches = searchBody.products.slice(0, 5).map((p: any) => ({
          id: p.id || '',
          name: p.name || '',
          brand: p.brand || '',
          category: p.category || guess.category || '',
          image: p.image || p.heroImageUrl || null
        })).filter((p: any) => p.name);
      }
    }
    return json(res, 200, { guess, matches });
  } catch (error: any) {
    console.error('[product-identify]', error?.message || error);
    return json(res, 503, { error: 'We could not recognise that product yet. You can still enter its name yourself.' });
  }
}
