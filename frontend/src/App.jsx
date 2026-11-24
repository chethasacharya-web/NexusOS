import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { api } from './api';
import {
  LayoutDashboard,
  BriefcaseBusiness,
  CheckSquare,
  LifeBuoy,
  Wallet,
  FolderOpen,
  LogOut,
  Plus,
  Menu,
  X,
  ArrowUpRight,
  Upload,
  Trash2
} from 'lucide-react';

const nav = [
  ['Dashboard','dashboard',LayoutDashboard],['Workspace','projects',BriefcaseBusiness],
  ['Tasks','tasks',CheckSquare],['CloudVault','files',FolderOpen],
  ['SupportDesk','tickets',LifeBuoy],['Finance','transactions',Wallet]
];

function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name:'', email:'', password:'', organization:'' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = e => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try { mode === 'login' ? await login(form.email, form.password) : await register(form); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="auth-shell">
    <div className="auth-card">
      <div className="brand-mark">N</div><p className="eyebrow">BUSINESS OPERATIONS PLATFORM</p>
      <h1>{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h1>
      <p className="muted">{mode === 'login' ? 'Sign in to continue to NexusOS.' : 'Set up your company workspace and admin account.'}</p>
      <form onSubmit={submit}>
        {mode === 'register' && <><label>Your name<input name="name" value={form.name} onChange={change} required placeholder="Alex Morgan" /></label><label>Company name<input name="organization" value={form.organization} onChange={change} required placeholder="Acme Technologies" /></label></>}
        <label>Work email<input name="email" type="email" value={form.email} onChange={change} required placeholder="you@company.com" /></label>
        <label>Password<input name="password" type="password" value={form.password} onChange={change} required minLength="8" placeholder="At least 8 characters" /></label>
        {error && <div className="error">{error}</div>}
        <button className="primary full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create workspace'}</button>
      </form>
      <p className="switch">{mode === 'login' ? "New to NexusOS?" : 'Already have an account?'} <button onClick={() => {setMode(mode === 'login' ? 'register' : 'login');setError('');}}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
    </div>
    <div className="auth-side"><div><span className="pill">ONE WORKSPACE. LESS WORK.</span><h2>Bring your team's work into focus.</h2><p>Projects, files, customer support and company finances — connected in one place.</p></div><div className="side-foot">NEXUSOS · WORK BETTER TOGETHER</div></div>
  </main>;
}

function AppShell() {
  const { user, logout } = useAuth();
  const [page,setPage] = useState('dashboard');
  const [mobileOpen,setMobileOpen] = useState(false);
  const [refresh,setRefresh] = useState(0);
  const [data,setData] = useState({ projects:[], tasks:[], tickets:[], transactions:[], files:[], summary:null });
  const [error,setError] = useState('');
  const [showForm,setShowForm] = useState(false);

  async function load() {
    try {
      const [summary,projects,tasks,tickets,transactions,files] = await Promise.all([
        api('/dashboard'),api('/projects'),api('/tasks'),api('/tickets'),api('/transactions'),api('/files')
      ]);
      setData({summary,projects,tasks,tickets,transactions,files}); setError('');
    } catch(e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [refresh]);
  const current = nav.find(n=>n[1]===page) || nav[0];
  async function createItem(form) {
    const route = page === 'dashboard' ? 'projects' : page;
    await api(`/${route}`,{method:'POST',body:JSON.stringify(form)});
    setShowForm(false);setRefresh(v=>v+1);
  }
  async function updateStatus(route,id,status) {
    await api(`/${route}/${id}`,{method:'PATCH',body:JSON.stringify({status})});setRefresh(v=>v+1);
  }

  return <div className="app">
    <aside className={`sidebar ${mobileOpen?'open':''}`}>
      <div className="logo-row"><div className="brand-mark small">N</div><span>Nexus<span className="logo-light">OS</span></span><button className="close-nav" onClick={()=>setMobileOpen(false)}><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <div className="org-chip"><div className="org-avatar">{(user?.name||'N').slice(0,1).toUpperCase()}</div><div><strong>{user?.name}</strong><small>Administrator</small></div><span className="online-dot"/></div>
      <div className="nav-label">OVERVIEW</div>
      {nav.map(([label,key,Icon])=><button key={key} className={`nav-item ${page===key?'active':''}`} onClick={()=>{setPage(key);setMobileOpen(false);setShowForm(false);}}><Icon size={18}/><span>{label}</span>{key==='tickets'&&data.summary?.openTickets>0&&<i>{data.summary.openTickets}</i>}</button>)}
      <div className="sidebar-bottom"><div className="help-box"><strong>Need a hand?</strong><p>Your workspace, all in one place.</p></div><button className="nav-item logout" onClick={logout}><LogOut size={18}/>Sign out</button></div>
    </aside>

    <main className="main">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMobileOpen(true)}><Menu/></button><div className="crumb">Workspace <span>/</span> <strong>{current[0]}</strong></div><div className="top-user"><div className="avatar">{(user?.name||'U').slice(0,1).toUpperCase()}</div><span>{user?.name}</span></div></header>
      <div className="content">
        <div className="page-heading"><div><p className="eyebrow">NEXUSOS WORKSPACE</p><h1>{page==='dashboard'?'Good to see you, '+(user?.name?.split(' ')[0]||'there'):current[0]}</h1><p className="muted">{page==='dashboard'?'Here is what is happening across your business today.':pageDescription(page)}</p></div>
          {page!=='dashboard'&&page!=='files'&&<button className="primary" onClick={()=>setShowForm(!showForm)}><Plus size={17}/> Add {page==='projects'?'project':page==='tasks'?'task':page==='tickets'?'ticket':'transaction'}</button>}
        </div>
        {error&&<div className="error banner">{error}. Check that the backend and database are running.</div>}
        {showForm&&<CreateForm page={page} projects={data.projects} onSubmit={createItem} onCancel={()=>setShowForm(false)}/>}
        {page==='dashboard'&&<Dashboard data={data}/>}
        {page==='projects'&&<Projects projects={data.projects}/>}
        {page==='tasks'&&<Tasks tasks={data.tasks} onUpdate={updateStatus}/>}
        {page==='files'&&<Files
  files={data.files}
  onRefresh={() => setRefresh(v => v + 1)}
/>}
        {page==='tickets'&&<Tickets tickets={data.tickets} onUpdate={updateStatus}/>}
        {page==='transactions'&&<Finance transactions={data.transactions}/>}
        <footer>© 2026 NexusOS <span>Business operations, connected.</span></footer>
      </div>
    </main>
  </div>;
}

function pageDescription(page) {
  return ({projects:'Plan initiatives and keep every project moving.',tasks:'See what needs to be done and track progress.',files:'A central view of your organization’s shared files.',tickets:'Keep customer requests organized and moving.',transactions:'Track income and expenses for your workspace.'})[page]||'Manage your business in one place.';
}

function Dashboard({data}) {
  const s=data.summary||{};
  const cards=[['Active projects',s.projects??'—','Across your workspace'],['Total tasks',s.tasks?.total??'—',`${s.tasks?.completed??0} completed`],['Open tickets',s.openTickets??'—','Need attention'],['Total expenses',`₹${Number(s.finance?.expense||0).toLocaleString('en-IN')}`,'Recorded to date']];
  return <>
    <section className="welcome-banner"><div><span className="pill light-pill">YOUR BUSINESS AT A GLANCE</span><h2>Everything connected.<br/>Everyone moving forward.</h2><p>One workspace for projects, people and operations.</p></div><div className="banner-art"><div className="art-card"><span>TEAM MOMENTUM</span><strong>{s.tasks?.total?Math.round((s.tasks.completed/s.tasks.total)*100):0}%</strong><small>Tasks completed</small><div className="progress"><i style={{width:`${s.tasks?.total?Math.round((s.tasks.completed/s.tasks.total)*100):0}%`}}/></div></div></div></section>
    <div className="stat-grid">{cards.map(([label,value,note],i)=><div className="stat-card" key={label}><div className="stat-top"><span>{label}</span><ArrowUpRight size={17}/></div><strong>{value}</strong><small>{note}</small></div>)}</div>
    <div className="section-title"><div><h2>Workspace overview</h2><p className="muted">A quick look at your team's activity.</p></div></div>
    <div className="overview-grid"><div className="panel"><h3>Recent projects</h3>{data.projects.length?data.projects.slice(0,5).map(p=><div className="list-row" key={p.id}><div className="project-icon">{p.name.slice(0,1).toUpperCase()}</div><div className="row-main"><strong>{p.name}</strong><small>{p.description||'No description added'}</small></div><span className="status">{p.status}</span></div>):<Empty text="No projects yet. Create your first project from Workspace."/>}</div>
    <div className="panel"><h3>Support activity</h3>{data.tickets.length?data.tickets.slice(0,5).map(t=><div className="list-row" key={t.id}><div className="ticket-icon">#</div><div className="row-main"><strong>{t.subject}</strong><small>{t.customer||'Customer'} · {t.priority}</small></div><span className="status">{t.status}</span></div>):<Empty text="No support tickets yet."/>}</div></div>
  </>;
}

function Projects({projects}) { return <div className="card-grid">{projects.map(p=><div className="panel project-card" key={p.id}><div className="project-icon large">{p.name.slice(0,1).toUpperCase()}</div><span className="status">{p.status}</span><h3>{p.name}</h3><p className="muted">{p.description||'No description provided.'}</p><small>Created {new Date(p.created_at).toLocaleDateString()}</small></div>)}{!projects.length&&<Empty text="Your projects will appear here once you create one."/>}</div>; }

function Tasks({tasks,onUpdate}) { return <div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>TASK</th><th>ASSIGNEE</th><th>STATUS</th><th>DUE DATE</th></tr></thead><tbody>{tasks.map(t=><tr key={t.id}><td><strong>{t.title}</strong></td><td>{t.assignee||'Unassigned'}</td><td><select value={t.status} onChange={e=>onUpdate('tasks',t.id,e.target.value)}><option>Todo</option><option>In Progress</option><option>Done</option></select></td><td>{t.due_date?new Date(t.due_date).toLocaleDateString():'—'}</td></tr>)}</tbody></table>{!tasks.length&&<Empty text="No tasks yet. Add a task to start tracking work."/>}</div></div>; }

function Files({ files, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/plain'
  ];

  async function handleUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError('');
    setMessage('');

    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF, JPG, PNG and TXT files are supported.');
      event.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be below 10 MB.');
      event.target.value = '';
      return;
    }

    try {
      setUploading(true);
      setMessage('Preparing secure upload...');

      // Step 1: Request a secure upload URL from backend
      const uploadData = await api('/files/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          sizeBytes: file.size
        })
      });

      // Step 2: Upload file directly to AWS S3
      setMessage('Uploading to AWS S3...');

      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error('AWS S3 upload failed. Check bucket CORS and IAM permissions.');
      }

      // Step 3: Confirm upload and save database record
      setMessage('Saving file information...');

      await api('/files/complete', {
        method: 'POST',
        body: JSON.stringify({
          key: uploadData.key,
          fileName: file.name
        })
      });

      setMessage('File uploaded successfully!');
      onRefresh();

    } catch (err) {
      setError(err.message || 'Upload failed.');
      setMessage('');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleDelete(file) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${file.name}"?`
    );

    if (!confirmed) return;

    try {
      setError('');
      setMessage('');
      setDeleting(file.id);

      await api(`/files/${file.id}`, {
        method: 'DELETE'
      });

      setMessage('File deleted successfully.');
      onRefresh();

    } catch (err) {
      setError(err.message || 'Unable to delete file.');
    } finally {
      setDeleting(null);
    }
  }

  function formatSize(bytes) {
    if (!bytes) return '0 KB';

    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return (
    <div className="panel">
      <div className="section-title">
        <div>
          <h3>CloudVault</h3>
          <p className="muted">
            Secure organization file storage powered by AWS S3.
          </p>
        </div>

        <label className={`upload-button ${uploading ? 'disabled' : ''}`}>
          <Upload size={16} />
          {uploading ? 'Uploading...' : 'Upload File'}

          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.txt"
            onChange={handleUpload}
            disabled={uploading}
            hidden
          />
        </label>
      </div>

      {message && (
        <div className="cloud-message">
          {message}
        </div>
      )}

      {error && (
        <div className="error cloud-error">
          {error}
        </div>
      )}

      <div className="cloud-info">
        <span>Storage: AWS S3</span>
        <span>Maximum size: 10 MB</span>
        <span>Supported: PDF, JPG, PNG, TXT</span>
      </div>

      <div className="cloud-file-list">
        {files.map(file => (
          <div className="list-row cloud-file" key={file.id}>
            <div className="file-icon">
              <FolderOpen size={19} />
            </div>

            <div className="row-main">
              <strong>{file.name}</strong>
              <small>
                {file.content_type || 'File'} · {formatSize(file.size_bytes)}
              </small>
            </div>

            <span className="muted cloud-date">
              {new Date(file.created_at).toLocaleDateString()}
            </span>

            <button
              className="delete-file-button"
              onClick={() => handleDelete(file)}
              disabled={deleting === file.id}
              title="Delete file"
            >
              <Trash2 size={17} />
              {deleting === file.id ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        ))}

        {!files.length && (
          <Empty text="No files uploaded yet. Select Upload File to add your first document." />
        )}
      </div>
    </div>
  );
}

function Tickets({tickets,onUpdate}) { return <div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>SUBJECT</th><th>CUSTOMER</th><th>PRIORITY</th><th>STATUS</th></tr></thead><tbody>{tickets.map(t=><tr key={t.id}><td><strong>{t.subject}</strong></td><td>{t.customer||'—'}</td><td><span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span></td><td><select value={t.status} onChange={e=>onUpdate('tickets',t.id,e.target.value)}><option>Open</option><option>In Progress</option><option>Resolved</option></select></td></tr>)}</tbody></table>{!tickets.length&&<Empty text="No tickets yet. Add a customer request to track it."/>}</div></div>; }

function Finance({transactions}) { const total=transactions.reduce((a,t)=>a+(t.type==='Income'?Number(t.amount):-Number(t.amount)),0); return <><div className="stat-grid finance-stats"><div className="stat-card"><span>Net balance</span><strong>₹{total.toLocaleString('en-IN')}</strong><small>Based on recorded transactions</small></div><div className="stat-card"><span>Transactions</span><strong>{transactions.length}</strong><small>All recorded entries</small></div></div><div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>DESCRIPTION</th><th>CATEGORY</th><th>TYPE</th><th>AMOUNT</th><th>DATE</th></tr></thead><tbody>{transactions.map(t=><tr key={t.id}><td><strong>{t.title}</strong></td><td>{t.category}</td><td>{t.type}</td><td className={t.type==='Income'?'positive':'negative'}>{t.type==='Income'?'+':'−'}₹{Number(t.amount).toLocaleString('en-IN')}</td><td>{new Date(t.transaction_date).toLocaleDateString()}</td></tr>)}</tbody></table>{!transactions.length&&<Empty text="No transactions yet. Add an income or expense entry."/>}</div></div></>; }

function CreateForm({page,projects,onSubmit,onCancel}) {
  const [form,setForm]=useState({status:'Active',priority:'Medium',type:'Expense',category:'Operations'});
  const [error,setError]=useState('');
  const fields={
    projects:[['name','Project name','text'],['description','Description','text'],['due_date','Due date','date']],
    tasks:[['title','Task title','text'],['assignee','Assignee','text'],['due_date','Due date','date']],
    tickets:[['subject','Ticket subject','text'],['customer','Customer name','text']],
    transactions:[['title','Description','text'],['category','Category','text'],['amount','Amount (INR)','number'],['transaction_date','Date','date']]
  }[page]||[];
  async function submit(e) { e.preventDefault();try { await onSubmit(form); }catch(err){setError(err.message);} }
  return <form className="create-form" onSubmit={submit}><div className="form-head"><div><strong>New {page==='transactions'?'transaction':page.slice(0,-1)}</strong><small>Enter the details below.</small></div><button type="button" className="text-button" onClick={onCancel}>Cancel</button></div><div className="form-grid">
    {fields.map(([key,label,type])=><label key={key}>{label}<input required={['name','title','subject','amount'].includes(key)} type={type} min={type==='number'?'0':undefined} value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}
    {page==='projects'&&<label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Active</option><option>Completed</option><option>On Hold</option></select></label>}
    {page==='tasks'&&<><label>Project<select value={form.project_id||''} onChange={e=>setForm({...form,project_id:e.target.value||null})}><option value="">No project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Status<select value={form.status||'Todo'} onChange={e=>setForm({...form,status:e.target.value})}><option>Todo</option><option>In Progress</option><option>Done</option></select></label></>}
    {page==='tickets'&&<><label>Priority<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select></label><label>Status<select value={form.status||'Open'} onChange={e=>setForm({...form,status:e.target.value})}><option>Open</option><option>In Progress</option><option>Resolved</option></select></label></>}
    {page==='transactions'&&<><label>Type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Expense</option><option>Income</option></select></label></>}
  </div>{error&&<p className="error">{error}</p>}<button className="primary">Save</button></form>;
}

function Empty({text}) { return <div className="empty"><div className="empty-icon">✦</div><p>{text}</p></div>; }

export default function App() {
  const { user } = useAuth();
  return user ? <AppShell/> : <AuthScreen/>;
}
