import { supabase } from './supabase';

export async function getPulse() {
  const { data, error } = await supabase.rpc('get_launch_pulse');
  if (error) throw error;
  return data || { unmaskers: 0, categories: [], products: [], experiences: [] };
}

export async function getLaunchTrends() {
  const { data, error } = await supabase.rpc('get_launch_trends');
  if (error) throw error;
  return data || { categories: [], products: [], total_votes: 0, total_suggestions: 0 };
}

export async function getSummary() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const uid = auth.user.id;
  const [profileRes, countsRes, voteRes, tasksRes] = await Promise.all([
    supabase.from('profiles').select('display_name,referral_code,created_at,country,region,category_interests,email_verified_custom').eq('id', uid).maybeSingle(),
    supabase.rpc('get_my_launch_counts'),
    supabase.from('launch_category_votes').select('category_id,categories(name)').eq('user_id', uid).maybeSingle(),
    supabase.rpc('get_my_launch_tasks')
  ]);
  const voteRow = voteRes.data as any;
  const nested = Array.isArray(voteRow?.categories) ? voteRow.categories[0] : voteRow?.categories;
  return {
    userId: uid,
    email: auth.user.email || '',
    displayName: profileRes.data?.display_name || auth.user.email?.split('@')[0] || 'Unmasker',
    referralCode: profileRes.data?.referral_code || null,
    voteName: nested?.name || profileRes.data?.category_interests?.[0] || null,
    counts: countsRes.data || {},
    coins: Number(countsRes.data?.coins || 0),
    tasks: tasksRes.data || []
  };
}

export async function listCategories() {
  const { data, error } = await supabase.from('categories').select('id,name,slug').eq('is_user_selectable', true).order('name');
  if (error) throw error;
  return data || [];
}

export async function chooseCategory(categoryId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Please log in first.');
  await supabase.from('launch_category_votes').delete().eq('user_id', auth.user.id);
  const { error } = await supabase.from('launch_category_votes').insert({ user_id: auth.user.id, category_id: categoryId });
  if (error) throw error;
  await supabase.rpc('claim_launch_task', { p_task_key: 'choose_category' });
  await supabase.rpc('qualify_my_launch_referral');
}

export async function claimTask(key: string) {
  const { data, error } = await supabase.rpc('claim_launch_task', { p_task_key: key });
  if (error) throw error;
  return data;
}

export async function suggestProduct(input: any) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Please log in first.');
  const { error } = await supabase.from('product_suggestions').insert({
    user_id: auth.user.id,
    product_name: input.productName.trim(),
    brand: input.brand?.trim() || null,
    category_label: input.category?.trim() || null,
    product_url: input.productUrl?.trim() || null,
    notes: input.notes?.trim() || null
  });
  if (error) throw error;
  await supabase.rpc('qualify_my_launch_referral');
}

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
}

export async function verifyOwnership(input: any) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Please log in first.');
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const productId = input.productId || slugify([input.brand, input.productName].filter(Boolean).join(' '));
  const response = await fetch(url + '/functions/v1/product-vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, apikey: key },
    body: JSON.stringify({
      action: 'verify_owner',
      source: 'camera',
      imageBase64: input.imageBase64,
      mimeType: input.mimeType,
      product: {
        id: productId,
        name: input.productName,
        brand: input.brand || '',
        category: input.category || '',
        image: input.image || null
      }
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.error) throw new Error(body?.hint || body?.reason || 'We could not verify this photo.');
  return { ...body, productId };
}

export async function submitExperience(input: any) {
  const productId = input.productId || slugify([input.brand, input.productName].filter(Boolean).join(' '));
  const { data, error } = await supabase.rpc('submit_launch_experience_v2', {
    p_product_id: productId,
    p_product_name: input.productName,
    p_brand: input.brand || '',
    p_category: input.category || '',
    p_ownership_status: input.ownershipStatus,
    p_used_duration: input.usedDuration,
    p_usage_frequency: input.usageFrequency,
    p_used_for: input.usedFor,
    p_acquisition_method: input.acquisitionMethod,
    p_body: input.body,
    p_would_rebuy: input.wouldRebuy
  });
  if (error) throw error;
  await supabase.rpc('qualify_my_launch_referral');
  return data;
}

export async function rewardRules() {
  const { data, error } = await supabase.from('reward_rules').select('key,coin_amount,description').eq('active', true).order('coin_amount', { ascending: false });
  if (error) throw error;
  return data || [];
}


export async function getCommunityFeed(limit = 30) {
  const { data, error } = await supabase.rpc('get_unmask_community_feed', { p_limit: limit });
  if (error) throw error;
  return data || [];
}

export async function getCommunityStats() {
  const { data, error } = await supabase.rpc('get_unmask_community_stats');
  if (error) throw error;
  return data || { unmasked_today: 0, unmasked_total: 0, unmaskers_total: 0, active_unmaskers_today: 0, category_votes: 0 };
}

export async function getMyUnmaskerMission() {
  const { data, error } = await supabase.rpc('get_my_unmasker_mission');
  if (error) throw error;
  return data || { products_unmasked: 0, mission_target: 3, category_voted: false, social_followed: 0 };
}

export async function toggleUnmaskLike(noteId: string) {
  const { data, error } = await supabase.rpc('toggle_unmask_like', { p_note_id: noteId });
  if (error) throw error;
  return data;
}
