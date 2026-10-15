import { createClient } from '@supabase/supabase-js';

function db(){
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error('Missing Supabase server configuration.');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function h(v:any){
  return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
export default async function handler(req:any,res:any){
  if(req.method!=='GET') return res.status(405).end();

  try{
    const id=String(req.query?.id||'').trim();
    if(!id) return res.status(400).send('Missing share id');

    const {data:note,error}=await db()
      .from('ownership_notes')
      .select('id,author_name,product_name,body')
      .eq('id',id)
      .maybeSingle();

    if(error) throw error;
    if(!note) return res.status(404).send('Unmasking not found');

    const host=String(req.headers['x-forwarded-host']||req.headers.host||'unmask-launch-network.vercel.app');
    const proto=String(req.headers['x-forwarded-proto']||'https');
    const origin=proto+'://'+host;
    const image=origin+'/api/share-image?id='+encodeURIComponent(id);
    const target=origin+'/?post='+encodeURIComponent(id);
    const title=(note.author_name||'An Unmasker')+' unmasked '+(note.product_name||'a product');
    const description=String(note.body||'See what really happened with the product — shared by the Unmask community. Know before you buy.').slice(0,220);

    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, max-age=60, s-maxage=300');
    return res.status(200).send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${h(title)} • Unmask</title>
  <meta name="description" content="${h(description)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Unmask">
  <meta property="og:title" content="${h(title)}">
  <meta property="og:description" content="${h(description)}">
  <meta property="og:image" content="${h(image)}">
  <meta property="og:image:width" content="1080">
  <meta property="og:image:height" content="1350">
  <meta property="og:url" content="${h(origin+'/api/share?id='+encodeURIComponent(id))}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${h(title)}">
  <meta name="twitter:description" content="${h(description)}">
  <meta name="twitter:image" content="${h(image)}">
  <meta http-equiv="refresh" content="1;url=${h(target)}">
  <style>
    body{margin:0;min-height:100vh;background:#25060e;color:#fff;font-family:Arial,Helvetica,sans-serif;display:grid;place-items:center}
    main{max-width:420px;padding:28px;text-align:center}
    img{width:180px;max-width:70%;height:auto}
    h1{font-size:24px;line-height:1.25}
    p{color:#eadde1;line-height:1.5}
    a{display:inline-block;margin-top:10px;background:#fff;color:#701A2E;text-decoration:none;padding:11px 16px;border-radius:999px;font-weight:800}
  </style>
</head>
<body>
  <main>
    <img src="/resources/unmask-logo.png" alt="Unmask">
    <h1>${h(title)}</h1>
    <p>Opening the full unmasking…</p>
    <a href="${h(target)}">Open on Unmask</a>
  </main>
  <script>setTimeout(function(){location.replace(${JSON.stringify(target)})},350)</script>
</body>
</html>`);
  }catch(error:any){
    console.error('[share-page]',error?.message||error);
    return res.status(500).send('Could not open this Unmask share.');
  }
}
