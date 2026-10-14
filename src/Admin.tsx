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
  updateRequestStatus,
  updateRewardRule
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
    if(next==='overview'||next==='settings'||next==='trends') return;
    const data=await getAdminSection(next);
    setRows(data);setSelected(Array.isArray(data)?data[0]:(data?.ledger?.[0]||data?.rules?.[0]||null));
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
    if(!Array.isArray(rows)) return rows;
    const q=search.trim().toLowerCase();
    if(!q)return rows;
    return rows.filter((r:any)=>JSON.stringify(r).toLowerCase().includes(q));
  },[rows,search]);

  if(allowed===null)return <div className="admin-guard"><Brand/><span>Opening admin…</span></div>;
  if(!allowed)return <div className="admin-guard"><Brand/><h2>Admin access required</h2><p>This area is only available to authorised Unmask administrators.</p><button onClick={()=>go('dashboard')}>Return to Unmask</button></div>;

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <Brand/>
      <nav>{NAV.map(([key,label,icon])=><button key={key} className={section===key?'active':''} onClick={()=>{setSection(key);setSelected(null)}}><FA name={icon}/><span>{label}</span></button>)}</nav>
      <div className="admin-side-card"><div className="side-art">U</div><b>Reveal the truth behind products.</b><p>Real experiences. Clear information. Smarter buying decisions.</p></div>
      <button className="admin-exit" onClick={()=>go('dashboard')}><FA name="arrow-left"/> Back to community</button>
    </aside>

    <section className="admin-main">
      <header className="admin-topbar">
        <div className="admin-title"><h1>{NAV.find(x=>x[0]===section)?.[1]}</h1><p>{section==='overview'?'Monitor. Moderate. Empower a more informed world.':'Manage live Unmask community data and platform configuration.'}</p></div>
        <div className="admin-search"><FA name="magnifying-glass"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products, users, requests, or anything…"/></div>
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
  return <>
    <div className="admin-stats four"><Stat icon="cloud-arrow-up" label="Total Experiences" value={stats.total||0}/><Stat icon="clock" label="Needs Review" value={stats.needs_review||0}/><Stat icon="circle-check" label="Published" value={stats.published||0}/><Stat icon="flag" label="Flagged" value={stats.flagged||0}/></div>
    <TableLayout detail={selected&&<><DetailTitle icon="file-lines" title="Experience Detail"/><h3>{selected.product_name}</h3><p>{selected.brand||''} {selected.category?'· '+selected.category:''}</p><Info label="Submitted by" value={selected.author_name}/><Info label="Ownership" value={selected.ownership_status}/><Info label="Duration" value={selected.used_duration}/><Info label="Status" value={selected.moderation_status}/><h4>User's experience</h4><p>{selected.body}</p><div className="detail-actions"><button onClick={()=>change(selected.id,'published')}>Approve & publish</button><button onClick={()=>change(selected.id,'review')}>Move to review</button><button onClick={()=>change(selected.id,'flagged')}>Flag</button><button onClick={()=>change(selected.id,'rejected')}>Reject</button></div></>}>
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
  return <>
    <div className="admin-stats four"><Stat icon="users" label="Total Users" value={stats.total||0}/><Stat icon="shield" label="Administrators" value={stats.admins||0}/><Stat icon="camera" label="Users Who Unmasked" value={stats.unmaskers_with_experience||0}/><Stat icon="coins" label="Coins Held" value={stats.coins_held||0}/></div>
    <TableLayout detail={selected&&<><DetailTitle icon="user" title="User Detail"/><h3>{selected.display_name}</h3><Info label="Country" value={selected.country}/><Info label="Region" value={selected.region}/><Info label="Unmaskings" value={selected.unmaskings}/><Info label="Coins" value={selected.coins}/><Info label="Joined" value={fmtDate(selected.created_at)}/></>}>
      <CardHead icon="users" title="All Users" sub="Monitor Unmaskers and their community participation."/><AdminTable headers={['User','Country','Unmaskings','Coins','Role','Joined']}>{rows.map((r:any)=><tr key={r.id} onClick={()=>setSelected(r)}><td><b>{r.display_name||'Unmasker'}</b></td><td>{[r.region,r.country].filter(Boolean).join(', ')||'—'}</td><td>{r.unmaskings||0}</td><td>{r.coins||0}</td><td><Pill>{r.is_admin?'Admin':'Unmasker'}</Pill></td><td>{fmtDate(r.created_at)}</td></tr>)}</AdminTable>
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

function SettingsPage({overview,onSaved,setNotice}:any){
  const [rewards,setRewards]=useState<any[]>([]);
  const [categories,setCategories]=useState<any[]>([]);
  const [phase,setPhase]=useState(overview.build_round?.phase||'voting');
  const [ends,setEnds]=useState(overview.build_round?.voting_ends_at?new Date(overview.build_round.voting_ends_at).toISOString().slice(0,16):'');
  const [selectedCategory,setSelectedCategory]=useState(overview.build_round?.selected_category_id||'');
  const [broadcast,setBroadcast]=useState({title:'',body:'',link:'/?view=dashboard'});
  const [busy,setBusy]=useState('');

  useEffect(()=>{Promise.all([getAdminSection('rewards'),getAdminSection('categories')]).then(([r,c])=>{setRewards(r.rules||[]);setCategories(c||[])})},[]);

  const saveRewards=async()=>{
    setBusy('rewards');
    try{for(const r of rewards) await updateRewardRule(r.key,Number(r.coin_amount||0),Boolean(r.active));setNotice('Reward settings saved.');}
    finally{setBusy('')}
  };
  const saveBuild=async()=>{
    setBusy('build');
    try{await updateBuildRound(phase,ends?new Date(ends).toISOString():null,selectedCategory||null);setNotice('Build round updated. Community notifications will follow stage changes.');onSaved();}
    finally{setBusy('')}
  };
  const sendBroadcast=async()=>{
    setBusy('broadcast');
    try{const count=await broadcastNotification(broadcast.title,broadcast.body,broadcast.link);setNotice('Notification sent to '+count+' Unmaskers.');setBroadcast({title:'',body:'',link:'/?view=dashboard'});}
    finally{setBusy('')}
  };

  return <div className="settings-stack">
    <section className="admin-card settings-hero"><div><span>ADMIN CONFIGURATION</span><h2>Control the live Unmask launch network.</h2><p>Change rewards, voting, build stages and community notifications without touching code.</p></div><FA name="sliders"/></section>

    <section className="admin-card settings-block"><CardHead icon="coins" title="Social Coin Rewards" sub="Control what following Unmask on social platforms earns."/><div className="settings-rows">{rewards.filter((r:any)=>['follow_x','follow_tiktok'].includes(r.key)).map((r:any,i:number)=><div key={r.key}><div><b>{r.title||r.key}</b><small>{r.description}</small></div><input type="number" min="0" value={r.coin_amount} onChange={e=>setRewards(xs=>xs.map((x:any)=>x.key===r.key?{...x,coin_amount:e.target.value}:x))}/><label className="toggle"><input type="checkbox" checked={r.active} onChange={e=>setRewards(xs=>xs.map((x:any)=>x.key===r.key?{...x,active:e.target.checked}:x))}/><span/></label></div>)}</div><button className="settings-save" disabled={busy==='rewards'} onClick={saveRewards}>{busy==='rewards'?'Saving…':'Save reward settings'}</button></section>

    <section className="admin-card settings-block"><CardHead icon="hammer" title="Build Round & Category Voting" sub="Move the community through Vote → Selected → Building → Testing → Live."/><div className="settings-form-grid"><label>Current phase<select value={phase} onChange={e=>setPhase(e.target.value)}><option value="voting">Voting</option><option value="selecting">Selected</option><option value="building">Building</option><option value="testing">Testing</option><option value="live">Live</option></select></label><label>Voting ends<input type="datetime-local" value={ends} onChange={e=>setEnds(e.target.value)}/></label><label>Selected category<select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)}><option value="">No category selected</option>{categories.map((c:any)=><option value={c.id} key={c.id}>{c.name} · {c.votes||0} votes</option>)}</select></label></div><button className="settings-save" disabled={busy==='build'} onClick={saveBuild}>{busy==='build'?'Saving…':'Update build round'}</button></section>

    <section className="admin-card settings-block"><CardHead icon="bell" title="Send Community Notification" sub="Send a custom in-app and push update to every Unmasker who enabled notifications."/><div className="broadcast-form"><input placeholder="Notification title" value={broadcast.title} onChange={e=>setBroadcast({...broadcast,title:e.target.value})}/><textarea placeholder="What should Unmaskers know?" value={broadcast.body} onChange={e=>setBroadcast({...broadcast,body:e.target.value})}/><input placeholder="Open this link when tapped" value={broadcast.link} onChange={e=>setBroadcast({...broadcast,link:e.target.value})}/></div><button className="settings-save" disabled={busy==='broadcast'||broadcast.title.trim().length<2||broadcast.body.trim().length<2} onClick={sendBroadcast}>{busy==='broadcast'?'Sending…':'Send notification to Unmaskers'}</button></section>
  </div>;
}

function AdminTable({headers,children}:{headers:string[],children:any}){
  return <div className="admin-table-scroll"><table className="admin-table"><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
}
function DetailTitle({icon,title}:{icon:string,title:string}){return <div className="detail-title"><span><FA name={icon}/></span><h3>{title}</h3></div>}
function Info({label,value}:{label:string,value:any}){return <div className="detail-info"><span>{label}</span><b>{value??'—'}</b></div>}
