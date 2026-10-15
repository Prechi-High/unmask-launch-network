import { createClient } from '@supabase/supabase-js';

function admin(){
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error('Missing Supabase server configuration.');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

export default async function handler(req:any,res:any){
  if(req.method!=='GET') return res.status(405).end();
  try{
    const id=String(req.query?.id||'').trim();
    if(!id) return res.status(400).end();

    const db=admin();
    const {data:note,error}=await db
      .from('ownership_notes')
      .select('id,product_id,product_image')
      .eq('id',id)
      .maybeSingle();

    if(error) throw error;
    if(!note) return res.status(404).end();

    let source=note.product_image||'';
    if(!source && note.product_id){
      const {data:product}=await db
        .from('products')
        .select('hero_image_url')
        .eq('id',note.product_id)
        .maybeSingle();
      source=product?.hero_image_url||'';
    }

    if(!source) return res.status(404).end();

    const upstream=await fetch(source,{headers:{'User-Agent':'UnmaskShare/1.0'}});
    if(!upstream.ok) return res.status(404).end();

    const type=upstream.headers.get('content-type')||'image/jpeg';
    const buffer=Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type',type);
    res.setHeader('Cache-Control','public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(buffer);
  }catch(error:any){
    console.error('[share-product-image]',error?.message||error);
    return res.status(500).end();
  }
}
