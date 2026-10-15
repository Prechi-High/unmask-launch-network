import { supabase } from './supabase';

export async function isAdmin(){
  const { data, error } = await supabase.rpc('is_current_user_admin');
  if(error) throw error;
  return Boolean(data);
}

export async function getAdminOverview(){
  const { data, error } = await supabase.rpc('admin_get_overview');
  if(error) throw error;
  return data || {};
}

export async function getAdminSectionStats(){
  const { data, error } = await supabase.rpc('admin_get_section_stats');
  if(error) throw error;
  return data || {};
}

export async function getAdminSection(section:string,limit=150){
  const { data, error } = await supabase.rpc('admin_get_console_data',{p_section:section,p_limit:limit});
  if(error) throw error;
  return data || (section==='rewards'?{rules:[],ledger:[]} : []);
}

export async function updateRewardRule(key:string,coinAmount:number,active:boolean){
  const { error } = await supabase.rpc('admin_update_reward_rule',{p_key:key,p_coin_amount:coinAmount,p_active:active});
  if(error) throw error;
}

export async function updateBuildRound(phase:string,votingEndsAt:string|null,selectedCategoryId:string|null){
  const { error } = await supabase.rpc('admin_update_build_round',{
    p_phase:phase,
    p_voting_ends_at:votingEndsAt || null,
    p_selected_category_id:selectedCategoryId || null
  });
  if(error) throw error;
}

export async function updateCategory(id:string,status:string,buildStage:string,isSelectable:boolean){
  const { error } = await supabase.rpc('admin_update_category',{
    p_category_id:id,
    p_status:status,
    p_build_stage:buildStage,
    p_is_user_selectable:isSelectable
  });
  if(error) throw error;
}

export async function updateRequestStatus(id:string,status:string){
  const { error } = await supabase.rpc('admin_update_request_status',{p_id:id,p_status:status});
  if(error) throw error;
}

export async function updateExperienceStatus(id:string,status:string){
  const { error } = await supabase.rpc('admin_update_experience_status',{p_id:id,p_status:status});
  if(error) throw error;
}

export async function updateCollaborationStatus(id:string,status:string){
  const { error } = await supabase.rpc('admin_update_collaboration_status',{p_id:id,p_status:status});
  if(error) throw error;
}

export async function broadcastNotification(title:string,body:string,link='/?view=dashboard'){
  const { data, error } = await supabase.rpc('admin_broadcast_notification',{
    p_title:title,p_body:body,p_link:link
  });
  if(error) throw error;
  return Number(data||0);
}


export async function sendNotificationToUsers(userIds:string[],title:string,body:string,link='/?view=dashboard'){
  const { data, error } = await supabase.rpc('admin_send_notification_to_users',{
    p_user_ids:userIds,
    p_title:title,
    p_body:body,
    p_link:link
  });
  if(error) throw error;
  return Number(data||0);
}


export async function getAdminBuildCategories(){
  const { data, error } = await supabase.rpc('admin_get_build_categories');
  if(error) throw error;
  return Array.isArray(data)?data:[];
}

export async function setCategoryTestingUrl(categoryId:string,testingUrl:string){
  const { error } = await supabase.rpc('admin_set_category_testing_url',{
    p_category_id:categoryId,
    p_testing_url:testingUrl
  });
  if(error) throw error;
}

export async function startNewBuildRound(title:string,votingEndsAt:string){
  const { data, error } = await supabase.rpc('admin_start_new_build_round',{
    p_title:title,
    p_voting_ends_at:new Date(votingEndsAt).toISOString()
  });
  if(error) throw error;
  return data;
}
