import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import {
  broadcastNotification,
  getAdminOverview,
  getAdminSection,
  getAdminSectionStats,
  isAdmin,
  updateBuildRound,
  updateCategory,
  updateCollaborationStatus,
  updateExperienceStatus,
  deleteExperience,
  updateRequestStatus,
  updateRewardRule,
  sendNotificationToUsers,
  getAdminBuildCategories,
  setCategoryTestingUrl,
  startNewBuildRound,
  getAdminMissionDashboard,
  saveMission,
  getAdminTesterProgram,
  saveAdminTesterProgram
} from './adminData';
import './admin.css';

const FA=({name,className=''}:{name:string,className?:string})=><i className={'fa-solid fa-'+name+' '+className} aria-hidden="true"/>;
const Brand=()=> <img className="admin-brand" src="/resources/unmask-logo.png" alt="Unmask"/>;

const NAV=[
  ['overview','Overview','house'],
  ['requests','Product Requests','magnifying-glass'],
  ['experiences','Uploads / Experiences','file-lines'],
  ['categories','Categories','grip'],
  ['products','Products','tag'],
  ['collaborations','Collaborations','gift'],
  ['rewards','Rewards','coins'],
  ['users','Users','users'],
  ['trends','Trends','chart-column'],
  ['missions','Missions','bullseye'],
  ['settings','Settings','gear']
];

function fmtDate(v:any){
  if(!v)return '—';
  try{return new Date(v).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});}catch{return String(v)}
}
function statusClass(v:any){return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')}
function Stat({icon,label,value,sub}:{icon:string,label:string,value:any,sub?:string}){
  return <article className="admin-stat"><span><FA name={icon}/></span><div><small>{label}</small><strong>{value??0}</strong>{sub&&<em>{sub}</em>}</div></article>
}
function Pill({children}:{children:any}){return <span className={'admin-pill '+statusClass(children)}>{children||'—'}</span>}

export default function AdminConsole({go}:{go:(view:string)=>void}){
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [section,setSection]=useState('overview');
  const [overview,setOverview]=useState<any>({});
  const [sectionStats,setSectionStats]=useState<any>({});
  const [rows,setRows]=useState<any>([]);
  const [selected,setSelected]=useState<any>(null);
  const [search,setSearch]=useState('');
  const [busy,setBusy]=useState('');
  const [notice,setNotice]=useState('');
  const [adminName,setAdminName]=useState('Admin');

  const loadOverview=async()=>{
    const [ov,st]=await Promise.all([getAdminOverview(),getAdminSectionStats()]);
    setOverview(ov);
    setSectionStats(st);
  };
  const loadSection=async(next=section)=>{
    setSelected(null);
    if(next==='overview'||next==='settings'||next==='trends'||next==='missions'){
      setRows([]);
      return;
    }

    // Rewards returns an object; all other data screens return arrays.
    setRows(next==='rewards'?{rules:[],ledger:[]}:[]);
    const data=await getAdminSection(next);

    if(next==='rewards'){
      const safe={
        rules:Array.isArray(data?.rules)?data.rules:[],
        ledger:Array.isArray(data?.ledger)?data.ledger:[]
      };
      setRows(safe);
      setSelected(safe.ledger[0]||safe.rules[0]||null);
      return;
    }

    const safe=Array.isArray(data)?data:[];
    setRows(safe);
    setSelected(safe[0]||null);
  };
  const refresh=async(next=section)=>{
    setBusy('load');
    try{await loadOverview();await loadSection(next)}
    catch(e:any){setNotice(e.message||'Could not load admin data.')}
    finally{setBusy('')}
  };

  useEffect(()=>{
    Promise.all([isAdmin(),supabase.auth.getUser()]).then(async([ok,userRes])=>{
      setAllowed(ok);
      setAdminName(userRes.data.user?.email?.split('@')[0]||'Admin');
      if(ok) await refresh('overview');
    }).catch(()=>setAllowed(false));
  },[]);

  useEffect(()=>{if(allowed) refresh(section)},[section,allowed]);

  const filtered=useMemo(()=>{
    if(section==='rewards') return rows;
    if(!Array.isArray(rows)) return [];
    const q=search.trim().toLowerCase();
    if(!q)return rows;
    return rows.filter((r:any)=>JSON.stringify(r).toLowerCase().includes(q));
  },[rows,search,section]);

  if(allowed===null)return <div className="admin-guard"><Brand/><span>Opening admin…</span></div>;
  if(!allowed)return <div className="admin-guard"><Brand/><h2>Admin access required</h2><p>This area is only available to authorised Unmask administrators.</p><button onClick={()=>go('dashboard')}>Return to Unmask</button></div>;

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <Brand/>
      <nav>{NAV.map(([key,label,icon])=><button key={key} className={section===key?'active':''} onClick={()=>{setSection(key);setSelected(null)}}><FA name={icon}/><span>{label}</span></button>)}</nav>
      <button className="admin-exit" onClick={()=>go('dashboard')}><FA name="arrow-left"/> Back to community</button>
    </aside>

    <section className="admin-main">
      <header className="admin-topbar">
        <div className="admin-title"><h1>{NAV.find(x=>x[0]===section)?.[1]}</h1><p>{section==='overview'?'Monitor. Moderate. Empower a more informed world.':'Manage live Unmask community data and platform configuration.'}</p></div>
        <div className="admin-search"><FA name="magnifying-glass"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products, users, requests, or anything…"/></div>
        <button className="admin-return-user" onClick={()=>go('dashboard')} title="Return to your Unmask dashboard"><FA name="arrow-left"/><span>Return to Unmask</span></button>
        <button className="admin-bell" title={(overview.requests_pending||0)+(overview.experiences_pending||0)+(overview.collaborations_pending||0)+' items need attention'}><FA name="bell"/>{((overview.requests_pending||0)+(overview.experiences_pending||0)+(overview.collaborations_pending||0))>0&&<i/>}</button>
        <div className="admin-user"><span>{adminName[0]?.toUpperCase()}</span><div><b>{adminName}</b><small>Administrator</small></div></div>
      </header>

      {notice&&<div className="admin-notice">{notice}<button onClick={()=>setNotice('')}><FA name="xmark"/></button></div>}
      {busy==='load'&&<div className="admin-loading">Refreshing live data…</div>}

      <div className="admin-content">
        {section==='overview'&&<OverviewPage data={overview} onOpen={setSection}/>}
        {section==='requests'&&<RequestsPage rows={filtered} stats={sectionStats.requests||{}} selected={selected} setSelected={setSelected} onChanged={()=>refresh('requests')}/>}
        {section==='experiences'&&<ExperiencesPage rows={filtered} stats={sectionStats.experiences||{}} selected={selected} setSelected={setSelected} onChanged={()=>refresh('experiences')}/>}
        {section==='categories'&&<CategoriesPage rows={filtered} stats={sectionStats.categories||{}} selected={selected} setSelected={setSelected} onChanged={()=>refresh('categories')}/>}
        {section==='products'&&<ProductsPage rows={filtered} stats={sectionStats.products||{}} selected={selected} setSelected={setSelected}/>}
        {section==='collaborations'&&<CollaborationsPage rows={filtered} stats={sectionStats.collaborations||{}} selected={selected} setSelected={setSelected} onChanged={()=>refresh('collaborations')}/>}
        {section==='rewards'&&<RewardsPage data={rows} stats={sectionStats.rewards||{}} selected={selected} setSelected={setSelected} onChanged={()=>refresh('rewards')}/>}
        {section==='users'&&<UsersPage rows={filtered} stats={sectionStats.users||{}} selected={selected} setSelected={setSelected}/>}
        {section==='trends'&&<TrendsPage overview={overview}/>}
        {section==='missions'&&<MissionsPage setNotice={setNotice}/>}
        {section==='settings'&&<SettingsPage overview={overview} onSaved={()=>refresh('overview')} setNotice={setNotice}/>}
      </div>
    </section>
  </main>;
}

function OverviewPage({data,onOpen}:{data:any,onOpen:(x:string)=>void}){
  return <>
    <div className="admin-stats five">
      <Stat icon="file-lines" label="Total Unmask Requests" value={data.requests_total}/>
      <Stat icon="cloud-arrow-up" label="Product Experiences" value={data.experiences_total}/>
      <Stat icon="users" label="Active Unmaskers" value={data.active_unmaskers_30d}/>
      <Stat icon="handshake" label="Collaborations" value={data.collaborations_total}/>
      <Stat icon="coins" label="Coins Issued" value={data.coins_issued}/>
    </div>

    <div className="admin-grid two">
      <section className="admin-card">
        <CardHead icon="bullseye" title="Category Pulse" sub="Categories the community wants Unmask to build first." action={()=>onOpen('categories')}/>
        <div className="pulse-list">{(data.top_categories||[]).map((c:any,i:number)=><div key={c.id}><span>{i+1}</span><b>{c.name}</b><div><i style={{width:Math.min(100,(Number(c.votes||0)/(Math.max(1,...(data.top_categories||[]).map((x:any)=>Number(x.votes||0)))))*100)+'%'}}/></div><strong>{c.votes||0}</strong></div>)}</div>
      </section>
      <section className="admin-card">
        <CardHead icon="fire" title="Recent Product Requests" sub="What Unmaskers want investigated." action={()=>onOpen('requests')}/>
        <div className="mini-table">{(data.recent_requests||[]).map((r:any)=><button key={r.id} onClick={()=>onOpen('requests')}><div><b>{r.product_name}</b><small>{r.brand||r.category_label||'Uncategorised'}</small></div><Pill>{r.status||'new'}</Pill></button>)}</div>
      </section>
    </div>

    <div className="admin-grid overview-lower">
      <section className="admin-card">
        <CardHead icon="file-lines" title="Recent Uploads / Experiences" sub="Latest community unmaskings awaiting moderation." action={()=>onOpen('experiences')}/>
        <div className="mini-table">{(data.recent_experiences||[]).map((r:any)=><button key={r.id} onClick={()=>onOpen('experiences')}><div><b>{r.product_name}</b><small>{r.author_name} · {r.category||'Uncategorised'}</small></div><Pill>{r.moderation_status}</Pill></button>)}</div>
      </section>
      <section className="admin-card build-snapshot">
        <CardHead icon="hammer" title="Current Build Round" sub="What the Unmask movement is moving toward."/>
        <strong>{String(data.build_round?.phase||'voting').toUpperCase()}</strong>
        <span>Voting closes {fmtDate(data.build_round?.voting_ends_at)}</span>
        <button onClick={()=>onOpen('settings')}>Manage build <FA name="arrow-right"/></button>
      </section>
    </div>
  </>;
}

function CardHead({icon,title,sub,action}:{icon:string,title:string,sub?:string,action?:()=>void}){
  return <div className="admin-card-head"><span><FA name={icon}/></span><div><h3>{title}</h3>{sub&&<p>{sub}</p>}</div>{action&&<button onClick={action}>View all <FA name="arrow-right"/></button>}</div>
}

function TableLayout({children,detail}:{children:any,detail?:any}){
  return <div className="admin-table-layout"><section className="admin-card admin-table-card">{children}</section>{detail&&<aside className="admin-card admin-detail">{detail}</aside>}</div>
}

function RequestsPage({rows,stats,selected,setSelected,onChanged}:any){
  const change=async(id:string,status:string)=>{await updateRequestStatus(id,status);onChanged()};
  return <>
    <div className="admin-stats four">
      <Stat icon="file-lines" label="Total Requests" value={stats.total||0}/>
      <Stat icon="clock" label="New / Pending" value={stats.new_pending||0}/>
      <Stat icon="flask" label="In Research" value={stats.research||0}/>
      <Stat icon="users" label="Assigned / Scheduled" value={stats.assigned_scheduled||0}/>
    </div>
    <TableLayout detail={selected&&<><DetailTitle icon="file-lines" title="Request Detail"/><h3>{selected.product_name}</h3><p>{selected.brand||'No brand'} · {selected.category_label||'Uncategorised'}</p><Info label="Requested by" value={selected.requester_name||'Unmasker'}/><Info label="Status" value={selected.status}/><Info label="Submitted" value={fmtDate(selected.created_at)}/><h4>What they want to know</h4><p>{selected.notes||'No extra note was provided.'}</p><div className="detail-actions"><button onClick={()=>change(selected.id,'researching')}>Start research</button><button onClick={()=>change(selected.id,'scheduled')}>Mark scheduled</button><button onClick={()=>change(selected.id,'completed')}>Complete</button></div></>}>
      <CardHead icon="file-lines" title="All Product Requests" sub="Review and manage product requests from the Unmask community."/>
      <AdminTable headers={['Product','Category','Requested by','Reason / What they want to know','Status','Submitted']}>
        {rows.map((r:any)=><tr key={r.id} onClick={()=>setSelected(r)}><td><b>{r.product_name}</b><small>{r.brand}</small></td><td>{r.category_label||'—'}</td><td>{r.requester_name||'Unmasker'}</td><td className="clamp">{r.notes||'—'}</td><td><Pill>{r.status}</Pill></td><td>{fmtDate(r.created_at)}</td></tr>)}
      </AdminTable>
    </TableLayout>
  </>;
}

function ExperiencesPage({rows,stats,selected,setSelected,onChanged}:any){
  const change=async(id:string,status:string)=>{await updateExperienceStatus(id,status);onChanged()};
  const remove=async()=>{
    if(!selected)return;
    const ok=window.confirm('Delete this experience permanently? This cannot be undone.');
    if(!ok)return;
    await deleteExperience(selected.id);
    setSelected(null);
    onChanged();
  };
  return <>
    <div className="admin-stats four"><Stat icon="cloud-arrow-up" label="Total Experiences" value={stats.total||0}/><Stat icon="clock" label="Needs Review" value={stats.needs_review||0}/><Stat icon="circle-check" label="Published" value={stats.published||0}/><Stat icon="flag" label="Flagged" value={stats.flagged||0}/></div>
    <TableLayout detail={selected&&<><DetailTitle icon="file-lines" title="Experience Detail"/><h3>{selected.product_name}</h3><p>{selected.brand||''} {selected.category?'· '+selected.category:''}</p><Info label="Submitted by" value={selected.author_name}/><Info label="Ownership" value={selected.ownership_status}/><Info label="Duration" value={selected.used_duration}/><Info label="Status" value={selected.moderation_status}/><h4>User's experience</h4><p>{selected.body}</p><div className="detail-actions"><button onClick={()=>change(selected.id,'published')}>Approve & publish</button><button onClick={()=>change(selected.id,'review')}>Move to review</button><button onClick={()=>change(selected.id,'flagged')}>Flag</button><button onClick={()=>change(selected.id,'rejected')}>Reject</button></div><button className="detail-delete-btn" onClick={remove}><FA name="trash"/> Delete experience</button></>}>
      <CardHead icon="file-lines" title="All Uploads & Experiences" sub="Review, moderate, and organise user-submitted product experiences."/>
      <AdminTable headers={['Product','User','Category','Experience Summary','Ownership','Status','Submitted']}>{rows.map((r:any)=><tr key={r.id} onClick={()=>setSelected(r)}><td><b>{r.product_name}</b><small>{r.brand}</small></td><td>{r.author_name}</td><td>{r.category||'—'}</td><td className="clamp">{r.body}</td><td>{r.ownership_status}</td><td><Pill>{r.moderation_status}</Pill></td><td>{fmtDate(r.created_at)}</td></tr>)}</AdminTable>
    </TableLayout>
  </>;
}

function CategoriesPage({rows,stats,selected,setSelected,onChanged}:any){
  const save=async(row:any,patch:any)=>{await updateCategory(row.id,patch.status??row.status,patch.build_stage??row.build_stage,patch.is_user_selectable??row.is_user_selectable);onChanged()};
  return <>
    <div className="admin-stats four"><Stat icon="folder" label="Total Categories" value={stats.total||0}/><Stat icon="wave-square" label="Open for Voting" value={stats.voting||0}/><Stat icon="star" label="Building / Testing" value={stats.building_testing||0}/><Stat icon="circle-check" label="Live" value={stats.live||0}/></div>
    <TableLayout detail={selected&&<><DetailTitle icon="folder" title="Category Detail"/><h3>{selected.name}</h3><Info label="Votes" value={selected.votes}/><Info label="Status" value={selected.status}/><Info label="Build stage" value={selected.build_stage}/><Info label="Open for voting" value={selected.is_user_selectable?'Yes':'No'}/><h4>Manage category</h4><select value={selected.build_stage||'voting'} onChange={async e=>{await save(selected,{build_stage:e.target.value});setSelected({...selected,build_stage:e.target.value})}}><option value="voting">Voting</option><option value="selecting">Selected</option><option value="building">Building</option><option value="testing">Testing</option><option value="live">Live</option></select><button className="detail-main-btn" onClick={async()=>{await save(selected,{is_user_selectable:!selected.is_user_selectable});setSelected({...selected,is_user_selectable:!selected.is_user_selectable})}}>{selected.is_user_selectable?'Pause voting':'Open for voting'}</button></>}>
      <CardHead icon="folder" title="All Categories" sub="Manage category voting, build stages and community priority."/>
      <AdminTable headers={['Category','Community Votes','Status','Build Stage','Voting','Updated']}>{rows.map((r:any)=><tr key={r.id} onClick={()=>setSelected(r)}><td><b>{r.name}</b><small>{r.description}</small></td><td><strong>{r.votes||0}</strong></td><td><Pill>{r.status}</Pill></td><td><Pill>{r.build_stage}</Pill></td><td>{r.is_user_selectable?'Open':'Paused'}</td><td>{fmtDate(r.live_at||r.testing_started_at||r.build_started_at||r.selected_at)}</td></tr>)}</AdminTable>
    </TableLayout>
  </>;
}

function ProductsPage({rows,stats,selected,setSelected}:any){
  return <>
    <div className="admin-stats four"><Stat icon="tag" label="Total Products" value={stats.total||0}/><Stat icon="users" label="Products Requested" value={stats.with_requests||0}/><Stat icon="cloud-arrow-up" label="Experiences" value={stats.experience_count||0}/><Stat icon="flask" label="Products With Experiences" value={stats.with_experiences||0}/></div>
    <TableLayout detail={selected&&<><DetailTitle icon="tag" title="Product Detail"/>{selected.hero_image_url&&<img className="detail-product-img" src={selected.hero_image_url} alt=""/>}<h3>{selected.name}</h3><p>{selected.brand||'Unknown brand'} · {selected.category||'Uncategorised'}</p><Info label="Community requests" value={selected.requests||0}/><Info label="Experiences" value={selected.experiences||0}/><Info label="Source" value={selected.source}/><h4>About this product</h4><p>{selected.description||'No product description is stored yet.'}</p></>}>
      <CardHead icon="tag" title="All Products" sub="Manage product records and monitor items being unmasked."/>
      <AdminTable headers={['Product','Category','Source','Requests','Experiences','Last Updated']}>{rows.map((r:any)=><tr key={r.id} onClick={()=>setSelected(r)}><td><div className="product-cell">{r.hero_image_url?<img src={r.hero_image_url}/>:<span><FA name="box"/></span>}<div><b>{r.name}</b><small>{r.brand}</small></div></div></td><td>{r.category||'—'}</td><td><Pill>{r.source||'community'}</Pill></td><td>{r.requests||0}</td><td>{r.experiences||0}</td><td>{fmtDate(r.updated_at)}</td></tr>)}</AdminTable>
    </TableLayout>
  </>;
}

function CollaborationsPage({rows,stats,selected,setSelected,onChanged}:any){
  const change=async(id:string,status:string)=>{await updateCollaborationStatus(id,status);onChanged()};
  return <>
    <div className="admin-stats four"><Stat icon="handshake" label="Total Collaborations" value={stats.total||0}/><Stat icon="bullhorn" label="Live / Approved" value={stats.live_approved||0}/><Stat icon="clock" label="Pending Review" value={stats.pending||0}/><Stat icon="tag" label="Completed" value={stats.completed||0}/></div>
    <TableLayout detail={selected&&<><DetailTitle icon="folder" title="Collaboration Detail"/><h3>{selected.business_name}</h3><p>{selected.product_name||'No product'} · {selected.category||'Uncategorised'}</p><Info label="Contact" value={selected.contact_name}/><Info label="Email" value={selected.email}/><Info label="Status" value={selected.status}/><h4>Why they contacted Unmask</h4><p>{selected.goal||selected.notes||'No brief provided.'}</p><div className="detail-actions"><button onClick={()=>change(selected.id,'approved')}>Approve</button><button onClick={()=>change(selected.id,'live')}>Mark live</button><button onClick={()=>change(selected.id,'completed')}>Complete</button><button onClick={()=>change(selected.id,'rejected')}>Reject</button></div></>}>
      <CardHead icon="folder" title="All Collaborations" sub="Review and manage partnership requests and partner-product opportunities."/>
      <AdminTable headers={['Business','Product','Category','Type','Status','Submitted']}>{rows.map((r:any)=><tr key={r.id} onClick={()=>setSelected(r)}><td><b>{r.business_name}</b><small>{r.contact_name}</small></td><td>{r.product_name||'—'}</td><td>{r.category||'—'}</td><td>{r.business_type||'—'}</td><td><Pill>{r.status}</Pill></td><td>{fmtDate(r.created_at)}</td></tr>)}</AdminTable>
    </TableLayout>
  </>;
}

function RewardsPage({data,stats,selected,setSelected,onChanged}:any){
  const rules=data?.rules||[],ledger=data?.ledger||[];
  const [editing,setEditing]=useState<any>(null);
  const save=async()=>{if(!editing)return;await updateRewardRule(editing.key,Number(editing.coin_amount||0),Boolean(editing.active));setEditing(null);onChanged()};
  return <>
    <div className="admin-stats four"><Stat icon="coins" label="Total Coins Issued" value={stats.coins_issued||0}/><Stat icon="tag" label="Active Reward Rules" value={stats.active_rules||0}/><Stat icon="clock" label="Coin Events" value={stats.coin_events||0}/><Stat icon="gift" label="Social Reward Rules" value={stats.social_rules||0}/></div>
    <div className="admin-grid rewards-admin-grid">
      <section className="admin-card"><CardHead icon="sliders" title="Reward Rules" sub="Set exactly how many Coins social tasks give."/><div className="reward-rule-list">{rules.map((r:any)=><button key={r.key} onClick={()=>setEditing({...r})}><div><b>{r.title||r.key}</b><small>{r.description}</small></div><strong>{r.coin_amount} Coins</strong><Pill>{r.active?'Active':'Paused'}</Pill></button>)}</div></section>
      <section className="admin-card"><CardHead icon="coins" title="Recent Coin Activity" sub="Latest Coin credits across Unmask."/><div className="mini-table">{ledger.slice(0,12).map((l:any)=><button key={l.id} onClick={()=>setSelected(l)}><div><b>{l.display_name||'Unmasker'}</b><small>{l.note||l.source_type}</small></div><strong className={l.amount>=0?'positive':'negative'}>{l.amount>=0?'+':''}{l.amount}</strong></button>)}</div></section>
    </div>
    {editing&&<div className="admin-modal-backdrop" onMouseDown={()=>setEditing(null)}><div className="admin-modal" onMouseDown={e=>e.stopPropagation()}><h3>Edit {editing.title||editing.key}</h3><label>Coins<input type="number" min="0" value={editing.coin_amount} onChange={e=>setEditing({...editing,coin_amount:e.target.value})}/></label><label className="switch-row"><input type="checkbox" checked={editing.active} onChange={e=>setEditing({...editing,active:e.target.checked})}/> Active</label><button className="detail-main-btn" onClick={save}>Save reward rule</button></div></div>}
  </>;
}

function UsersPage({rows,stats,selected,setSelected}:any){
  const safeRows=Array.isArray(rows)?rows:[];
  const safeStats=stats||{};
  return <>
    <div className="admin-stats four"><Stat icon="users" label="Total Users" value={safeStats.total||0}/><Stat icon="shield" label="Administrators" value={safeStats.admins||0}/><Stat icon="camera" label="Users Who Unmasked" value={safeStats.unmaskers_with_experience||0}/><Stat icon="coins" label="Coins Held" value={safeStats.coins_held||0}/></div>
    <TableLayout detail={selected&&<><DetailTitle icon="user" title="User Detail"/><h3>{selected.display_name}</h3><Info label="Country" value={selected.country}/><Info label="Region" value={selected.region}/><Info label="Unmaskings" value={selected.unmaskings}/><Info label="Coins" value={selected.coins}/><Info label="Joined" value={fmtDate(selected.created_at)}/></>}>
      <CardHead icon="users" title="All Users" sub="Monitor Unmaskers and their community participation."/><AdminTable headers={['User','Country','Unmaskings','Coins','Role','Joined']}>{safeRows.map((r:any)=><tr key={r.id} onClick={()=>setSelected(r)}><td><b>{r.display_name||'Unmasker'}</b></td><td>{[r.region,r.country].filter(Boolean).join(', ')||'—'}</td><td>{r.unmaskings||0}</td><td>{r.coins||0}</td><td><Pill>{r.is_admin?'Admin':'Unmasker'}</Pill></td><td>{fmtDate(r.created_at)}</td></tr>)}</AdminTable>
    </TableLayout>
  </>;
}

function TrendsPage({overview}:any){
  const top=overview.top_categories||[];
  const max=Math.max(1,...top.map((x:any)=>Number(x.votes||0)));
  return <>
    <div className="admin-stats four"><Stat icon="chart-column" label="Category Votes" value={top.reduce((n:number,x:any)=>n+Number(x.votes||0),0)}/><Stat icon="fire" label="Leading Category" value={top[0]?.name||'—'}/><Stat icon="users" label="Active Unmaskers (30d)" value={overview.active_unmaskers_30d}/><Stat icon="cloud-arrow-up" label="Experiences" value={overview.experiences_total}/></div>
    <section className="admin-card admin-trend-card"><CardHead icon="chart-column" title="Category Pulse" sub="Live voting signal from the Unmask community."/><div className="trend-bars">{top.map((c:any,i:number)=><div key={c.id}><span>{i+1}</span><b>{c.name}</b><div><i style={{width:(Number(c.votes||0)/max*100)+'%'}}/></div><strong>{c.votes||0}</strong></div>)}</div></section>
  </>;
}

function MissionsPage({setNotice}:any){
  const blank={
    id:null,
    sectionTitle:'YOUR DAILY MISSION',
    heading:'Unmask 3 products you know.',
    subtext:'Pick products you have actually used and leave the truth behind for the next buyer.',
    targetCount:3,
    startsAt:new Date().toISOString().slice(0,16),
    endsAt:'',
    active:true
  };
  const [dashboard,setDashboard]=useState<any>({missions:[]});
  const [form,setForm]=useState<any>(blank);
  const [busy,setBusy]=useState(false);

  const load=()=>getAdminMissionDashboard().then(setDashboard);
  useEffect(()=>{load().catch(()=>undefined)},[]);

  const edit=(m:any)=>setForm({
    id:m.id,
    sectionTitle:m.section_title,
    heading:m.heading,
    subtext:m.subtext,
    targetCount:m.target_count,
    startsAt:m.starts_at?new Date(m.starts_at).toISOString().slice(0,16):'',
    endsAt:m.ends_at?new Date(m.ends_at).toISOString().slice(0,16):'',
    active:Boolean(m.active)
  });

  const save=async()=>{
    setBusy(true);
    try{
      await saveMission(form);
      await load();
      setNotice(form.id?'Mission updated.':'New mission published.');
      setForm({...blank,startsAt:new Date().toISOString().slice(0,16)});
    }catch(e:any){setNotice(e.message||'Could not save mission.')}
    finally{setBusy(false)}
  };

  const missions=dashboard?.missions||[];
  const active=missions.find((m:any)=>m.active && new Date(m.starts_at)<=new Date() && (!m.ends_at||new Date(m.ends_at)>new Date()));
  const viewers=Number(active?.viewers||0);
  const participants=Number(active?.participants||0);
  const completed=Number(active?.completed_users||0);
  const participationRate=viewers?Math.round((participants/viewers)*100):0;
  const completionRate=participants?Math.round((completed/participants)*100):0;

  return <div className="mission-admin-stack">
    <div className="admin-stats four">
      <Stat icon="eye" label="Mission Viewers" value={viewers}/>
      <Stat icon="person-running" label="Participants" value={participants}/>
      <Stat icon="percent" label="Participation Rate" value={participationRate+'%'}/>
      <Stat icon="circle-check" label="Completed" value={completed} sub={completionRate+'% of participants'}/>
    </div>

    <div className="admin-grid mission-admin-grid">
      <section className="admin-card mission-editor">
        <CardHead icon="bullseye" title={form.id?'Edit Mission':'Create Mission'} sub="This controls the mission card shown on every Unmasker dashboard."/>
        <div className="mission-editor-form">
          <label>Section title<input value={form.sectionTitle} onChange={e=>setForm({...form,sectionTitle:e.target.value})} placeholder="YOUR DAILY MISSION"/></label>
          <label>Heading / hero text<input value={form.heading} onChange={e=>setForm({...form,heading:e.target.value})} placeholder="Unmask 5 products today."/></label>
          <label className="wide">Sub text<textarea value={form.subtext} onChange={e=>setForm({...form,subtext:e.target.value})} placeholder="Explain the mission clearly."/></label>
          <label>Target<input type="number" min="1" max="50" value={form.targetCount} onChange={e=>setForm({...form,targetCount:Number(e.target.value)})}/></label>
          <label>Starts<input type="datetime-local" value={form.startsAt} onChange={e=>setForm({...form,startsAt:e.target.value})}/></label>
          <label>Ends (optional)<input type="datetime-local" value={form.endsAt} onChange={e=>setForm({...form,endsAt:e.target.value})}/></label>
          <label className="mission-active"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Make this the active mission</label>
        </div>

        <div className="mission-preview">
          <span>{form.sectionTitle||'MISSION'}</span>
          <div><h3>{form.heading||'Mission heading'}</h3><strong>0/{Number(form.targetCount||0)}</strong></div>
          <p>{form.subtext||'Mission description'}</p>
          <div className="mission-preview-track">{Array.from({length:Math.min(Number(form.targetCount||0),12)}).map((_,i)=><i key={i}>{i+1}</i>)}</div>
          {Number(form.targetCount||0)>12&&<small>+ {Number(form.targetCount||0)-12} more progress steps</small>}
        </div>

        <div className="mission-editor-actions">
          {form.id&&<button className="secondary" onClick={()=>setForm({...blank,startsAt:new Date().toISOString().slice(0,16)})}>Create new instead</button>}
          <button className="primary" disabled={busy||!form.sectionTitle.trim()||!form.heading.trim()||!form.subtext.trim()||form.targetCount<1} onClick={save}>{busy?'Saving…':form.id?'Save mission':'Publish mission'}</button>
        </div>
      </section>

      <section className="admin-card mission-history">
        <CardHead icon="clock-rotate-left" title="Mission History" sub="Live participation data for every mission you have run."/>
        <div className="mission-history-list">
          {!missions.length&&<div className="recipient-empty">No missions yet.</div>}
          {missions.map((m:any)=>{
            const seen=Number(m.viewers||0),joined=Number(m.participants||0),done=Number(m.completed_users||0);
            const rate=seen?Math.round(joined/seen*100):0;
            return <button key={m.id} onClick={()=>edit(m)} className={m.active?'active':''}>
              <div className="mission-history-main"><span>{m.section_title}</span><b>{m.heading}</b><small>{fmtDate(m.starts_at)}{m.ends_at?' → '+fmtDate(m.ends_at):''}</small></div>
              <div className="mission-history-metrics"><em>{seen}<small>saw</small></em><em>{joined}<small>joined</small></em><em>{done}<small>done</small></em><strong>{rate}%<small>participation</small></strong></div>
            </button>
          })}
        </div>
      </section>
    </div>
  </div>;
}

function SettingsPage({overview,onSaved,setNotice}:any){
  const [rewards,setRewards]=useState<any[]>([]);
  const [categories,setCategories]=useState<any[]>([]);
  const [users,setUsers]=useState<any[]>([]);
  const [testingUrl,setTestingUrl]=useState('');
  const [testerProgram,setTesterProgram]=useState<any>({groupUrl:'',verificationCode:'',coinAmount:150,firstTestAt:'',active:true});
  const [nextRound,setNextRound]=useState({title:'Next Unmask category',ends:''});
  const [phase,setPhase]=useState(overview.build_round?.phase||'voting');
  const [ends,setEnds]=useState(overview.build_round?.voting_ends_at?new Date(overview.build_round.voting_ends_at).toISOString().slice(0,16):'');
  const [selectedCategory,setSelectedCategory]=useState(overview.build_round?.selected_category_id||'');
  const [broadcast,setBroadcast]=useState({title:'',body:'',link:'/?view=dashboard'});
  const [audience,setAudience]=useState<'all'|'single'|'group'>('all');
  const [selectedUsers,setSelectedUsers]=useState<string[]>([]);
  const [userSearch,setUserSearch]=useState('');
  const [busy,setBusy]=useState('');

  useEffect(()=>{
    Promise.all([getAdminSection('rewards'),getAdminBuildCategories(),getAdminSection('users',500),getAdminTesterProgram()])
      .then(([r,c,u,tp])=>{
        setRewards(r.rules||[]);
        setCategories(c||[]);
        setUsers(Array.isArray(u)?u:[]);
        setTesterProgram({
          groupUrl:tp?.group_url||'',
          verificationCode:tp?.verification_code||'',
          coinAmount:Number(tp?.coin_amount||150),
          firstTestAt:tp?.first_test_at?new Date(tp.first_test_at).toISOString().slice(0,16):'',
          active:tp?.active!==false
        });
        const active=(c||[]).find((x:any)=>x.id===overview.build_round?.selected_category_id);
        setTestingUrl(active?.testing_url||'');
      });
  },[]);

  const visibleUsers=useMemo(()=>{
    const q=userSearch.trim().toLowerCase();
    if(!q)return users;
    return users.filter((u:any)=>[u.display_name,u.email,u.country,u.region].filter(Boolean).join(' ').toLowerCase().includes(q));
  },[users,userSearch]);

  const saveRewards=async()=>{
    setBusy('rewards');
    try{
      for(const r of rewards) await updateRewardRule(r.key,Number(r.coin_amount||0),Boolean(r.active));
      setNotice('Reward settings saved.');
    }finally{setBusy('')}
  };

  const saveBuild=async()=>{
    setBusy('build');
    try{
      await updateBuildRound(phase,ends?new Date(ends).toISOString():null,selectedCategory||null);
      if(selectedCategory) await setCategoryTestingUrl(selectedCategory,testingUrl);
      setNotice('Build round updated.');
      onSaved();
    }finally{setBusy('')}
  };

  const saveTesterProgram=async()=>{
    setBusy('tester-program');
    try{
      await saveAdminTesterProgram({
        groupUrl:testerProgram.groupUrl,
        verificationCode:testerProgram.verificationCode,
        coinAmount:Number(testerProgram.coinAmount||0),
        firstTestAt:testerProgram.firstTestAt||null,
        active:Boolean(testerProgram.active)
      });
      setNotice('Founding Tester settings saved.');
      onSaved();
    }finally{setBusy('')}
  };

  const createNextRound=async()=>{
    if(!nextRound.ends) return;
    setBusy('next-round');
    try{
      await startNewBuildRound(nextRound.title,nextRound.ends);
      setPhase('voting');
      setSelectedCategory('');
      setTestingUrl('');
      setNotice('New build round started. The previous live category remains shown as completed.');
      onSaved();
    }finally{setBusy('')}
  };

  const toggleUser=(id:string)=>{
    if(audience==='single'){
      setSelectedUsers([id]);
      return;
    }
    setSelectedUsers(xs=>xs.includes(id)?xs.filter(x=>x!==id):[...xs,id]);
  };

  const changeAudience=(next:'all'|'single'|'group')=>{
    setAudience(next);
    setSelectedUsers([]);
    setUserSearch('');
  };

  const sendBroadcast=async()=>{
    setBusy('broadcast');
    try{
      let count=0;
      if(audience==='all'){
        count=await broadcastNotification(broadcast.title,broadcast.body,broadcast.link);
      }else{
        count=await sendNotificationToUsers(selectedUsers,broadcast.title,broadcast.body,broadcast.link);
      }

      const label=audience==='all'?'all Unmaskers':audience==='single'?'the selected Unmasker':'the selected group';
      setNotice('Notification sent to '+count+' '+(count===1?'person':'people')+' in '+label+'.');
      setBroadcast({title:'',body:'',link:'/?view=dashboard'});
      setSelectedUsers([]);
    }finally{setBusy('')}
  };

  const recipientReady=audience==='all'||(audience==='single'&&selectedUsers.length===1)||(audience==='group'&&selectedUsers.length>0);

  return <div className="settings-stack">
    <section className="admin-card settings-hero"><div><span>ADMIN CONFIGURATION</span><h2>Control the live Unmask launch network.</h2><p>Change rewards, voting, build stages and community notifications without touching code.</p></div><FA name="sliders"/></section>

    <section className="admin-card settings-block"><CardHead icon="coins" title="Social Coin Rewards" sub="Control what following Unmask on social platforms earns."/><div className="settings-rows">{rewards.filter((r:any)=>['follow_x','follow_tiktok'].includes(r.key)).map((r:any)=><div key={r.key}><div><b>{r.title||r.key}</b><small>{r.description}</small></div><input type="number" min="0" value={r.coin_amount} onChange={e=>setRewards(xs=>xs.map((x:any)=>x.key===r.key?{...x,coin_amount:e.target.value}:x))}/><label className="toggle"><input type="checkbox" checked={r.active} onChange={e=>setRewards(xs=>xs.map((x:any)=>x.key===r.key?{...x,active:e.target.checked}:x))}/><span/></label></div>)}</div><button className="settings-save" disabled={busy==='rewards'} onClick={saveRewards}>{busy==='rewards'?'Saving…':'Save reward settings'}</button></section>

    <section className="admin-card settings-block">
      <CardHead icon="hammer" title="Category Build Control" sub="Control the category currently moving through Building → First Test → Improve → V1 Live."/>
      <div className="settings-form-grid">
        <label>Current phase<select value={phase} onChange={e=>setPhase(e.target.value)}><option value="voting">Voting</option><option value="selecting">Selected</option><option value="building">Building</option><option value="testing">Testing</option><option value="live">Live</option></select></label>
        <label>Legacy voting deadline<input type="datetime-local" value={ends} onChange={e=>setEnds(e.target.value)}/><small>Kept for later category races; the founding Skincare build is already underway.</small></label>
        <label>Selected category<select value={selectedCategory} onChange={e=>{const id=e.target.value;setSelectedCategory(id);setTestingUrl(categories.find((c:any)=>c.id===id)?.testing_url||'')}}><option value="">No category selected</option>{categories.map((c:any)=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
        <label className="settings-wide">Testing link<input type="url" placeholder="https://..." value={testingUrl} onChange={e=>setTestingUrl(e.target.value)}/><small>Shown to Unmaskers only when this category reaches Testing.</small></label>
      </div>
      <button className="settings-save" disabled={busy==='build'} onClick={saveBuild}>{busy==='build'?'Saving…':'Update build round'}</button>

      <div className="next-round-box">
        <div><b>Start another category round</b><small>Use this after a category is live. The finished category stays visible as completed while a new category starts at Vote.</small></div>
        <input value={nextRound.title} onChange={e=>setNextRound({...nextRound,title:e.target.value})} placeholder="Round title"/>
        <input type="datetime-local" value={nextRound.ends} onChange={e=>setNextRound({...nextRound,ends:e.target.value})}/>
        <button disabled={busy==='next-round'||!nextRound.ends} onClick={createNextRound}>{busy==='next-round'?'Starting…':'Start new round'}</button>
      </div>
    </section>

    <section className="admin-card settings-block notification-builder">
      <CardHead icon="bell" title="Send Notification" sub="Send to everyone, one specific Unmasker, or a hand-picked group."/>

      <div className="audience-tabs">
        <button className={audience==='all'?'active':''} onClick={()=>changeAudience('all')}><FA name="users"/> Everyone</button>
        <button className={audience==='single'?'active':''} onClick={()=>changeAudience('single')}><FA name="user"/> One user</button>
        <button className={audience==='group'?'active':''} onClick={()=>changeAudience('group')}><FA name="user-group"/> Selected group</button>
      </div>

      {audience!=='all'&&<div className="recipient-picker">
        <div className="recipient-search"><FA name="magnifying-glass"/><input value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder="Search by name, email or location…"/></div>
        <div className="recipient-list">
          {visibleUsers.length===0&&<div className="recipient-empty">No matching users.</div>}
          {visibleUsers.map((u:any)=>{
            const checked=selectedUsers.includes(u.id);
            return <button type="button" key={u.id} className={checked?'selected':''} onClick={()=>toggleUser(u.id)}>
              <span className="recipient-avatar">{(u.display_name||u.email||'U').trim().charAt(0).toUpperCase()}</span>
              <div><b>{u.display_name||'Unmasker'}</b><small>{u.email||[u.region,u.country].filter(Boolean).join(', ')||'No email shown'}</small></div>
              <span className="recipient-check">{checked?<FA name="check"/>:<FA name={audience==='single'?'circle':'square'}/>}</span>
            </button>
          })}
        </div>
        <div className="recipient-summary">
          <b>{selectedUsers.length}</b> {selectedUsers.length===1?'recipient':'recipients'} selected
          {audience==='single'&&<span>Choose exactly one person.</span>}
          {audience==='group'&&<span>Select as many people as you want.</span>}
        </div>
      </div>}

      <div className="broadcast-form">
        <input placeholder="Notification title" value={broadcast.title} onChange={e=>setBroadcast({...broadcast,title:e.target.value})}/>
        <textarea placeholder="What should they know?" value={broadcast.body} onChange={e=>setBroadcast({...broadcast,body:e.target.value})}/>
        <input placeholder="Open this link when tapped" value={broadcast.link} onChange={e=>setBroadcast({...broadcast,link:e.target.value})}/>
      </div>

      <button className="settings-save" disabled={busy==='broadcast'||broadcast.title.trim().length<2||broadcast.body.trim().length<2||!recipientReady} onClick={sendBroadcast}>
        {busy==='broadcast'?'Sending…':audience==='all'?'Send to everyone':audience==='single'?'Send to selected user':'Send to selected group'}
      </button>
    </section>
  </div>;
}

function AdminTable({headers,children}:{headers:string[],children:any}){
  return <div className="admin-table-scroll"><table className="admin-table"><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
}
function DetailTitle({icon,title}:{icon:string,title:string}){return <div className="detail-title"><span><FA name={icon}/></span><h3>{title}</h3></div>}
function Info({label,value}:{label:string,value:any}){return <div className="detail-info"><span>{label}</span><b>{value??'—'}</b></div>}    <section className="admin-card settings-block tester-admin-block">
      <CardHead icon="flask" title="Founding Tester Group" sub="Configure the WhatsApp tester group, first-test countdown and tester Coin reward."/>
      <div className="settings-form-grid">
        <label className="settings-wide">WhatsApp group invite link<input type="url" placeholder="https://chat.whatsapp.com/..." value={testerProgram.groupUrl} onChange={e=>setTesterProgram({...testerProgram,groupUrl:e.target.value})}/><small>Users see the Join button only after this link is added.</small></label>
        <label>Tester verification code<input type="text" placeholder="e.g. SKINCARE8" value={testerProgram.verificationCode} onChange={e=>setTesterProgram({...testerProgram,verificationCode:e.target.value})}/><small>Post this code inside the WhatsApp group. Members enter it on Unmask to verify they joined.</small></label>
        <label>Join reward (Coins)<input type="number" min="0" value={testerProgram.coinAmount} onChange={e=>setTesterProgram({...testerProgram,coinAmount:e.target.value})}/></label>
        <label>First tester build<input type="datetime-local" value={testerProgram.firstTestAt} onChange={e=>setTesterProgram({...testerProgram,firstTestAt:e.target.value})}/></label>
        <label className="toggle-row"><span>Tester program active</span><span className="toggle"><input type="checkbox" checked={testerProgram.active} onChange={e=>setTesterProgram({...testerProgram,active:e.target.checked})}/><span/></span></label>
      </div>
      <button className="settings-save" disabled={busy==='tester-program'} onClick={saveTesterProgram}>{busy==='tester-program'?'Saving…':'Save tester settings'}</button>
    </section>


