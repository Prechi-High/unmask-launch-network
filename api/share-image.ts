import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

function db(){
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error('Missing Supabase server configuration.');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

function esc(v:any){
  return String(v??'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&apos;');
}

function wrap(text:string,max=31,lines=3){
  const words=String(text||'').trim().split(/\s+/);
  const out:string[]=[];
  let line='';
  for(const word of words){
    const next=line?line+' '+word:word;
    if(next.length>max && line){
      out.push(line);
      line=word;
      if(out.length>=lines-1) break;
    }else line=next;
  }
  if(line && out.length<lines) out.push(line);
  if(words.join(' ').length>out.join(' ').length && out.length) out[out.length-1]=out[out.length-1].replace(/[. ]*$/,'')+'…';
  return out;
}

function mimeFrom(ct:string|undefined){
  const c=(ct||'').split(';')[0].trim().toLowerCase();
  return c.startsWith('image/')?c:'image/png';
}

async function toDataUrl(src:string|undefined,base:string){
  if(!src) return '';
  if(src.startsWith('data:image/')) return src;
  try{
    const url=src.startsWith('http')?src:new URL(src,base).toString();
    const r=await fetch(url,{headers:{'User-Agent':'UnmaskShareCard/1.0'}});
    if(!r.ok) return '';
    const ab=await r.arrayBuffer();
    const ct=mimeFrom(r.headers.get('content-type')||undefined);
    return 'data:'+ct+';base64,'+Buffer.from(ab).toString('base64');
  }catch{return ''}
}

export default async function handler(req:any,res:any){
  if(req.method!=='GET') return res.status(405).end();

  try{
    const id=String(req.query?.id||'').trim();
    if(!id) return res.status(400).send('Missing share id');

    const {data:note,error}=await db()
      .from('ownership_notes')
      .select('id,author_name,product_name,product_image,brand,category,body,used_duration,created_at')
      .eq('id',id)
      .maybeSingle();

    if(error) throw error;
    if(!note) return res.status(404).send('Unmasking not found');

    const host=String(req.headers['x-forwarded-host']||req.headers.host||'unmask-launch-network.vercel.app');
    const proto=String(req.headers['x-forwarded-proto']||'https');
    const origin=proto+'://'+host;

    const [logo,product]=await Promise.all([
      toDataUrl('/resources/unmask-favicon.png',origin),
      toDataUrl(note.product_image||'',origin)
    ]);

    const author=note.author_name||'An Unmasker';
    const productName=note.product_name||'a product';
    const body=String(note.body||'See what really happened with the product — shared by the Unmask community.').trim();
    const titleLines=wrap(productName,30,3);
    const bodyLines=wrap(body,46,4);
    const hasProduct=Boolean(product);

    const titleTspans=titleLines.map((l,i)=>'<tspan x="78" dy="'+(i===0?0:58)+'">'+esc(l)+'</tspan>').join('');
    const bodyTspans=bodyLines.map((l,i)=>'<tspan x="82" dy="'+(i===0?0:38)+'">'+esc(l)+'</tspan>').join('');

    const productBlock=hasProduct
      ? '<rect x="520" y="355" width="480" height="520" rx="42" fill="#12070A" opacity=".20"/>'+
        '<image href="'+product+'" x="535" y="370" width="450" height="490" preserveAspectRatio="xMidYMid meet"/>'
      : '<rect x="560" y="392" width="360" height="360" rx="92" fill="#8F1028" opacity=".92"/>'+
        (logo?'<image href="'+logo+'" x="600" y="470" width="280" height="130" preserveAspectRatio="xMidYMid meet"/>':'')+
        '<text x="740" y="670" text-anchor="middle" font-size="30" fill="#F7D5DD" font-family="Arial,Helvetica,sans-serif">Know before you buy.</text>';

    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#27060E"/>
          <stop offset=".52" stop-color="#6A0B22"/>
          <stop offset="1" stop-color="#18050B"/>
        </linearGradient>
        <linearGradient id="glow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#EE8C7C" stop-opacity=".05"/>
          <stop offset=".55" stop-color="#FF6687" stop-opacity=".5"/>
          <stop offset="1" stop-color="#8F1028" stop-opacity=".1"/>
        </linearGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="16" stdDeviation="28" flood-color="#000" flood-opacity=".32"/></filter>
      </defs>

      <rect width="1080" height="1350" fill="url(#bg)"/>
      <circle cx="890" cy="120" r="310" fill="#C51B42" opacity=".17"/>
      <circle cx="110" cy="1190" r="420" fill="#B91237" opacity=".12"/>
      <path d="M-80 850 C220 700 370 720 560 560 C770 385 955 330 1160 410 L1160 660 C890 610 740 720 560 850 C360 998 150 1070 -80 1110 Z" fill="url(#glow)"/>

      <rect x="50" y="48" width="980" height="1254" rx="52" fill="none" stroke="#ED6F8B" stroke-opacity=".32" stroke-width="2"/>

      ${logo?'<image href="'+logo+'" x="72" y="72" width="118" height="118" preserveAspectRatio="xMidYMid meet"/>':''}
      <text x="216" y="135" font-size="66" font-family="Arial,Helvetica,sans-serif" fill="#FFFFFF" font-weight="800">Unmask</text>
      <text x="218" y="172" font-size="24" font-family="Arial,Helvetica,sans-serif" fill="#EADDE1">Know before you buy.</text>

      <text x="78" y="246" font-size="19" letter-spacing="6" font-family="Arial,Helvetica,sans-serif" fill="#F7B2C2" font-weight="700">SHARED FROM THE UNMASK COMMUNITY</text>
      <text x="78" y="304" font-size="31" font-family="Arial,Helvetica,sans-serif" fill="#FFFFFF" font-weight="700">${esc(author)} <tspan fill="#F18BA2">unmasked</tspan></text>

      <text x="78" y="405" font-size="52" font-family="Arial,Helvetica,sans-serif" fill="#FFFFFF" font-weight="800">
        ${titleTspans}
      </text>

      ${productBlock}

      <g transform="translate(0 910)">
        <rect x="60" y="0" width="960" height="285" rx="40" fill="#10080B" opacity=".82" stroke="#D74060" stroke-opacity=".45" filter="url(#shadow)"/>
        <circle cx="116" cy="70" r="34" fill="#9D1230"/>
        <text x="116" y="82" text-anchor="middle" font-size="34" fill="#fff" font-family="Georgia,serif">“</text>
        <text x="82" y="133" font-size="28" font-family="Arial,Helvetica,sans-serif" fill="#F5E7EB">
          ${bodyTspans}
        </text>
      </g>

      <g transform="translate(60 1220)">
        <rect x="0" y="0" width="960" height="74" rx="37" fill="#FFFFFF" opacity=".09" stroke="#FFFFFF" stroke-opacity=".16"/>
        <circle cx="43" cy="37" r="23" fill="#A50C2A"/>
        <text x="43" y="45" text-anchor="middle" font-size="22" fill="#fff" font-family="Arial,Helvetica,sans-serif">↗</text>
        <text x="84" y="45" font-size="24" fill="#FFFFFF" font-family="Arial,Helvetica,sans-serif">unmask-launch-network.vercel.app</text>
        <text x="894" y="46" font-size="25" fill="#FFFFFF" font-family="Arial,Helvetica,sans-serif">›</text>
      </g>
    </svg>`;

    const png=await sharp(Buffer.from(svg)).png({quality:92}).toBuffer();
    res.setHeader('Content-Type','image/png');
    res.setHeader('Cache-Control','public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Content-Disposition','inline; filename="unmask-'+String(note.id).slice(0,8)+'.png"');
    return res.status(200).send(png);
  }catch(error:any){
    console.error('[share-image]',error?.message||error);
    return res.status(500).send('Could not create share image');
  }
}
