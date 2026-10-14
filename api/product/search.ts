export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const q = String(req.query?.q || '').trim();
  const country = String(req.query?.country || 'ng').trim();
  if (q.length < 2) return res.status(200).json({ products: [] });

  try {
    const base = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !key) throw new Error('Server is missing product search configuration.');

    const response = await fetch(base + '/functions/v1/product-intelligence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: 'Bearer ' + key
      },
      body: JSON.stringify({ action: 'search', query: q, country })
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || 'Search failed.');

    const products = Array.isArray(body?.products)
      ? body.products.slice(0, 8).map((p) => ({
          id: p.id || '',
          name: p.name || '',
          brand: p.brand || '',
          category: p.category || '',
          image: p.image || p.heroImageUrl || null
        })).filter((p) => p.name)
      : [];

    return res.status(200).json({ products });
  } catch (error) {
    console.error('[product-search]', error?.message || error);
    return res.status(503).json({ error: 'Product suggestions are temporarily unavailable.' });
  }
}
