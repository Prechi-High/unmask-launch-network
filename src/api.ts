export async function postJson(path: string, body: any) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Something went wrong.');
  return data;
}

export async function searchProducts(query: string, country = 'ng') {
  if (query.trim().length < 2) return [];
  const response = await fetch('/api/product/search?q=' + encodeURIComponent(query.trim()) + '&country=' + encodeURIComponent(country));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Could not search products.');
  return Array.isArray(data.products) ? data.products : [];
}

export async function identifyProduct(imageBase64: string, mimeType: string) {
  return postJson('/api/product/identify', { imageBase64, mimeType });
}
