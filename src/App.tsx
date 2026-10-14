import { useEffect, useMemo, useState } from 'react';
import { Country, State } from 'country-state-city';
import { identifyProduct, postJson, searchProducts } from './api';
import {
  chooseCategory,
  claimTask,
  getPulse,
  getSummary,
  listCategories,
  rewardRules,
  submitExperience,
  suggestProduct,
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
  const [view, setView] = useState(() => localStorage.getItem('unmask_view') || 'landing');

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
  if (view === 'rewards') return session ? <Rewards go={go} /> : <Auth go={go} loginFirst />;
  return <Landing go={go} session={session} />;
}

function Landing({ go, session }: any) {
  const [pulse, setPulse] = useState<any>({ unmaskers: 0, categories: [], products: [] });
  useEffect(() => { getPulse().then(setPulse).catch(() => undefined); }, []);

  return <main className="landing">
    <header className="site-head">
      <Brand />
      <nav><button onClick={() => go('trends')}>What’s moving</button><button onClick={() => go('rewards')}>Rewards</button></nav>
      <button className="btn solid" onClick={() => go(session ? 'dashboard' : 'auth')}>{session ? 'Dashboard' : 'Join Unmask'}</button>
    </header>

    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">KNOW BEFORE YOU BUY</span>
        <h1>Find out what a product is really like <em>before your money leaves your hand.</em></h1>
        <p>See what people actually experienced, what changed over time, and whether the product makes sense for someone like you.</p>
        <div className="hero-actions">
          <button className="btn solid" onClick={() => go(session ? 'dashboard' : 'auth')}>{session ? 'Open dashboard' : 'Become an Unmasker'} <FA name="arrow-right" /></button>
          <button className="btn ghost" onClick={() => go('trends')}>See what people want unmasked</button>
        </div>
      </div>
      <div className="hero-visual">
        <div className="reveal-card"><span>Before</span><b>Looks promising.</b><small>Ads · claims · packaging</small></div>
        <div className="reveal-line"><FA name="arrow-down" /></div>
        <div className="reveal-card after"><span>After Unmask</span><b>Now you know what to expect.</b><small>Real use · context · time</small></div>
      </div>
    </section>

    <section className="pulse-section">
      <div className="section-head"><div><span className="eyebrow">THE MOVEMENT IS STARTING</span><h2>People are already shaping what comes first.</h2></div><button className="text-btn" onClick={() => go('trends')}>See everything <FA name="arrow-right" /></button></div>
      <div className="pulse-cards">
        <RankCard title="Categories people want first" rows={pulse.categories?.slice(0,3)} label="name" count="votes" />
        <RankCard title="Products people want covered" rows={pulse.products?.slice(0,3)} label="product_name" count="suggestions" />
      </div>
    </section>
  </main>;
}

function Shell({ children, go, active, summary }: any) {
  const nav = [
    ['dashboard','Home','house'],
    ['trends','Trends','chart-simple'],
    ['suggest','Suggest','lightbulb'],
    ['unmask','Unmask','camera'],
    ['rewards','Rewards','gift']
  ];
  return <main className="app-shell">
    <header className="app-head"><Brand /><div className="head-right"><span className="coin-pill"><FA name="coins" /> {summary?.coins || 0}</span><span className="avatar">{summary?.displayName?.[0]?.toUpperCase() || 'U'}</span></div></header>
    <div className="app-body">{children}</div>
    <nav className="bottom-nav">{nav.map(([v,label,icon]) => <button key={v} className={active === v ? 'active' : ''} onClick={() => go(v)}><FA name={icon} /><span>{label}</span></button>)}</nav>
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
      <div className="auth-copy"><span className="eyebrow">{mode === 'signup' ? 'JOIN THE BUILD' : 'WELCOME BACK'}</span><h1>{mode === 'signup' ? 'Create your Unmask account.' : 'Pick up where you left off.'}</h1><p>{mode === 'signup' ? 'You’ll help decide what we investigate first, share what products are really like, and earn Coins for useful contribution.' : 'Your votes, Coins and product history are waiting for you.'}</p></div>
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

function Dashboard({ go }: any) {
  const [summary, setSummary] = useState<any>(null);
  const [pulse, setPulse] = useState<any>({ categories:[],products:[] });
  const [categories, setCategories] = useState<any[]>([]);
  const [notice, setNotice] = useState<any>(null);
  const [clickedTask, setClickedTask] = useState<string | null>(null);

  const refresh = async () => {
    const [s,p,c] = await Promise.all([getSummary(),getPulse(),listCategories()]);
    setSummary(s); setPulse(p); setCategories(c);
  };
  useEffect(() => { refresh().catch(()=>undefined); }, []);

  const pickCategory = async (id:string) => {
    try { await chooseCategory(id); setNotice({tone:'success',text:'Your choice is in. You’ve added your voice to what Unmask builds first.'}); await refresh(); }
    catch(err:any){ setNotice({tone:'error',text:err.message}); }
  };

  const social = async (task:any) => {
    if (!clickedTask || clickedTask !== task.key) {
      window.open(task.url, '_blank', 'noopener,noreferrer');
      setClickedTask(task.key);
      return;
    }
    try { await claimTask(task.key); setNotice({tone:'success',text:'Nice. Your task is marked complete and your Coins have been added.'}); setClickedTask(null); await refresh(); }
    catch(err:any){ setNotice({tone:'error',text:err.message}); }
  };

  const invite = async () => {
    if (!summary?.referralCode) return;
    const link = window.location.origin + '?ref=' + summary.referralCode;
    try { await navigator.clipboard.writeText(link); setNotice({tone:'success',text:'Your invite link is copied.'}); }
    catch { window.prompt('Copy your invite link', link); }
  };

  return <Shell go={go} active="dashboard" summary={summary}>
    <section className="dash-hero">
      <div><span className="eyebrow">WELCOME BACK{summary?.displayName ? ', '+summary.displayName.toUpperCase() : ''}</span><h1>You’re helping decide <em>what gets unmasked first.</em></h1><p>See what’s leading, complete a few useful moves, and leave better information behind for the next buyer.</p></div>
      <div className="dash-coin"><span>Your Coins</span><strong>{summary?.coins || 0}</strong><small>earned from real contribution</small></div>
    </section>

    <section className="top-grid">
      <RankCard title="Top categories" rows={pulse.categories?.slice(0,3)} label="name" count="votes" />
      <RankCard title="Top products" rows={pulse.products?.slice(0,3)} label="product_name" count="suggestions" />
    </section>

    <section className="task-section">
      <div className="section-head compact"><div><span className="eyebrow">YOUR BUILD LIST</span><h2>Small moves that help Unmask grow.</h2></div><span className="progress-pill">{summary?.tasks?.filter((t:any)=>t.completed).length || 0}/{summary?.tasks?.length || 3} done</span></div>
      <div className="task-list">
        {summary?.tasks?.map((task:any) => task.key === 'choose_category' ? <article className={'task-card '+(task.completed?'done':'')} key={task.key}>
          <div className="task-icon"><FA name="layer-group" /></div>
          <div><b>Help choose where Unmask starts.</b><span>Your vote helps decide which category we build first.</span>{summary?.voteName && <small>Your choice: {summary.voteName}</small>}</div>
          {task.completed ? <span className="done-mark"><FA name="check" /></span> : <div className="category-picks">{categories.slice(0,6).map(c=><button key={c.id} onClick={()=>pickCategory(c.id)}>{c.name}</button>)}</div>}
        </article> : <article className={'task-card '+(task.completed?'done':'')} key={task.key}>
          <div className="task-icon"><i className={'fa-brands fa-'+(task.key==='follow_x'?'x-twitter':'tiktok')} /></div>
          <div><b>{task.title}</b><span>{task.description}</span>{task.coin_amount > 0 && <small>+{task.coin_amount} Coins</small>}</div>
          {task.completed ? <span className="done-mark"><FA name="check" /></span> : <button className="btn tiny" onClick={()=>social(task)}>{clickedTask===task.key?'I followed':'Follow'} </button>}
        </article>)}
      </div>
    </section>

    <section className="quick-actions">
      <button onClick={()=>go('unmask')}><span><FA name="camera" /></span><div><b>Unmask something you use</b><small>Start with a photo.</small></div><FA name="chevron-right" /></button>
      <button onClick={()=>go('suggest')}><span><FA name="lightbulb" /></span><div><b>Suggest something to cover</b><small>Show us what buyers are curious about.</small></div><FA name="chevron-right" /></button>
      <button onClick={invite}><span><FA name="user-plus" /></span><div><b>Invite another Unmasker</b><small>Qualified referrals can earn Coins.</small></div><FA name="chevron-right" /></button>
    </section>
    {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
  </Shell>;
}

function RankCard({ title, rows=[], label, count }: any) {
  return <article className="rank-card"><div className="rank-head"><h3>{title}</h3><FA name="arrow-trend-up" /></div>{!rows.length ? <Empty title="Nothing here yet" body="The first real activity will appear here." /> : rows.map((r:any,i:number)=><div className="rank-row" key={(r.id||r[label])+i}><span>{i+1}</span><div><b>{r[label]}</b>{r.brand&&<small>{r.brand}</small>}</div><strong>{r[count] || 0}</strong></div>)}</article>;
}

function Trends({ go, session }: any) {
  const [pulse,setPulse]=useState<any>({categories:[],products:[],experiences:[]});
  const [summary,setSummary]=useState<any>(null);
  useEffect(()=>{getPulse().then(setPulse).catch(()=>undefined); if(session)getSummary().then(setSummary).catch(()=>undefined)},[session]);
  const content = <><PageIntro kicker="WHAT PEOPLE WANT NEXT" title="See what’s moving." body="Every vote, suggestion and shared experience here comes from real Unmask activity." /><section className="trend-grid"><RankCard title="All category votes" rows={pulse.categories} label="name" count="votes" /><RankCard title="Products people want covered" rows={pulse.products} label="product_name" count="suggestions" /></section><section className="experience-list"><h2>Products people have shared experience with</h2>{!pulse.experiences?.length?<Empty title="No experiences yet" body="The first saved product experiences will appear here." />:pulse.experiences.map((x:any)=><article key={x.key}><div><b>{x.product_name}</b><span>{x.brand || x.category || 'Product'}</span></div><strong>{x.experiences} {x.experiences===1?'experience':'experiences'}</strong></article>)}</section></>;
  return session ? <Shell go={go} active="trends" summary={summary}>{content}</Shell> : <main className="landing"><header className="site-head"><Brand/><button className="btn solid" onClick={()=>go('auth')}>Join / Log in</button></header>{content}</main>;
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
    if(step!==2 || ownership!=='used_before' || custom.trim().length<2){setCustomRows([]);return;}
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
