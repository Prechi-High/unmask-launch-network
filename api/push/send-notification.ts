import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

function admin() {
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error('Missing Supabase server configuration.');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

export default async function handler(req:any,res:any){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed.'});

  try{
    const notificationId=String(req.body?.notificationId||'').trim();
    if(!notificationId) return res.status(400).json({error:'notificationId required'});

    const db=admin();
    const {data:notification,error}=await db
      .from('notifications')
      .select('id,user_id,type,payload,sent_at')
      .eq('id',notificationId)
      .maybeSingle();

    if(error) throw error;
    if(!notification) return res.status(404).json({error:'Notification not found.'});
    if(notification.sent_at) return res.status(200).json({ok:true,alreadySent:true});

    const publicKey=process.env.VITE_VAPID_PUBLIC_KEY;
    const privateKey=process.env.VAPID_PRIVATE_KEY;
    const subject=process.env.VAPID_SUBJECT||'https://unmask-launch-network.vercel.app';

    if(!publicKey||!privateKey){
      await db.from('notifications').update({sent_at:new Date().toISOString()}).eq('id',notificationId);
      return res.status(200).json({ok:true,pushConfigured:false});
    }

    webpush.setVapidDetails(subject,publicKey,privateKey);

    const {data:subs, error:subError}=await db
      .from('push_subscriptions')
      .select('id,endpoint,p256dh,auth')
      .eq('user_id',notification.user_id)
      .eq('enabled',true);

    if(subError) throw subError;

    const payload=notification.payload||{};
    const body=JSON.stringify({
      title:payload.title||'Unmask',
      body:payload.body||'You have a new Unmask update.',
      url:payload.link||'/?view=dashboard',
      type:notification.type,
      notificationId:notification.id
    });

    let delivered=0;
    for(const sub of subs||[]){
      try{
        await webpush.sendNotification({
          endpoint:sub.endpoint,
          keys:{p256dh:sub.p256dh,auth:sub.auth}
        },body,{TTL:60*60*24});
        delivered++;
      }catch(err:any){
        const status=err?.statusCode||0;
        if(status===404||status===410){
          await db.from('push_subscriptions').delete().eq('id',sub.id);
        }else{
          console.error('[push-send]',status,err?.message||err);
        }
      }
    }

    await db.from('notifications').update({sent_at:new Date().toISOString()}).eq('id',notificationId);
    return res.status(200).json({ok:true,delivered});
  }catch(error:any){
    console.error('[push-notification]',error?.message||error);
    return res.status(500).json({error:'Push delivery failed.'});
  }
}
