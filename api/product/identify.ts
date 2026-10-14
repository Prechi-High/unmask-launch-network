import { createClient } from '@supabase/supabase-js';
import * as crypto from 'node:crypto';

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server is missing product identification configuration.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function writeError(message, details = {}) {
  console.error('[product-identify]', message, details);
  try {
    await adminClient().from('app_error_logs').insert({
      source: 'vercel-api',
      route: '/api/product/identify',
      code: crypto.randomUUID(),
      message,
      details
    });
  } catch (e) {
    console.error('[product-identify-logger]', e?.message || e);
  }
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  try {
    const imageBase64 = String(req.body?.imageBase64 || '');
    const mimeType = String(req.body?.mimeType || 'image/jpeg');

    if (!imageBase64) return res.status(400).json({ error: 'Take a product photo first.' });
    if (imageBase64.length > 6_000_000) return res.status(413).json({ error: 'That photo is too large. Please take another photo.' });

    const base = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !key) throw new Error('Missing Supabase server configuration.');

    const visionResponse = await fetchWithTimeout(base + '/functions/v1/product-vision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: 'Bearer ' + key
      },
      body: JSON.stringify({ imageBase64, mimeType, format: 'json' })
    }, 52000);

    const visionBody = await visionResponse.json().catch(() => ({}));

    if (!visionResponse.ok) {
      const upstreamMessage = visionBody?.hint || visionBody?.message || visionBody?.error || 'Image recognition failed.';
      await writeError(upstreamMessage, {
        stage: 'product-vision',
        status: visionResponse.status,
        upstreamError: visionBody?.error || null
      });
      return res.status(503).json({
        error: upstreamMessage,
        code: visionBody?.error || 'vision_failed'
      });
    }

    const guess = {
      brand: visionBody?.brand || '',
      name: visionBody?.name || visionBody?.label || '',
      model: visionBody?.model || '',
      category: visionBody?.category || '',
      confidence: Number(visionBody?.confidence || 0)
    };

    const query = [guess.brand, guess.name, guess.model].filter(Boolean).join(' ').trim();
    let matches = [];

    if (query) {
      try {
        const searchResponse = await fetchWithTimeout(base + '/functions/v1/product-intelligence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: key,
            Authorization: 'Bearer ' + key
          },
          body: JSON.stringify({ action: 'search', query, country: 'ng' })
        }, 18000);

        const searchBody = await searchResponse.json().catch(() => ({}));

        if (searchResponse.ok && Array.isArray(searchBody?.products)) {
          matches = searchBody.products.slice(0, 5).map((p) => ({
            id: p.id || '',
            name: p.name || '',
            brand: p.brand || '',
            category: p.category || guess.category || '',
            image: p.image || p.heroImageUrl || null
          })).filter((p) => p.name);
        } else if (!searchResponse.ok) {
          await writeError(searchBody?.error || 'Product matching failed.', {
            stage: 'product-intelligence',
            status: searchResponse.status
          });
        }
      } catch (searchError) {
        await writeError(searchError?.message || 'Product matching timed out.', {
          stage: 'product-intelligence'
        });
      }
    }

    return res.status(200).json({ guess, matches });
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'Product recognition took too long. Please try the photo again.'
      : (error?.message || 'We could not recognise that product yet.');

    await writeError(message, { stage: 'identify-route' });

    return res.status(503).json({
      error: message,
      code: error?.name === 'AbortError' ? 'identify_timeout' : 'identify_failed'
    });
  }
}
