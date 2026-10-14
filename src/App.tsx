import { useEffect, useMemo, useState } from 'react';
import { Country, State } from 'country-state-city';
import { identifyProduct, postJson, searchProducts } from './api';
import {
  chooseCategory,
  claimTask,
  getPulse,
  getLaunchTrends,
  getSummary,
  getCommunityFeed,
  getCommunityStats,
  getMyUnmaskerMission,
  getBuildVisionState,
  listCategories,
  rewardRules,
  submitExperience,
  suggestProduct,
  toggleUnmaskLike,
  verifyOwnership
} from './data';
import { supabase } from './supabase';

const FA = ({ name, className = '' }: { name: string; className?: string }) =>
  <i className={'fa-solid fa-' + name + ' ' + className} aria-hidden="true" />;

const Brand = () => <img className="brand" src="/resources/unmask-logo.png" alt="Unmask — Know before you buy." />;

function Notice({ tone = 'info', children }: any) {
  const icon = tone === 'success' ? 'circle-check' : tone === 'error' ? 'circle-exclamation' : 'circle-info';
  return <div className={'notice ' + tone}><FA name={icon} /><div>{children}</div></div>;
}

function Empty({ title, body }: { title: string; body: string }) {
  return <div className="empty"><FA name="seedling" /><div><b>{title}</b><span>{body}</span></div></div>;
}

async function imageToCompressedBase64(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the photo.'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not open the photo.'));
    img.src = dataUrl;
  });
  const max = 1280;
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare the photo.');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const compressed = canvas.toDataURL('image/jpeg', 0.78);
  return { imageBase64: compressed.split(',')[1], mimeType: 'image/jpeg', preview: compressed };
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState(() => {
    const stored = localStorage.getItem('unmask_view') || 'landing';
    return stored === 'rewards' ? 'dashboard' : stored;
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => localStorage.setItem('unmask_view', view), [view]);

  const go = (next: string) => {
    setView(next);
    localStorage.setItem('unmask_view', next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!ready) return <div className="boot"><Brand /><span>Opening Unmask…</span></div>;
  if (view === 'auth') return <Auth go={go} />;
  if (view === 'dashboard') return session ? <Dashboard go={go} /> : <Auth go={go} loginFirst />;
  if (view === 'trends') return <Trends go={go} session={session} />;
  if (view === 'suggest') return session ? <Suggest go={go} /> : <Auth go={go} loginFirst />;
  if (view === 'unmask') return session ? <Unmask go={go} /> : <Auth go={go} loginFirst />;
  return <Landing go={go} session={session} />;
}

function Landing({ go, session }: any) {
  const [feed,setFeed]=useState<any[]>([]);
  const [stats,setStats]=useState<any>({unmasked_today:0,unmasked_total:0,unmaskers_total:0,category_votes:0});

  useEffect(()=>{
    Promise.all([getCommunityFeed(6),getCommunityStats()]).then(([f,s])=>{setFeed(f);setStats(s)}).catch(()=>undefined);
  },[]);

  return <main className="landing movement-landing">
    <header className="site-head simple-head">
      <Brand />
      <nav><button onClick={()=>go('trends')}>Live activity</button></nav>
      <button className="btn solid" onClick={()=>go(session?'dashboard':'auth')}>{session?'Enter Unmask':'Join the Unmaskers'}</button>
    </header>

    <section className="movement-hero">
      <div className="movement-copy">
        <span className="movement-kicker">WE ARE UNMASKERS.</span>
        <h1>We reveal what products are <em>really</em> like.</h1>
        <p>Used something? Tell people what actually happened. What lasted. What broke. What wasted your money. What was worth it.</p>
        <div className="movement-actions">
          <button className="btn solid movement-primary" onClick={()=>go(session?'unmask':'auth')}>Unmask a product <FA name="arrow-right"/></button>
          <button className="btn ghost" onClick={()=>go('trends')}>See what Unmaskers are doing</button>
        </div>
        <div className="movement-stats">
          <div><strong>{stats.unmasked_today||0}</strong><span>unmasked today</span></div>
          <div><strong>{stats.unmasked_total||0}</strong><span>products shared</span></div>
          <div><strong>{stats.unmaskers_total||0}</strong><span>Unmaskers</span></div>
        </div>
      </div>

      <div className="movement-manifesto">
        <div className="manifesto-stamp">UNMASK IT.</div>
        <h2>If a product deserves praise, say it. If it wasted your money, drag it into the light.</h2>
        <p>Your experience can save the next person from making the same mistake.</p>
      </div>
    </section>

    <section className="how-unmask-works">
      <span className="eyebrow">IT IS THIS SIMPLE</span>
      <h2>Know a product. Tell the truth. Help the next buyer.</h2>
      <div className="simple-steps">
        <article><span>1</span><b>Pick something you’ve used</b><small>Something in your house, bag, bathroom, kitchen or pocket.</small></article>
        <article><span>2</span><b>Unmask what happened</b><small>How long it lasted, what worked, what failed, what surprised you.</small></article>
        <article><span>3</span><b>Leave the truth behind</b><small>Another person sees the experience before spending their money.</small></article>
      </div>
    </section>

    <section className="landing-feed">
      <div className="section-head"><div><span className="eyebrow">UNMASKERS ARE ACTIVE</span><h2>See what people are unmasking.</h2></div><button className="text-btn" onClick={()=>go('trends')}>See live activity <FA name="arrow-right"/></button></div>
      <CommunityFeed items={feed} compact publicView/>
    </section>

    <section className="landing-join">
      <div><span className="eyebrow">YOUR TURN</span><h2>Look around you. Pick one product. Unmask it.</h2><p>That is how the community grows — one honest experience at a time.</p></div>
      <button className="btn solid" onClick={()=>go(session?'unmask':'auth')}>{session?'Unmask now':'Join and unmask'} <FA name="arrow-right"/></button>
    </section>
  </main>;
}

function Shell({ children, go, active, summary }: any) {
  const nav = [
    ['dashboard','Home','house'],
    ['unmask','Unmask','camera'],
    ['trends','Live','bolt']
  ];
  return <main className="app-shell">
    <header className="app-head"><Brand /><div className="head-right"><span className="avatar">{summary?.displayName?.[0]?.toUpperCase() || 'U'}</span></div></header>
    <div className="app-body">{children}</div>
    <nav className="bottom-nav simple-nav">{nav.map(([v,label,icon]) => <button key={v} className={active === v ? 'active' : ''} onClick={() => go(v)}><FA name={icon} /><span>{label}</span></button>)}</nav>
  </main>;
}

function Auth({ go, loginFirst = false }: any) {
  const [mode, setMode] = useState(loginFirst ? 'login' : 'signup');
  const [step, setStep] = useState('form');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<any>(null);
  const [form, setForm] = useState({ fullName:'', email:'', password:'', countryCode:'NG', regionCode:'', code:'' });
  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(() => State.getStatesOfCountry(form.countryCode), [form.countryCode]);
  const set = (k:string,v:string) => setForm(x => ({ ...x, [k]: v }));

  const signup = async (e:any) => {
    e.preventDefault();
    setBusy(true); setNotice(null);
    try {
      const country = countries.find(c => c.isoCode === form.countryCode)?.name || '';
      const region = states.find(s => s.isoCode === form.regionCode)?.name || '';
      await postJson('/api/auth/signup', { fullName:form.fullName, email:form.email, password:form.password, country, region });
      setStep('verify');
      setNotice({ tone:'success', text:'Check your email. We sent you a 6-digit code.' });
    } catch (err:any) { setNotice({ tone:'error', text:err.message }); }
    finally { setBusy(false); }
  };

  const verify = async (e:any) => {
    e.preventDefault();
    setBusy(true); setNotice(null);
    try {
      await postJson('/api/auth/verify-email', { email:form.email, code:form.code });
      const { error } = await supabase.auth.signInWithPassword({ email:form.email.trim().toLowerCase(), password:form.password });
      if (error) throw error;
      go('dashboard');
    } catch (err:any) { setNotice({ tone:'error', text:err.message || 'We could not finish creating your account.' }); }
    finally { setBusy(false); }
  };

  const login = async (e:any) => {
    e.preventDefault();
    setBusy(true); setNotice(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email:form.email.trim().toLowerCase(), password:form.password });
      if (error) throw error;
      const { data: profile } = await supabase.from('profiles').select('email_verified_custom').eq('id', data.user.id).maybeSingle();
      if (!profile?.email_verified_custom) {
        await supabase.auth.signOut();
        throw new Error('Please verify your email before logging in.');
      }
      go('dashboard');
    } catch (err:any) { setNotice({ tone:'error', text:err.message || 'Could not log you in.' }); }
    finally { setBusy(false); }
  };

  return <main className="auth-page">
    <div className="auth-wrap">
      <Brand />
      <div className="auth-copy"><span className="eyebrow">{mode === 'signup' ? 'BECOME AN UNMASKER' : 'WELCOME BACK'}</span><h1>{mode === 'signup' ? 'Join the people revealing what products are really like.' : 'Keep unmasking.'}</h1><p>{mode === 'signup' ? 'Share what you have learned from products you have actually used. Help the next person buy smarter.' : 'Your Unmasker mission and community are waiting for you.'}</p></div>
      <div className="auth-tabs"><button className={mode==='signup'?'active':''} onClick={() => {setMode('signup');setStep('form');setNotice(null)}}>Create account</button><button className={mode==='login'?'active':''} onClick={() => {setMode('login');setStep('form');setNotice(null)}}>Log in</button></div>

      {mode === 'signup' && step === 'form' && <form className="form-stack" onSubmit={signup}>
        <Field icon="user" value={form.fullName} onChange={(v:any)=>set('fullName',v)} placeholder="Full name" required />
        <Field icon="envelope" type="email" value={form.email} onChange={(v:any)=>set('email',v)} placeholder="Email address" required />
        <Field icon="lock" type="password" value={form.password} onChange={(v:any)=>set('password',v)} placeholder="Create a password (8+ characters)" required />
        <div className="split">
          <Select icon="globe" value={form.countryCode} onChange={(v:any)=>{set('countryCode',v);set('regionCode','')}}>{countries.map(c=><option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}</Select>
          <Select icon="location-dot" value={form.regionCode} onChange={(v:any)=>set('regionCode',v)}><option value="">State / region</option>{states.map(s=><option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}</Select>
        </div>
        <button className="btn solid full" disabled={busy}>{busy?'Creating account…':'Create account'} <FA name="arrow-right" /></button>
      </form>}

      {mode === 'signup' && step === 'verify' && <form className="verify-card" onSubmit={verify}>
        <div className="verify-icon"><FA name="envelope-open-text" /></div>
        <h2>One quick check.</h2>
        <p>Enter the code we sent to <b>{form.email}</b>.</p>
        <input className="code-input" inputMode="numeric" maxLength={6} value={form.code} onChange={e=>set('code',e.target.value.replace(/\D/g,''))} placeholder="000000" />
        <button className="btn solid full" disabled={busy}>{busy?'Verifying…':'Verify & enter Unmask'}</button>
      </form>}

      {mode === 'login' && <form className="form-stack" onSubmit={login}>
        <Field icon="envelope" type="email" value={form.email} onChange={(v:any)=>set('email',v)} placeholder="Email address" required />
        <Field icon="lock" type="password" value={form.password} onChange={(v:any)=>set('password',v)} placeholder="Password" required />
        <button className="btn solid full" disabled={busy}>{busy?'Logging in…':'Log in'} <FA name="arrow-right" /></button>
      </form>}
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
    </div>
  </main>;
}


const CATEGORY_IMAGES: Record<string,string> = {
  'Beauty':'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1100&q=82',
  'Home Appliances':'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1100&q=82',
  'Tech':'https://images.unsplash.com/photo-1537822427422-52c6d57db73c?auto=format&fit=crop&w=1100&q=82',
  'Fashion':'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1100&q=82',
  'Food & Drink':'https://images.unsplash.com/photo-1685640206182-c51b8aa9b686?auto=format&fit=crop&w=1100&q=82',
  'Gaming':'https://images.unsplash.com/photo-1622297845775-5ff3fef71d13?auto=format&fit=crop&w=1100&q=82',
  'Automotive':'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1100&q=82'
};

const TASK_IMAGES: Record<string,string> = {
  follow_x:'/resources/task-x.webp',
  follow_tiktok:'https://images.unsplash.com/photo-1645848810565-ff3c1de0da09?auto=format&fit=crop&w=1200&q=82',
  unmask:'https://img.piri.net/mnresize/720/-/piri/upload/3/2024/2/3/2893c951-e-ticaret-icin-instagram-reels.jpg',
  suggest:'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1200&q=82'
};

function categoryImage(name:string){
  return CATEGORY_IMAGES[name] || CATEGORY_IMAGES.Tech;
}

function domainForProduct(product:any){
  const raw=[product?.category,product?.brand,product?.product_name].filter(Boolean).join(' ').toLowerCase();
  if(/beauty|cosmetic|skin|makeup|hair|fragrance|perfume/.test(raw)) return 'Beauty';
  if(/appliance|kitchen|blender|fridge|refrigerator|microwave|air fryer|washing|vacuum|home/.test(raw)) return 'Home Appliances';
  if(/fashion|cloth|dress|shoe|sneaker|bag|jewelry|jewellery|accessor|apparel/.test(raw)) return 'Fashion';
  if(/food|drink|grocery|snack|beverage|coffee|tea/.test(raw)) return 'Food & Drink';
  if(/gaming|game|console|playstation|xbox|controller/.test(raw)) return 'Gaming';
  if(/car|auto|vehicle|automotive|tyre|tire/.test(raw)) return 'Automotive';
  if(/phone|gadget|tech|electronic|laptop|computer|tablet|watch|headphone|earbud|camera/.test(raw)) return 'Tech';
  return 'Tech';
}

function productsForCategory(products:any[] = [],categoryName:string){
  return products.filter((p:any)=>domainForProduct(p)===categoryName);
}

function LiveTrendBoard({ data, go, full=false }:any){
  const categories=data?.categories||[];
  const [expanded,setExpanded]=useState<string|null>(categories?.[0]?.id||null);

  useEffect(()=>{
    if(!expanded && categories?.[0]?.id) setExpanded(categories[0].id);
  },[categories,expanded]);

  const totalVotes=Number(data?.total_votes||categories.reduce((n:number,c:any)=>n+Number(c.votes||0),0));
  const visible=full?categories:categories.slice(0,7);

  return <section className={'live-pulse '+(full?'full':'')}>
    <div className="live-pulse-head">
      <div>
        <div className="live-label"><span className="live-dot"/><b>LIVE CATEGORY PULSE</b></div>
        <h2>{full?'What everyone is pushing forward.':'The heat of the moment.'}</h2>
        <p>Votes and product requests update here as Unmaskers make their choices.</p>
      </div>
      <div className="live-total"><strong>{totalVotes}</strong><span>total category {totalVotes===1?'vote':'votes'}</span></div>
    </div>

    <div className="category-heat-list">
      {visible.map((cat:any,index:number)=>{
        const open=expanded===cat.id;
        const products=productsForCategory(data?.products||[],cat.name);
        const pct=totalVotes?Math.round((Number(cat.votes||0)/totalVotes)*100):0;
        const productRows=full?products:products.slice(0,3);
        return <article className={'heat-category '+(open?'open':'')} key={cat.id}>
          <button className="heat-category-main" onClick={()=>setExpanded(open?null:cat.id)}>
            <div className="heat-image-wrap">
              <img src={categoryImage(cat.name)} alt={cat.name}/>
              <span className="heat-rank">{index+1}</span>
            </div>
            <div className="heat-meta">
              <div className="heat-name-row"><h3>{cat.name}</h3>{index===0&&<span className="hot-chip">Leading</span>}</div>
              <div className="heat-vote-line"><strong>{cat.votes||0}</strong> total {Number(cat.votes||0)===1?'vote':'votes'}</div>
              <div className="heat-bar"><span style={{width:(totalVotes?pct:0)+'%'}}/></div>
            </div>
            <div className="pulse-visual" aria-hidden="true"><i/><i/><i/><i/><i/></div>
            <FA name={open?'chevron-up':'chevron-down'}/>
          </button>

          {open&&<div className="heat-products">
            <div className="heat-products-head">
              <div><b>{full?'Product requests in ':'Top product requests in '}{cat.name}</b><span>{products.reduce((n:number,p:any)=>n+Number(p.suggestions||0),0)} total requests</span></div>
              {!full&&<button onClick={()=>go('trends')}>View all <FA name="arrow-right"/></button>}
            </div>
            {!productRows.length?<div className="heat-empty"><FA name="sparkles"/><span>No product requests in this category yet. The first suggestion will show here live.</span></div>:
              <div className="heat-product-grid">{productRows.map((p:any,i:number)=><article className="heat-product" key={p.key||p.product_name}>
                <span className="product-rank">{i+1}</span>
                <div className="product-thumb"><FA name="box-open"/></div>
                <div><b>{p.product_name}</b><small>{p.brand||cat.name}</small></div>
                <strong>{p.suggestions||0}</strong>
              </article>)}</div>}
          </div>}
        </article>
      })}
    </div>

    {!full&&<button className="live-board-link" onClick={()=>go('trends')}>See the full live board <FA name="arrow-right"/></button>}
  </section>;
}

function CategoryVoteModal({ categories, trends, currentVote, onClose, onVote, busy }:any){
  const current=categories.find((c:any)=>c.name===currentVote);
  const [selected,setSelected]=useState(current?.id||categories?.[0]?.id||'');
  const selectedCategory=categories.find((c:any)=>c.id===selected);
  const votesFor=(name:string)=>trends?.categories?.find((x:any)=>x.name===name)?.votes||0;

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <section className="category-modal" onMouseDown={e=>e.stopPropagation()}>
      <div className="modal-grip"/>
      <div className="modal-title-row"><div><span className="eyebrow">YOUR VOTE SHAPES THE BUILD</span><h2>What should Unmask build first?</h2><p>Pick the category you most want us to unlock. You can change your vote while voting is open.</p></div><button className="modal-close" onClick={onClose}><FA name="xmark"/></button></div>
      <div className="category-modal-grid">
        {categories.map((cat:any)=><button key={cat.id} className={'category-modal-card '+(selected===cat.id?'selected':'')} onClick={()=>setSelected(cat.id)}>
          <img src={categoryImage(cat.name)} alt={cat.name}/>
          <div className="category-card-overlay"><b>{cat.name}</b><span>{votesFor(cat.name)} {votesFor(cat.name)===1?'vote':'votes'}</span></div>
          {selected===cat.id&&<span className="category-selected"><FA name="check"/></span>}
        </button>)}
      </div>
      <button className="btn solid full category-confirm" disabled={!selected||busy} onClick={()=>onVote(selected)}>{busy?'Saving your vote…':'Vote for '+(selectedCategory?.name||'this category')} <FA name="arrow-right"/></button>
    </section>
  </div>;
}



function Countdown({ endsAt }:any) {
  const [left,setLeft]=useState({days:0,hours:0,minutes:0,seconds:0,ended:false});

  useEffect(()=>{
    if(!endsAt) return;
    const tick=()=>{
      const diff=new Date(endsAt).getTime()-Date.now();
      if(diff<=0){setLeft({days:0,hours:0,minutes:0,seconds:0,ended:true});return;}
      setLeft({
        days:Math.floor(diff/86400000),
        hours:Math.floor((diff%86400000)/3600000),
        minutes:Math.floor((diff%3600000)/60000),
        seconds:Math.floor((diff%60000)/1000),
        ended:false
      });
    };
    tick();
    const timer=setInterval(tick,1000);
    return()=>clearInterval(timer);
  },[endsAt]);

  if(!endsAt) return <div className="vote-countdown waiting"><FA name="clock"/><span>Voting date will be announced</span></div>;
  if(left.ended) return <div className="vote-countdown ended"><FA name="flag-checkered"/><span>Voting has ended</span></div>;

  return <div className="vote-countdown">
    <div><strong>{left.days}</strong><span>days</span></div>
    <div><strong>{String(left.hours).padStart(2,'0')}</strong><span>hrs</span></div>
    <div><strong>{String(left.minutes).padStart(2,'0')}</strong><span>min</span></div>
    <div><strong>{String(left.seconds).padStart(2,'0')}</strong><span>sec</span></div>
  </div>;
}

const BUILD_STEPS=[
  ['voting','Vote','Unmaskers choose what we should build first.'],
  ['selecting','Selected','We lock the category for this build round.'],
  ['building','Building','We build the deep unmasking experience for it.'],
  ['testing','Testing','Unmaskers get first access and help us test it.'],
  ['live','Live','The category opens for full Unmask searches.']
];

function BuildRoadmap({ buildState, currentVote, onVote, compact=false }:any) {
  const round=buildState?.round||{};
  const phase=round.phase||'voting';
  const activeIndex=Math.max(0,BUILD_STEPS.findIndex(([key])=>key===phase));
  const selected=buildState?.categories?.find((c:any)=>c.id===round.selected_category_id);

  return <section className={'build-vision '+(compact?'compact':'')}>
    <div className="build-vision-top">
      <div>
        <span className="build-kicker"><FA name="hammer"/> WE ARE BUILDING UNMASK WITH YOU</span>
        <h2>We’re building the tool Unmaskers will use before they buy.</h2>
        <p>Take a picture of a product. Unmask what people actually experienced. Make a better buying decision. We’re building that experience category by category so every one can go deep.</p>
      </div>
      <div className="future-tool-card">
        <span><FA name="camera"/></span>
        <div><b>Picture a product</b><small>See what real users discovered before you spend.</small></div>
      </div>
    </div>

    <div className="build-why">
      <div><FA name="people-group"/><b>Your unmaskings are not random posts.</b><span>They are helping us learn what matters inside each product category.</span></div>
      <div><FA name="flask"/><b>You’ll be among the first testers.</b><span>The community helping shape this gets first access when a category reaches testing.</span></div>
      <div><FA name="layer-group"/><b>You decide where we start.</b><span>Vote for the category you most want the full Unmask experience built for first.</span></div>
    </div>

    <div className="build-roadmap">
      {BUILD_STEPS.map(([key,label,body],i)=><article key={key} className={(i<activeIndex?'done ':'')+(i===activeIndex?'active ':'')}>
        <span className="roadmap-node">{i<activeIndex?<FA name="check"/>:i+1}</span>
        <div><b>{label}</b><small>{body}</small></div>
      </article>)}
    </div>

    <div className="build-round-card">
      <div className="round-copy">
        <span className="eyebrow">{phase==='voting'?'CURRENT ROUND — VOTING IS OPEN':'CURRENT BUILD ROUND'}</span>
        <h3>{selected?selected.name+' is moving forward':'Which category should we build first?'}</h3>
        <p>{phase==='voting'?'Cast your vote before the round closes. The winning signal helps decide where the first deep Unmask experience goes.':'Follow the category from selection through build, testing and launch.'}</p>
        {currentVote&&phase==='voting'&&<div className="vote-status"><FA name="circle-check"/>Your vote: <b>{currentVote}</b></div>}
        {phase==='voting'&&<button className="btn solid" onClick={onVote}>{currentVote?'Change my vote':'Vote for a category'} <FA name="arrow-right"/></button>}
      </div>
      <div className="round-timer">
        <span>{phase==='voting'?'Voting closes in':'Current stage'}</span>
        {phase==='voting'?<Countdown endsAt={round.voting_ends_at}/>:<strong>{BUILD_STEPS[activeIndex]?.[1]||'Building'}</strong>}
        <small>{buildState?.experiences_gathered||0} real product experiences already gathered by Unmaskers</small>
      </div>
    </div>
  </section>;
}

function CommunityFeed({ items=[], onLike, compact=false, publicView=false }:any) {
  const [open,setOpen]=useState<string|null>(null);

  if(!items.length) return <div className="community-empty"><div className="community-empty-mark">U</div><div><b>The first Unmaskers are getting started.</b><span>When someone shares a product experience, it will appear here.</span></div></div>;

  return <div className={'community-feed '+(compact?'compact':'')}>
    {items.map((item:any)=>{
      const expanded=open===item.id;
      const initial=(item.author_name||'U').trim().charAt(0).toUpperCase();
      return <article className="unmask-post" key={item.id}>
        <div className="post-top">
          <span className="post-avatar">{initial}</span>
          <div className="post-person"><b>{item.author_name||'An Unmasker'}</b><span>unmasked <strong>{item.product_name}</strong></span></div>
          <span className="post-time">{new Date(item.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span>
        </div>

        <button className="post-story" onClick={()=>setOpen(expanded?null:item.id)}>
          <div className="post-product-line"><span>UNMASKED</span><b>{item.product_name}</b>{item.brand&&<small>{item.brand}</small>}</div>
          <p className={expanded?'expanded':''}>{item.body}</p>
          <div className="post-context">
            {item.used_duration&&<span><FA name="clock"/>{String(item.used_duration).replaceAll('_',' ')}</span>}
            {item.ownership_status==='owns_now'&&<span><FA name="circle-check"/>current owner</span>}
            {item.would_rebuy===false&&<span className="would-not"><FA name="thumbs-down"/>wouldn’t buy again</span>}
            {item.would_rebuy===true&&<span className="would-again"><FA name="thumbs-up"/>would use again</span>}
          </div>
          {!compact&&<span className="read-story">{expanded?'Show less':'Read the experience'} <FA name={expanded?'chevron-up':'chevron-down'}/></span>}
        </button>

        <div className="post-actions">
          <button className={item.liked_by_me?'liked':''} disabled={publicView} onClick={()=>onLike?.(item)}><FA name="heart"/><span>{item.likes||0}</span>{!publicView&&<small>{item.liked_by_me?'Helpful':'That helped'}</small>}</button>
          {!publicView&&<button onClick={()=>navigator.share?.({title:'Unmasked: '+item.product_name,text:(item.author_name||'An Unmasker')+' unmasked '+item.product_name,url:window.location.href}).catch(()=>undefined)}><FA name="share-nodes"/><small>Share</small></button>}
        </div>
      </article>
    })}
  </div>;
}

function Dashboard({ go }: any) {
  const [summary,setSummary]=useState<any>(null);
  const [stats,setStats]=useState<any>({unmasked_today:0,unmasked_total:0,unmaskers_total:0,active_unmaskers_today:0,category_votes:0});
  const [mission,setMission]=useState<any>({products_unmasked:0,mission_target:3,category_voted:false,social_followed:0});
  const [feed,setFeed]=useState<any[]>([]);
  const [trends,setTrends]=useState<any>({categories:[],products:[],total_votes:0,total_suggestions:0});
  const [categories,setCategories]=useState<any[]>([]);
  const [notice,setNotice]=useState<any>(null);
  const [clickedTask,setClickedTask]=useState<string|null>(null);
  const [showCategoryPicker,setShowCategoryPicker]=useState(false);
  const [voteBusy,setVoteBusy]=useState(false);

  const refresh=async()=>{
    const [sm,st,mi,fd,tr,ca]=await Promise.all([
      getSummary(),getCommunityStats(),getMyUnmaskerMission(),getCommunityFeed(12),getLaunchTrends(),listCategories()
    ]);
    setSummary(sm);setStats(st);setMission(mi);setFeed(fd);setTrends(tr);setCategories(ca);
  };

  useEffect(()=>{
    refresh().catch(()=>undefined);
    const channel=supabase.channel('unmasker-home-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'ownership_notes'},()=>refresh())
      .on('postgres_changes',{event:'*',schema:'public',table:'unmask_post_likes'},()=>getCommunityFeed(12).then(setFeed).catch(()=>undefined))
      .on('postgres_changes',{event:'*',schema:'public',table:'launch_category_votes'},()=>refresh())
      .subscribe();
    return()=>{supabase.removeChannel(channel)};
  },[]);

  const like=async(item:any)=>{
    try{
      const result=await toggleUnmaskLike(item.id);
      setFeed(rows=>rows.map(x=>x.id===item.id?{...x,likes:result.likes,liked_by_me:result.liked}:x));
    }catch(err:any){setNotice({tone:'error',text:err.message})}
  };

  const pickCategory=async(id:string)=>{
    setVoteBusy(true);
    try{
      await chooseCategory(id);
      await refresh();
      setShowCategoryPicker(false);
      setNotice({tone:'success',text:'Your vote is live. You helped decide what Unmask builds first.'});
    }catch(err:any){setNotice({tone:'error',text:err.message})}
    finally{setVoteBusy(false)}
  };

  const social=async(task:any)=>{
    if(!clickedTask||clickedTask!==task.key){
      window.open(task.url,'_blank','noopener,noreferrer');
      setClickedTask(task.key);
      return;
    }
    try{
      await claimTask(task.key);
      setNotice({tone:'success',text:'Done. Your social follow reward has been added.'});
      setClickedTask(null);
      await refresh();
    }catch(err:any){setNotice({tone:'error',text:err.message})}
  };

  const invite=async()=>{
    if(!summary?.referralCode)return;
    const link=window.location.origin+'?ref='+summary.referralCode;
    try{await navigator.clipboard.writeText(link);setNotice({tone:'success',text:'Invite link copied. Bring another Unmasker in.'})}
    catch{window.prompt('Copy your invite link',link)}
  };

  const missionDone=Math.min(Number(mission.products_unmasked||0),Number(mission.mission_target||3));
  const missionTarget=Number(mission.mission_target||3);
  const socialTasks=summary?.tasks?.filter((t:any)=>t.key==='follow_x'||t.key==='follow_tiktok')||[];

  return <Shell go={go} active="dashboard" summary={summary}>
    <section className="unmasker-hero">
      <div className="unmasker-hero-copy">
        <span className="eyebrow">YOU ARE AN UNMASKER</span>
        <h1>What are you going to <em>unmask today?</em></h1>
        <p>Pick a product you know. Tell people what really happened. Good, bad, broken, brilliant — reveal it.</p>
        <button className="btn solid hero-unmask-btn" onClick={()=>go('unmask')}><FA name="camera"/> Unmask a product</button>
      </div>
      <div className="today-live">
        <span className="live-dot"/><b>{stats.unmasked_today||0} unmasked today</b>
        <small>{stats.active_unmaskers_today||0} Unmaskers have shared something today</small>
      </div>
    </section>

    <section className="first-mission">
      <div className="mission-head">
        <div><span className="eyebrow">YOUR FIRST MISSION</span><h2>Unmask 3 products you know.</h2><p>Look around your home. Pick products you have actually used and leave the truth behind for the next buyer.</p></div>
        <strong>{missionDone}/{missionTarget}</strong>
      </div>
      <div className="mission-track">{Array.from({length:missionTarget}).map((_,i)=><span key={i} className={i<missionDone?'done':''}>{i<missionDone?<FA name="check"/>:i+1}</span>)}</div>
      <div className="mission-actions">
        <button className="btn solid" onClick={()=>go('unmask')}>{missionDone>=missionTarget?'Unmask another one':'Continue the mission'} <FA name="arrow-right"/></button>
        <button className="text-btn" onClick={invite}>Invite a friend to unmask with you <FA name="user-plus"/></button>
      </div>
    </section>

    <section className="community-now">
      <div className="section-head compact">
        <div><div className="live-label"><span className="live-dot"/><b>THE COMMUNITY IS UNMASKING</b></div><h2>What Unmaskers are revealing right now.</h2></div>
        <span className="community-count">{stats.unmasked_total||0} experiences shared</span>
      </div>
      <CommunityFeed items={feed} onLike={like}/>
    </section>

    <section className="vote-mission">
      <div className="vote-mission-image"><img src={categoryImage(summary?.voteName||'Beauty')} alt=""/></div>
      <div className="vote-mission-copy">
        <span className="eyebrow">YOU ALSO GET A SAY</span>
        <h2>Which category should Unmask build first?</h2>
        <p>Vote for the kind of products you most want the full Unmask experience to launch for.</p>
        {summary?.voteName?<div className="vote-status"><FA name="circle-check"/>Your vote: <b>{summary.voteName}</b></div>:<div className="vote-status pending"><span className="live-dot"/>You have not voted yet.</div>}
        <button className="btn solid" onClick={()=>setShowCategoryPicker(true)}>{summary?.voteName?'Change my vote':'Cast my vote'} <FA name="arrow-right"/></button>
      </div>
    </section>

    <section className="simple-next">
      <button onClick={()=>go('suggest')}>
        <span className="simple-next-visual"><FA name="magnifying-glass"/></span>
        <div><b>What do you want Unmask to cover next?</b><small>Tell us a product you are thinking about buying.</small></div>
        <FA name="chevron-right"/>
      </button>
      <button onClick={()=>go('trends')}>
        <span className="simple-next-visual"><FA name="bolt"/></span>
        <div><b>See the live Unmask board</b><small>Watch category votes and the products people are asking for.</small></div>
        <FA name="chevron-right"/>
      </button>
    </section>

    <section className="social-only-rewards">
      <div className="section-head compact"><div><span className="eyebrow">STAY CLOSE TO THE MOVEMENT</span><h2>Follow Unmask.</h2></div><small>Coins are only used here as a follow incentive.</small></div>
      <div className="social-follow-grid">
        {socialTasks.map((task:any)=><button key={task.key} className={'social-follow-card '+(task.completed?'done':'')} style={{backgroundImage:'linear-gradient(90deg,rgba(25,4,10,.88),rgba(25,4,10,.42)),url("'+TASK_IMAGES[task.key]+'")'}} onClick={()=>task.completed?undefined:social(task)}>
          <div><span><i className={'fa-brands fa-'+(task.key==='follow_x'?'x-twitter':'tiktok')}/></span><b>{task.key==='follow_x'?'Follow Unmask on X':'Follow Unmask on TikTok'}</b><small>{task.completed?'Completed':clickedTask===task.key?'Tap again after following':'Stay with the movement'}</small></div>
          <strong>{task.completed?<><FA name="check"/> Done</>:<><FA name="coins"/> +{task.coin_amount||100}</>}</strong>
        </button>)}
      </div>
    </section>

    {notice&&<Notice tone={notice.tone}>{notice.text}</Notice>}
    {showCategoryPicker&&<CategoryVoteModal categories={categories} trends={trends} currentVote={summary?.voteName} onClose={()=>setShowCategoryPicker(false)} onVote={pickCategory} busy={voteBusy}/>}
  </Shell>;
}

function RankCard({ title, rows=[], label, count }: any) {
  return <article className="rank-card"><div className="rank-head"><h3>{title}</h3><FA name="arrow-trend-up" /></div>{!rows.length ? <Empty title="Nothing here yet" body="The first real activity will appear here." /> : rows.map((r:any,i:number)=><div className="rank-row" key={(r.id||r[label])+i}><span>{i+1}</span><div><b>{r[label]}</b>{r.brand&&<small>{r.brand}</small>}</div><strong>{r[count] || 0}</strong></div>)}</article>;
}

function Trends({ go, session }: any) {
  const [trends,setTrends]=useState<any>({categories:[],products:[],total_votes:0,total_suggestions:0});
  const [feed,setFeed]=useState<any[]>([]);
  const [stats,setStats]=useState<any>({unmasked_today:0,unmasked_total:0,unmaskers_total:0,category_votes:0});
  const [summary,setSummary]=useState<any>(null);

  const refresh=()=>{
    Promise.all([getLaunchTrends(),getCommunityFeed(40),getCommunityStats()]).then(([t,f,st])=>{setTrends(t);setFeed(f);setStats(st)}).catch(()=>undefined);
    if(session)getSummary().then(setSummary).catch(()=>undefined);
  };

  useEffect(()=>{
    refresh();
    const channel=supabase.channel('unmask-live-page')
      .on('postgres_changes',{event:'*',schema:'public',table:'ownership_notes'},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'launch_category_votes'},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'product_suggestions'},refresh)
      .subscribe();
    return()=>{supabase.removeChannel(channel)};
  },[session]);

  const like=async(item:any)=>{
    if(!session) return go('auth');
    try{
      const result=await toggleUnmaskLike(item.id);
      setFeed(rows=>rows.map(x=>x.id===item.id?{...x,likes:result.likes,liked_by_me:result.liked}:x));
    }catch{}
  };

  const content=<>
    <PageIntro kicker="UNMASK LIVE" title="See what the community is revealing." body="Real people. Real products. Real experiences — plus the live vote for what Unmask should build first."/>

    <section className="live-overview">
      <div><span className="live-dot"/><strong>{stats.unmasked_today||0}</strong><small>unmasked today</small></div>
      <div><strong>{stats.unmaskers_total||0}</strong><small>Unmaskers</small></div>
      <div><strong>{trends.total_votes||0}</strong><small>category votes</small></div>
      <div><strong>{trends.total_suggestions||0}</strong><small>product requests</small></div>
    </section>

    <section className="community-now trends-community">
      <div className="section-head compact"><div><div className="live-label"><span className="live-dot"/><b>RECENT UNMASKINGS</b></div><h2>What people have been through with their products.</h2></div></div>
      <CommunityFeed items={feed} onLike={like} publicView={!session}/>
    </section>

    <LiveTrendBoard data={trends} go={go} full/>
  </>;

  return session?<Shell go={go} active="trends" summary={summary}>{content}</Shell>:<main className="landing"><header className="site-head simple-head"><Brand/><button className="btn solid" onClick={()=>go('auth')}>Join the Unmaskers</button></header><div className="public-trends">{content}</div></main>;
}

function Suggest({ go }: any) {
  const [summary,setSummary]=useState<any>(null);
  const [query,setQuery]=useState('');
  const [rows,setRows]=useState<any[]>([]);
  const [selected,setSelected]=useState<any>(null);
  const [notes,setNotes]=useState('');
  const [url,setUrl]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState<any>(null);
  useEffect(()=>{getSummary().then(setSummary)},[]);
  useEffect(()=>{if(query.trim().length<2||selected?.name===query){setRows([]);return;}const t=setTimeout(()=>searchProducts(query).then(setRows).catch(()=>setRows([])),350);return()=>clearTimeout(t)},[query,selected]);

  const submit=async()=>{if(!selected && !query.trim())return;setBusy(true);setNotice(null);try{await suggestProduct({productName:selected?.name||query,brand:selected?.brand||'',category:selected?.category||'',productUrl:url,notes});setNotice({tone:'success',text:'Added. This product now has another signal showing people want it covered.'});setQuery('');setSelected(null);setNotes('');setUrl('');}catch(e:any){setNotice({tone:'error',text:e.message})}finally{setBusy(false)}};

  return <Shell go={go} active="suggest" summary={summary}>
    <PageIntro kicker="SUGGEST A PRODUCT" title="What should we look into next?" body="Tell us what you’re considering. When enough information exists to properly Unmask it, you’ll be closer to having a useful answer." />
    <section className="focus-panel">
      <div className="search-wrap"><FA name="magnifying-glass" /><input value={query} onChange={e=>{setQuery(e.target.value);setSelected(null)}} placeholder="Start typing the product name…" /></div>
      {!!rows.length && <div className="search-results">{rows.map(r=><button key={(r.id||'')+r.name} onClick={()=>{setSelected(r);setQuery(r.name);setRows([])}}>{r.image?<img src={r.image} alt=""/>:<span><FA name="box"/></span>}<div><b>{r.name}</b><small>{[r.brand,r.category].filter(Boolean).join(' · ')}</small></div><FA name="chevron-right"/></button>)}</div>}
      {selected && <div className="selected-product"><FA name="circle-check"/><div><b>{selected.name}</b><span>{[selected.brand,selected.category].filter(Boolean).join(' · ')}</span></div></div>}
      <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What do you most want to know before buying it?" />
      <input className="plain-input" value={url} onChange={e=>setUrl(e.target.value)} placeholder="Where did you find it? Link or store (optional)" />
      <button className="btn solid full" disabled={busy||!query.trim()} onClick={submit}>{busy?'Adding…':'Suggest this product'} <FA name="arrow-right"/></button>
    </section>
    {notice&&<Notice tone={notice.tone}>{notice.text}</Notice>}
  </Shell>;
}

const durations = [['','How long have you used it?'],['less_than_day','Less than a day'],['1_7_days','1–7 days'],['over_1_week','More than a week'],['over_1_month','More than a month'],['over_3_months','More than 3 months'],['over_6_months','More than 6 months'],['over_1_year','More than a year'],['over_2_years','More than 2 years']];
const frequencies = [['','How often do/did you use it?'],['once','Only once'],['rarely','Rarely'],['monthly','A few times a month'],['weekly_1_2','1–2 times a week'],['weekly_3_6','3–6 times a week'],['daily','Daily'],['multiple_daily','More than once a day']];
const acquisition = [['','How did you get it?'],['bought_personally','Bought personally'],['gift','Gift from someone'],['free_sample','Free sample'],['brand_supplied','Brand supplied'],['content_exchange','Received in exchange for content/review'],['borrowed','Borrowed / shared access'],['other','Other']];

function Unmask({ go }: any) {
  const [summary,setSummary]=useState<any>(null);
  const [step,setStep]=useState(1);
  const [ownership,setOwnership]=useState<'owns_now'|'used_before'|''>('');
  const [photo,setPhoto]=useState<any>(null);
  const [identifying,setIdentifying]=useState(false);
  const [matches,setMatches]=useState<any[]>([]);
  const [guess,setGuess]=useState<any>(null);
  const [product,setProduct]=useState<any>(null);
  const [custom,setCustom]=useState('');
  const [customRows,setCustomRows]=useState<any[]>([]);
  const [context,setContext]=useState({duration:'',frequency:'',acquisition:'',usedFor:'',body:'',wouldRebuy:null as any});
  const [verified,setVerified]=useState(false);
  const [busy,setBusy]=useState('');
  const [notice,setNotice]=useState<any>(null);
  const [verificationIssue,setVerificationIssue]=useState(false);

  useEffect(()=>{getSummary().then(setSummary)},[]);
  useEffect(()=>{
    const canSearch=(ownership==='used_before'&&step===2)||(ownership==='owns_now'&&step===3);
    if(!canSearch || custom.trim().length<2){setCustomRows([]);return;}
    const t=setTimeout(()=>searchProducts(custom).then(setCustomRows).catch(()=>setCustomRows([])),350);
    return()=>clearTimeout(t);
  },[custom,step,ownership]);

  const chooseRelationship=(value:'owns_now'|'used_before')=>{
    setOwnership(value);
    setProduct(null);
    setPhoto(null);
    setGuess(null);
    setMatches([]);
    setCustom('');
    setVerified(false);
    setVerificationIssue(false);
    setNotice(null);
    setStep(2);
  };

  const takePhoto=async(file:File|null)=>{
    if(!file)return;
    setNotice(null);setIdentifying(true);setMatches([]);setProduct(null);setVerified(false);setVerificationIssue(false);
    try{
      const prepared=await imageToCompressedBase64(file);
      setPhoto(prepared);
      const result=await identifyProduct(prepared.imageBase64,prepared.mimeType);
      setGuess(result.guess);
      setMatches(result.matches||[]);
      if(!(result.matches||[]).length && result.guess?.name){
        setProduct({
          id:'',
          name:[result.guess?.brand,result.guess?.name,result.guess?.model].filter(Boolean).join(' ').trim(),
          brand:result.guess?.brand||'',
          category:result.guess?.category||'',
          image:null
        });
      }
      setStep(3);
    }catch(e:any){
      setNotice({tone:'error',text:e.message||'We could not identify that photo. You can still enter the product name yourself.'});
      setStep(3);
    }finally{setIdentifying(false)}
  };

  const useGuess=()=>setProduct({
    id:'',
    name:[guess?.brand,guess?.name,guess?.model].filter(Boolean).join(' ').trim()||custom,
    brand:guess?.brand||'',
    category:guess?.category||'',
    image:null
  });

  const choosePastProduct=(row:any)=>{
    setProduct(row);
    setCustom(row.name);
    setCustomRows([]);
    setNotice(null);
    setStep(4);
  };

  const useManualPastProduct=()=>{
    const name=custom.trim();
    if(name.length<2)return;
    setProduct({id:'',name,brand:'',category:'',image:null});
    setCustomRows([]);
    setNotice(null);
    setStep(4);
  };

  const continueCurrentProduct=()=>{
    if(!product)return;
    setNotice(null);
    setVerificationIssue(false);
    setStep(4);
  };

  const verifyAndContinue=async()=>{
    if(ownership==='used_before'){setStep(5);return;}
    if(!photo || !product){setNotice({tone:'error',text:'Take a fresh product photo and confirm the product first.'});return;}

    setBusy('verify');setNotice(null);setVerificationIssue(false);
    try{
      const out=await verifyOwnership({
        productId:product?.id,
        productName:product?.name,
        brand:product?.brand,
        category:product?.category,
        image:product?.image,
        imageBase64:photo.imageBase64,
        mimeType:photo.mimeType
      });

      if(out.status==='verified'){
        setVerified(true);
        setNotice({tone:'success',text:'Confirmed. This will be saved as a verified current-owner experience.'});
        setStep(5);
      }else{
        setVerificationIssue(true);
        setNotice({tone:'error',text:out.reason||out.tip||'The photo does not match the product closely enough yet.'});
      }
    }catch(e:any){
      setVerificationIssue(true);
      setNotice({tone:'error',text:e.message||'We could not confirm ownership from this photo.'});
    }finally{setBusy('')}
  };

  const save=async()=>{
    setBusy('save');setNotice(null);
    try{
      await submitExperience({
        productId:product?.id,
        productName:product?.name,
        brand:product?.brand,
        category:product?.category,
        ownershipStatus:ownership,
        usedDuration:context.duration,
        usageFrequency:context.frequency,
        acquisitionMethod:context.acquisition,
        usedFor:context.usedFor,
        body:context.body,
        wouldRebuy:context.wouldRebuy
      });
      setStep(6);
      setNotice({tone:'success',text:'You added something useful. This experience can become more valuable as you update it over time.'});
      const s=await getSummary();setSummary(s);
    }catch(e:any){setNotice({tone:'error',text:e.message})}
    finally{setBusy('')}
  };

  const reset=()=>{
    setStep(1);setOwnership('');setPhoto(null);setGuess(null);setMatches([]);setProduct(null);setCustom('');
    setContext({duration:'',frequency:'',acquisition:'',usedFor:'',body:'',wouldRebuy:null});
    setVerified(false);setVerificationIssue(false);setNotice(null);
  };

  const progress=ownership==='used_before'
    ? ({1:1,2:2,4:3,5:4,6:4} as any)[step] || 1
    : ({1:1,2:2,3:3,4:4,5:5,6:5} as any)[step] || 1;
  const total=ownership==='used_before'?4:5;

  return <Shell go={go} active="unmask" summary={summary}>
    <PageIntro
      kicker="UNMASK A PRODUCT"
      title={step===1?'First, how do you know the product?':step===2&&ownership==='owns_now'?'Show us the product you have.':step===2?'Find the product you used.':'Let’s build your experience.'}
      body={step===1?'This decides the right path. Current owners prove possession with a fresh photo. Past users can simply find or enter the product they used.':ownership==='owns_now'?'We’ll identify the item from your photo, then you confirm the closest match.':'Search for the product, choose a match, or enter the name yourself.'}
    />

    {step<6&&<div className="flow-progress"><span>Step {progress} of {total}</span><div><i style={{width:(progress/total*100)+'%'}}/></div></div>}

    {step===1&&<section className="relationship-stage">
      <button onClick={()=>chooseRelationship('owns_now')}>
        <span className="relationship-icon"><FA name="box-open"/></span>
        <div><b>I have the product with me</b><small>You’ll take a fresh photo so we can identify it and confirm you currently have it.</small></div>
        <FA name="arrow-right"/>
      </button>
      <button onClick={()=>chooseRelationship('used_before')}>
        <span className="relationship-icon"><FA name="clock-rotate-left"/></span>
        <div><b>I used this product before</b><small>No live photo needed. Search for the product or enter its name manually.</small></div>
        <FA name="arrow-right"/>
      </button>
    </section>}

    {step===2&&ownership==='owns_now'&&<section className="camera-first">
      <div className="camera-orbit"><FA name="camera"/></div>
      <h2>Take a fresh photo.</h2>
      <p>Use the actual product in front of you. We’ll use the photo to identify it and confirm current possession.</p>
      <label className="camera-cta"><FA name="camera"/> {identifying?'Looking at the product…':'Take product photo'}<input type="file" accept="image/*" capture="environment" onChange={e=>takePhoto(e.target.files?.[0]||null)}/></label>
      <button className="text-btn back-link" onClick={()=>setStep(1)}><FA name="arrow-left"/> Change answer</button>
    </section>}

    {step===2&&ownership==='used_before'&&<section className="identify-stage">
      <div className="identify-copy"><span className="eyebrow">FIND YOUR PRODUCT</span><h2>What did you use?</h2><p>Search for it. If it doesn’t appear, enter the name yourself and continue.</p></div>
      <div className="custom-search">
        <input value={custom} onChange={e=>{setCustom(e.target.value);setProduct(null)}} placeholder="Type the product name…" autoFocus/>
        {!!customRows.length&&<div className="custom-results">{customRows.map(r=><button key={(r.id||'')+r.name} onClick={()=>choosePastProduct(r)}><b>{r.name}</b><small>{[r.brand,r.category].filter(Boolean).join(' · ')}</small></button>)}</div>}
      </div>
      <button className="btn solid full" disabled={custom.trim().length<2} onClick={useManualPastProduct}>Use “{custom.trim()||'this name'}” <FA name="arrow-right"/></button>
      <button className="text-btn back-link" onClick={()=>setStep(1)}><FA name="arrow-left"/> Change answer</button>
    </section>}

    {step===3&&ownership==='owns_now'&&<section className="identify-stage">
      {photo?.preview&&<img className="photo-preview" src={photo.preview} alt="Product you photographed"/>}
      <div className="identify-copy"><span className="eyebrow">CONFIRM THE PRODUCT</span><h2>Which one is it?</h2><p>Choose the closest match. If none is right, enter the product name yourself.</p></div>
      <div className="match-list">
        {matches.map(r=><button key={(r.id||'')+r.name} className={product?.name===r.name?'selected':''} onClick={()=>setProduct(r)}>{r.image?<img src={r.image} alt=""/>:<span className="match-icon"><FA name="box"/></span>}<div><b>{r.name}</b><small>{[r.brand,r.category].filter(Boolean).join(' · ')}</small></div><FA name="circle-check"/></button>)}
        {!matches.length&&guess?.name&&<button className={product?'selected':''} onClick={useGuess}><span className="match-icon"><FA name="wand-magic-sparkles"/></span><div><b>{[guess.brand,guess.name,guess.model].filter(Boolean).join(' ')}</b><small>{guess.category}</small></div><FA name="circle-check"/></button>}
      </div>
      <div className="custom-search">
        <input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Not listed? Enter the product name…"/>
        {!!customRows.length&&<div className="custom-results">{customRows.map(r=><button key={(r.id||'')+r.name} onClick={()=>{setProduct(r);setCustom(r.name);setCustomRows([])}}><b>{r.name}</b><small>{[r.brand,r.category].filter(Boolean).join(' · ')}</small></button>)}</div>}
      </div>
      {custom.trim().length>=2&&!product&&<button className="btn ghost full" onClick={()=>setProduct({id:'',name:custom.trim(),brand:guess?.brand||'',category:guess?.category||'',image:null})}>Use this product name</button>}
      <button className="btn solid full" disabled={!product} onClick={continueCurrentProduct}>That’s the product <FA name="arrow-right"/></button>
      <button className="text-btn back-link" onClick={()=>setStep(2)}><FA name="camera"/> Retake photo</button>
    </section>}

    {step===4&&<section className="story-card">
      <span className="eyebrow">YOUR EXPERIENCE</span>
      <h2>{product?.name||'Your product'}</h2>
      <p className="product-context-line">{ownership==='owns_now'?'Current owner — your photo will be checked before this is marked verified.':'Past user — this will be clearly labelled as a past-user experience.'}</p>
      <Select icon="clock" value={context.duration} onChange={(v:any)=>setContext({...context,duration:v})}>{durations.map(([v,l])=><option value={v} key={v}>{l}</option>)}</Select>
      <Select icon="repeat" value={context.frequency} onChange={(v:any)=>setContext({...context,frequency:v})}>{frequencies.map(([v,l])=><option value={v} key={v}>{l}</option>)}</Select>
      <Select icon="basket-shopping" value={context.acquisition} onChange={(v:any)=>setContext({...context,acquisition:v})}>{acquisition.map(([v,l])=><option value={v} key={v}>{l}</option>)}</Select>
      <button className="btn solid full" disabled={!context.duration||!context.frequency||!context.acquisition||busy==='verify'} onClick={verifyAndContinue}>{busy==='verify'?'Confirming your photo…':ownership==='owns_now'?'Confirm possession & continue':'Continue'} <FA name="arrow-right"/></button>
      {notice&&<Notice tone={notice.tone}>{notice.text}</Notice>}
      {verificationIssue&&ownership==='owns_now'&&<div className="verification-actions">
        <button className="btn ghost" onClick={()=>{setNotice(null);setVerificationIssue(false);setStep(3)}}><FA name="pen"/> Change product</button>
        <button className="btn ghost" onClick={()=>{setNotice(null);setVerificationIssue(false);setStep(2)}}><FA name="camera"/> Retake photo</button>
      </div>}
    </section>}

    {step===5&&<section className="story-card">
      <span className="eyebrow">WHAT WAS IT REALLY LIKE?</span><h2>Tell the part another buyer needs to hear.</h2>
      {ownership==='owns_now'&&verified&&<div className="verified-strip"><FA name="circle-check"/><span>Current possession confirmed</span></div>}
      <Field icon="bullseye" value={context.usedFor} onChange={(v:any)=>setContext({...context,usedFor:v})} placeholder="What did you use it for?" />
      <textarea className="big-story" value={context.body} onChange={e=>setContext({...context,body:e.target.value})} placeholder="What changed? When did you notice it? What worked, failed, surprised you, or made you stop?" />
      <div className="rebuy"><span>Would you buy or use it again?</span><div><button className={context.wouldRebuy===true?'selected':''} onClick={()=>setContext({...context,wouldRebuy:true})}>Yes</button><button className={context.wouldRebuy===false?'selected':''} onClick={()=>setContext({...context,wouldRebuy:false})}>No</button></div></div>
      <button className="btn solid full" disabled={context.body.trim().length<8||busy==='save'} onClick={save}>{busy==='save'?'Saving…':'Add my experience'} <FA name="arrow-right"/></button>
    </section>}

    {step===6&&<section className="celebrate"><FA name="circle-check"/><h2>You left something useful behind.</h2><p>Your experience is now part of what future buyers can learn from. If your experience changes later, you can add another update.</p><button className="btn solid" onClick={reset}>Unmask another product</button></section>}
    {notice&&step!==4&&<Notice tone={notice.tone}>{notice.text}</Notice>}
  </Shell>;
}

function Rewards({ go }: any) {
  const [summary,setSummary]=useState<any>(null);
  const [rules,setRules]=useState<any[]>([]);
  useEffect(()=>{Promise.all([getSummary(),rewardRules()]).then(([s,r])=>{setSummary(s);setRules(r)})},[]);
  return <Shell go={go} active="rewards" summary={summary}><PageIntro kicker="UNMASK COINS" title="A thank-you for useful contribution." body="Coins reward helpful participation. They never make a review more trusted, and they are never tied to saying something positive." /><section className="reward-balance"><div><span>Your balance</span><strong>{summary?.coins||0}</strong><small>Unmask Coins</small></div><FA name="coins"/></section><section className="reward-rules"><h2>Ways to earn right now</h2>{rules.filter(r=>['qualified_referral','follow_x','follow_tiktok'].includes(r.key)).map(r=><article key={r.key}><span><FA name="circle-check"/></span><div><b>{r.description}</b><small>+{r.coin_amount} Coins when completed</small></div></article>)}</section><section className="reward-rules"><h2>Experience rewards come later.</h2><p>Taking a photo or posting lots of short reviews does not automatically earn Coins. Useful updates can qualify as the experience becomes richer over time.</p></section></Shell>;
}

function PageIntro({ kicker,title,body }:any){return <section className="page-intro"><span className="eyebrow">{kicker}</span><h1>{title}</h1><p>{body}</p></section>}
function Field({icon,type='text',value,onChange,placeholder,required=false}:any){return <label className="field"><FA name={icon}/><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required}/></label>}
function Select({icon,value,onChange,children}:any){return <label className="field select"><FA name={icon}/><select value={value} onChange={e=>onChange(e.target.value)}>{children}</select><FA name="chevron-down" className="chev"/></label>}

export default App;
