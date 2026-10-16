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

    const { data: note, error: noteError } = await db
      .from('ownership_notes')
      .select('id,verification_id,moderation_status')
      .eq('id',id)
      .maybeSingle();

    if(noteError) throw noteError;
    if(!note || note.moderation_status!=='published' || !note.verification_id){
      return res.status(404).end();
    }

    const { data: verification, error: verificationError } = await db
      .from('owner_verifications')
      .select('photo_path,status')
      .eq('id',note.verification_id)
      .maybeSingle();

    if(verificationError) throw verificationError;
    if(!verification || verification.status!=='verified' || !verification.photo_path){
      return res.status(404).end();
    }

    const { data: file, error: fileError } = await db.storage
      .from('verifications')
      .download(verification.photo_path);

    if(fileError || !file) return res.status(404).end();

    const buffer=Buffer.from(await file.arrayBuffer());
    res.setHeader('Content-Type',file.type||'image/jpeg');
    res.setHeader('Cache-Control','public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(buffer);
  }catch(error:any){
    console.error('[unmask-photo]',error?.message||error);
    return res.status(500).end();
  }
}
