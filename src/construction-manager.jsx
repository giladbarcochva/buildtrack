import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://rkjcrhywhoixdkqlfnko.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJramNyaHl3aG9peGRrcWxmbmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMzA2NzQsImV4cCI6MjA5NDYwNjY3NH0.yKZzdMCNOyWJClmip03QY617HX2IB-xKPKGUZtKT_Z0";
const hdrs = { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY };

async function dbGet(table) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&order=id.asc`, { headers: hdrs });
  const rows = await r.json();
  return rows.map(row => ({ ...row.data, _dbid: row.id }));
}
async function dbInsert(table, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST", headers: { ...hdrs, "Prefer": "return=representation" },
    body: JSON.stringify({ data })
  });
  const rows = await r.json();
  return { ...rows[0].data, _dbid: rows[0].id };
}
async function dbUpdate(table, dbid, data) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${dbid}`, {
    method: "PATCH", headers: hdrs, body: JSON.stringify({ data })
  });
}
async function dbDelete(table, dbid) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${dbid}`, {
    method: "DELETE", headers: hdrs
  });
}

const LOGO_URL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QDsRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAC5ADAAIAAAAUAAAApJAEAAIAAAAUAAAAuJAQAAIAAAAHAAAAzJARAAIAAAAHAAAA1JASAAIAAAAHAAAA3JKQAAIAAAAEMDAwAJKRAAIAAAAEMDAwAJKSAAIAAAAEMDAwAKABAAMAAAABAAEAAKACAAQAAAABAAAGAKADAAQAAAABAAAEAAAAAAAyMDI2OjAyOjAzIDIzOjUzOjAzADIwMjY6MDI6MDMgMjM6NTM6MDMAKzAyOjAwAAArMDI6MDAAACswMjowMAAA/+0AfFBob3Rvc2hvcCAzLjAAOEJJTQQEAAAAAABEHAFaAAMbJUccAgAAAgACHAI/AAYyMzUzMDMcAj4ACDIwMjYwMjAzHAI3AAgyMDI2MDIwMxwCPAALMjM1MzAzKzAyMDA4QklNBCUAAAAAABBICnNdASpPBV2C7YqHLlau/8IAEQgEAAYAAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAMCBAEFAAYHCAkKC//EAMMQAAEDAwIEAwQGBAcGBAgGcwECAAMRBBIhBTETIhAGQVEyFGFxIweBIJFCFaFSM7EkYjAWwXLRQ5I0ggjhU0AlYxc18JNzolBEsoPxJlQ2ZJR0wmDShKMYcOInRTdls1V1pJXDhfLTRnaA40dWZrQJChkaKCkqODk6SElKV1hZWmdoaWp3eHl6hoeIiYqQlpeYmZqgpaanqKmqsLW2t7i5usDExcbHyMnK0NTV1tfY2drg5OXm5+jp6vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAQIAAwQFBgcICQoL/8QAwxEAAgIBAwMDAgMFAgUCBASHAQACEQMQEiEEIDFBEwUwIjJRFEAGMyNhQhVxUjSBUCSRoUOxFgdiNVPw0SVgwUThcvEXgmM2cCZFVJInotIICQoYGRooKSo3ODk6RkdISUpVVldYWVpkZWZnaGlqc3R1dnd4eXqAg4SFhoeIiYqQk5SVlpeYmZqgo6SlpqeoqaqwsrO0tba3uLm6wMLDxMXGx8jJytDT1NXW19jZ2uDi4+Tl5ufo6ery8/T19vf4+fr/2wBDAAICAgICAgMCAgMFAwMDBQYFBQUFBggGBgYGBggKCAgICAgICgoKCgoKCgoMDAwMDAwODg4ODg8PDw8PDw8PDw//2wBDAQIDAwQEBAcEBAcQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/2gAMAwEAAhEDEQAAAfvzbVttW21bbQ==";

const STATUS_COLORS = {
  "בביצוע": { bg:"#E8F5E9", text:"#2E7D32", dot:"#43A047" },
  "ממתין":  { bg:"#FFF8E1", text:"#F57F17", dot:"#FFB300" },
  "הושלם":  { bg:"#E3F2FD", text:"#1565C0", dot:"#1E88E5" },
  "מושהה":  { bg:"#FCE4EC", text:"#B71C1C", dot:"#E53935" },
};

const todayStr = () => new Date().toISOString().split("T")[0];
const fmtNum   = n => Number(n||0).toLocaleString("he-IL");

// ✅ ימים ייחודיים בפרויקט (לפי תאריך, לא לפי עובד)
function uniqueWorkDaysForProject(reports, projectId) {
  const dates = new Set(
    reports
      .filter(r => String(r.projectId) === String(projectId))
      .map(r => r.date)
  );
  return dates.size;
}

// ימי עבודה לפי עובד בפרויקט (לצורך שכר)
function workerDaysForProject(reports, projectId) {
  const map = {};
  reports.filter(r => String(r.projectId) === String(projectId))
    .forEach(r => { map[r.workerName] = (map[r.workerName] || 0) + 1; });
  return map;
}

// ✅ חישוב שכר לעובד: ימים כולל + לפי חודש
function calcWorkerPayroll(worker, reports) {
  const myReports = reports.filter(r => String(r.workerId) === String(worker.id));
  const rate = Number(worker.dailyRate || 0);

  // כל הימים
  const totalDays = myReports.length;
  const totalPay  = totalDays * rate;

  // לפי חודש
  const byMonth = {};
  myReports.forEach(r => {
    if (!r.date) return;
    const month = r.date.slice(0, 7); // "2024-03"
    if (!byMonth[month]) byMonth[month] = { days: 0, projects: new Set() };
    byMonth[month].days += 1;
    byMonth[month].projects.add(r.projectName || r.projectId);
  });

  const months = Object.entries(byMonth)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, v]) => ({
      month,
      label: new Date(month + "-01").toLocaleDateString("he-IL", { year:"numeric", month:"long" }),
      days: v.days,
      pay: v.days * rate,
      projects: [...v.projects].join(", "),
    }));

  return { totalDays, totalPay, months };
}

export default function App() {
  const [projects,  setProjects]  = useState([]);
  const [workers,   setWorkers]   = useState([]);
  const [reports,   setReports]   = useState([]);
  const [adminCode, setAdminCode] = useState("1234");
  const [adminConfigDbid, setAdminConfigDbid] = useState(null);
  const [loading,   setLoading]   = useState(true);

  const [screen,       setScreen]       = useState("home");
  const [codeInput,    setCodeInput]    = useState("");
  const [codeError,    setCodeError]    = useState(false);
  const [loggedWorker, setLoggedWorker] = useState(null);

  const [repDate,    setRepDate]    = useState(todayStr());
  const [repProject, setRepProject] = useState("");
  const [repNote,    setRepNote]    = useState("");
  const [repSent,    setRepSent]    = useState(false);

  const [mgTab,      setMgTab]      = useState("reports");
  const [detailId,   setDetailId]   = useState(null);
  const [newPM,      setNewPM]      = useState(false);
  const [newWM,      setNewWM]      = useState(false);
  const [editWM,     setEditWM]     = useState(false);
  const [editWorker, setEditWorker] = useState(null);
  const [assignM,    setAssignM]    = useState(false);
  const [assignPid,  setAssignPid]  = useState(null);
  const [newAdminCode, setNAC]      = useState("");
  const [payrollWorker, setPayrollWorker] = useState(null);

  const emptyProj = { name:"", status:"ממתין", progress:0, startDate:"", endDate:"", plannedDays:"", materialCost:"", totalCost:"", projectManager:"", plannedWorkers:"", highlights:"", phases:[], workers:[] };
  const [newProject, setNewProject] = useState(emptyProj);
  const [editProj,   setEditProj]   = useState(null);
  const [newWorker,  setNewWorker]  = useState({ name:"", code:"", role:"", dailyRate:"" });

  const detailProject = projects.find(p => String(p.id) === String(detailId)) || null;
  const assignProject = projects.find(p => String(p.id) === String(assignPid)) || null;

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, w, r] = await Promise.all([dbGet("projects"), dbGet("workers"), dbGet("reports")]);
      setProjects(p);
      const realWorkers = w.filter(x => !x._isConfig);
      setWorkers(realWorkers);
      setReports(r);
      const configRow = w.find(x => x._isConfig && x._adminCode);
      if (configRow) { setAdminCode(configRow._adminCode); setAdminConfigDbid(configRow._dbid); }
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const projReports = id => reports.filter(r => String(r.projectId) === String(id));
  const getWkrNames = (ids=[]) => ids.map(id => workers.find(w => String(w.id)===String(id))?.name).filter(Boolean).join(", ");

  const workerLogin = () => {
    const w = workers.find(w => w.code === codeInput.trim());
    if (w) { setLoggedWorker(w); setCodeInput(""); setCodeError(false); setScreen("worker"); setRepSent(false); setRepDate(todayStr()); setRepProject(""); setRepNote(""); }
    else setCodeError(true);
  };
  const managerLogin = () => {
    if (codeInput.trim() === adminCode) { setCodeInput(""); setCodeError(false); setScreen("mgr"); }
    else setCodeError(true);
  };

  const submitReport = async () => {
    if (!repProject) return;
    const proj = projects.find(p => String(p.id) === String(repProject));
    const newRep = { workerId: loggedWorker.id, workerName: loggedWorker.name, projectId: repProject, projectName: proj?.name || "", date: repDate, note: repNote, days: 1, id: Date.now() };
    const saved = await dbInsert("reports", newRep);
    setReports(prev => [...prev, saved]);
    const uniqueDays = uniqueWorkDaysForProject([...reports, saved], repProject);
    const proj2 = projects.find(p => String(p.id) === String(repProject));
    if (proj2) {
      const updated = { ...proj2, actualDays: uniqueDays };
      await dbUpdate("projects", proj2._dbid, updated);
      setProjects(prev => prev.map(p => String(p.id)===String(repProject) ? updated : p));
    }
    setRepSent(true);
  };

  const addProject = async () => {
    if (!newProject.name) return;
    const p = { ...newProject, id: Date.now(), progress: Number(newProject.progress)||0 };
    const saved = await dbInsert("projects", p);
    setProjects(prev => [...prev, saved]);
    setNewProject(emptyProj); setNewPM(false);
  };

  const addWorker = async () => {
    if (!newWorker.name || !newWorker.code) return;
    const w = { ...newWorker, id: Date.now() };
    const saved = await dbInsert("workers", w);
    setWorkers(prev => [...prev, saved]);
    setNewWorker({ name:"", code:"", role:"", dailyRate:"" }); setNewWM(false);
  };

  const saveEditWorker = async () => {
    if (!editWorker.name || !editWorker.code) return;
    await dbUpdate("workers", editWorker._dbid, editWorker);
    setWorkers(prev => prev.map(w => w._dbid===editWorker._dbid ? editWorker : w));
    setEditWM(false); setEditWorker(null);
  };

  const updateProjField = async (proj, changes) => {
    const updated = { ...proj, ...changes };
    await dbUpdate("projects", proj._dbid, updated);
    setProjects(prev => prev.map(p => p._dbid===proj._dbid ? updated : p));
    if (editProj && editProj._dbid===proj._dbid) setEditProj(updated);
  };

  const toggleAssign = async (wid) => {
    const proj = projects.find(p => String(p.id)===String(assignPid));
    if (!proj) return;
    const has = (proj.workers||[]).some(x => String(x)===String(wid));
    const newW = has ? (proj.workers||[]).filter(x=>String(x)!==String(wid)) : [...(proj.workers||[]), wid];
    await updateProjField(proj, { workers: newW });
  };

  const delReport = async (rep) => {
    await dbDelete("reports", rep._dbid);
    setReports(prev => prev.filter(r => r._dbid!==rep._dbid));
  };
  const delWorker = async (w) => {
    await dbDelete("workers", w._dbid);
    setWorkers(prev => prev.filter(x => x._dbid!==w._dbid));
  };
  const delProject = async (p) => {
    await dbDelete("projects", p._dbid);
    setProjects(prev => prev.filter(x => x._dbid!==p._dbid));
    setDetailId(null);
  };

  const saveAdminCode = async () => {
    if (!newAdminCode.trim()) return;
    const newCode = newAdminCode.trim();
    if (adminConfigDbid) {
      await dbUpdate("workers", adminConfigDbid, { _isConfig: true, _adminCode: newCode });
    } else {
      const saved = await dbInsert("workers", { _isConfig: true, _adminCode: newCode });
      setAdminConfigDbid(saved._dbid);
    }
    setAdminCode(newCode);
    setNAC("");
    alert("✅ קוד מנהל עודכן!");
  };

  const inp = { width:"100%", border:"1.5px solid #DDD", borderRadius:10, padding:"10px 14px", fontSize:15, fontFamily:"Heebo,sans-serif", boxSizing:"border-box", background:"#fff", outline:"none" };
  const OVL = { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 };
  const MOD = { background:"#fff", borderRadius:18, padding:28, width:"100%", maxWidth:460, direction:"rtl", maxHeight:"90vh", overflowY:"auto" };
  const btnY = { background:"#E8C547", color:"#1A1A2E", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"Heebo,sans-serif" };
  const btnD = { background:"#1A1A2E", color:"#E8C547", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"Heebo,sans-serif" };
  const btnG = { background:"#F0F0EC", color:"#555", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"Heebo,sans-serif" };
  const LBL  = ({ t }) => <span style={{ fontSize:13, fontWeight:600, display:"block", marginBottom:5 }}>{t}</span>;
  const GFont = () => <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800&display=swap" rel="stylesheet" />;
  const base = { fontFamily:"Heebo,sans-serif", direction:"rtl", minHeight:"100vh" };

  const LogoSmall = () => <img src={LOGO_URL} alt="G&E" style={{ height:38, borderRadius:6, objectFit:"contain", background:"#fff", padding:3 }}/>;
  const LogoBig   = () => <div style={{ textAlign:"center", marginBottom:10 }}><img src={LOGO_URL} alt="G&E Construction" style={{ height:110, objectFit:"contain", borderRadius:12 }}/></div>;

  if (loading) return (
    <div style={{ ...base, background:"#1A1A2E", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <GFont/>
      <div style={{ textAlign:"center" }}>
        <img src={LOGO_URL} alt="G&E" style={{ height:100, borderRadius:12, background:"#fff", padding:"8px 16px", marginBottom:20 }}/>
        <p style={{ color:"#E8C547", fontSize:16, fontWeight:600 }}>טוען נתונים...</p>
      </div>
    </div>
  );

  if (screen === "home") return (
    <div style={{ ...base, background:"#1A1A2E", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
      <GFont/>
      <div style={{ textAlign:"center", marginBottom:40 }}>
        <img src={LOGO_URL} alt="G&E Construction" style={{ height:140, objectFit:"contain", borderRadius:16, background:"#fff", padding:"10px 18px", boxShadow:"0 8px 32px rgba(0,0,0,0.3)", marginBottom:20 }}/>
        <p style={{ color:"#888", margin:0, fontSize:14, letterSpacing:1 }}>מערכת ניהול אתרי בנייה</p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12, width:"100%", maxWidth:300 }}>
        <button onClick={()=>{ setScreen("wLogin"); setCodeInput(""); setCodeError(false); }} style={{ ...btnY, fontSize:16, padding:15, borderRadius:14 }}>👷 כניסת עובד</button>
        <button onClick={()=>{ setScreen("mLogin"); setCodeInput(""); setCodeError(false); }} style={{ fontSize:16, padding:15, borderRadius:14, background:"rgba(255,255,255,0.08)", color:"#ccc", border:"1px solid rgba(255,255,255,0.15)", cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>🔐 כניסת מנהל</button>
      </div>
    </div>
  );

  if (screen === "wLogin") return (
    <div style={{ ...base, background:"#1A1A2E", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <GFont/>
      <div style={{ background:"#fff", borderRadius:20, padding:30, width:"100%", maxWidth:320, direction:"rtl" }}>
        <button onClick={()=>setScreen("home")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:"#888", fontFamily:"Heebo,sans-serif", padding:"0 0 14px" }}>← חזור</button>
        <LogoBig/>
        <h2 style={{ margin:"12px 0 4px", fontWeight:800, fontSize:20, textAlign:"center" }}>כניסת עובד</h2>
        <p style={{ margin:"0 0 18px", color:"#777", fontSize:14, textAlign:"center" }}>הכנס את הקוד האישי שלך</p>
        <input value={codeInput} onChange={e=>{setCodeInput(e.target.value);setCodeError(false);}} onKeyDown={e=>e.key==="Enter"&&workerLogin()} placeholder="קוד אישי" type="password" style={{ ...inp, fontSize:22, letterSpacing:6, textAlign:"center", marginBottom:8 }}/>
        {codeError && <p style={{ color:"#E53935", fontSize:13, margin:"0 0 8px", textAlign:"center" }}>קוד שגוי, נסה שוב</p>}
        <button onClick={workerLogin} style={{ ...btnD, width:"100%", marginTop:4, fontSize:15 }}>כניסה</button>
      </div>
    </div>
  );

  if (screen === "mLogin") return (
    <div style={{ ...base, background:"#1A1A2E", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <GFont/>
      <div style={{ background:"#fff", borderRadius:20, padding:30, width:"100%", maxWidth:320, direction:"rtl" }}>
        <button onClick={()=>setScreen("home")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:"#888", fontFamily:"Heebo,sans-serif", padding:"0 0 14px" }}>← חזור</button>
        <LogoBig/>
        <h2 style={{ margin:"12px 0 4px", fontWeight:800, fontSize:20, textAlign:"center" }}>כניסת מנהל</h2>
        <p style={{ margin:"0 0 18px", color:"#777", fontSize:14, textAlign:"center" }}>הכנס את קוד המנהל</p>
        <input value={codeInput} onChange={e=>{setCodeInput(e.target.value);setCodeError(false);}} onKeyDown={e=>e.key==="Enter"&&managerLogin()} placeholder="קוד מנהל" type="password" style={{ ...inp, fontSize:22, letterSpacing:6, textAlign:"center", marginBottom:8 }}/>
        {codeError && <p style={{ color:"#E53935", fontSize:13, margin:"0 0 8px", textAlign:"center" }}>קוד שגוי, נסה שוב</p>}
        <button onClick={managerLogin} style={{ ...btnD, width:"100%", marginTop:4, fontSize:15 }}>כניסה</button>
      </div>
    </div>
  );

  if (screen === "worker") return (
    <div style={{ ...base, background:"#F5F5F0" }}>
      <GFont/>
      <header style={{ background:"#1A1A2E", padding:"0 18px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
        <LogoSmall/>
        <button onClick={()=>{ setLoggedWorker(null); setScreen("home"); }} style={{ background:"rgba(255,255,255,0.1)", color:"#ccc", border:"none", borderRadius:8, padding:"5px 12px", fontSize:13, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>יציאה</button>
      </header>
      <div style={{ maxWidth:440, margin:"0 auto", padding:"26px 16px" }}>
        <h2 style={{ margin:"0 0 4px", fontWeight:800, fontSize:21 }}>שלום, {loggedWorker?.name} 👋</h2>
        <p style={{ margin:"0 0 22px", color:"#777", fontSize:14 }}>דווח על יום העבודה שלך</p>
        {repSent ? (
          <div style={{ background:"#fff", borderRadius:16, padding:36, textAlign:"center" }}>
            <div style={{ fontSize:46, marginBottom:10 }}>✅</div>
            <h3 style={{ margin:"0 0 6px", fontWeight:800, fontSize:19 }}>הדיווח נשלח!</h3>
            <p style={{ margin:"0 0 22px", color:"#777" }}>יום העבודה שלך נרשם בהצלחה.</p>
            <button onClick={()=>{ setRepSent(false); setRepDate(todayStr()); setRepProject(""); setRepNote(""); }} style={btnD}>דיווח נוסף</button>
          </div>
        ) : (
          <div style={{ background:"#fff", borderRadius:16, padding:22, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
            <label style={{ display:"block", marginBottom:14 }}>
              <LBL t="📅 תאריך"/>
              <input type="date" value={repDate} onChange={e=>setRepDate(e.target.value)} style={{ ...inp, fontSize:15 }}/>
            </label>
            <label style={{ display:"block", marginBottom:14 }}>
              <LBL t="🏗️ באיזה אתר עבדת?"/>
              <select value={repProject} onChange={e=>setRepProject(e.target.value)} style={{ ...inp, fontSize:15 }}>
                <option value="">— בחר פרויקט —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {projects.length===0 && <p style={{ margin:"5px 0 0", fontSize:12, color:"#E53935" }}>המנהל עדיין לא הוסיף פרויקטים</p>}
            </label>
            <label style={{ display:"block", marginBottom:18 }}>
              <LBL t="📝 הערה (אופציונלי)"/>
              <textarea value={repNote} onChange={e=>setRepNote(e.target.value)} placeholder="מה בוצע היום?" rows={3} style={{ ...inp, resize:"vertical" }}/>
            </label>
            <button onClick={submitReport} disabled={!repProject} style={{ ...btnD, width:"100%", fontSize:15, opacity:repProject?1:0.4 }}>שלח דיווח יומי ✓</button>
          </div>
        )}
      </div>
    </div>
  );

  // ====== MANAGER SCREEN ======
  const tabs = [
    { key:"reports",  label:"דיווחים",  emoji:"📋" },
    { key:"projects", label:"פרויקטים", emoji:"🏗️" },
    { key:"workers",  label:"עובדים",   emoji:"👷" },
    { key:"payroll",  label:"שכר",      emoji:"💰" },
    { key:"settings", label:"הגדרות",   emoji:"⚙️" },
  ];

  return (
    <div style={{ ...base, background:"#F5F5F0" }}>
      <GFont/>
      <header style={{ background:"#1A1A2E", padding:"0 18px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
        <LogoSmall/>
        <button onClick={()=>setScreen("home")} style={{ background:"rgba(255,255,255,0.1)", color:"#ccc", border:"none", borderRadius:8, padding:"5px 12px", fontSize:13, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>יציאה</button>
      </header>

      <div style={{ background:"#fff", borderBottom:"1.5px solid #EEE", display:"flex", justifyContent:"center", overflowX:"auto" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={()=>{ setMgTab(t.key); setDetailId(null); }} style={{ background:"none", border:"none", borderBottom:mgTab===t.key?"3px solid #E8C547":"3px solid transparent", padding:"11px 12px", fontWeight:mgTab===t.key?700:500, fontSize:13, cursor:"pointer", fontFamily:"Heebo,sans-serif", color:mgTab===t.key?"#1A1A2E":"#888", whiteSpace:"nowrap" }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <main style={{ maxWidth:880, margin:"0 auto", padding:"20px 14px" }}>

        {/* REPORTS */}
        {mgTab==="reports" && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div>
                <h1 style={{ margin:0, fontSize:20, fontWeight:800 }}>דיווחי עובדים</h1>
                <p style={{ margin:"3px 0 0", color:"#777", fontSize:13 }}>{reports.length} דיווחים סה"כ</p>
              </div>
              <button onClick={loadAll} style={{ ...btnG, padding:"7px 14px", fontSize:13 }}>🔄 רענן</button>
            </div>
            {reports.length===0 && <div style={{ background:"#fff", borderRadius:14, padding:44, textAlign:"center", border:"1.5px dashed #DDD", color:"#AAA" }}><div style={{ fontSize:34, marginBottom:8 }}>📋</div><p style={{ margin:0 }}>אין דיווחים עדיין</p></div>}
            {[...reports].reverse().map(r => (
              <div key={r._dbid} style={{ background:"#fff", borderRadius:12, padding:"13px 18px", marginBottom:9, borderRight:"4px solid #E8C547", boxShadow:"0 1px 5px rgba(0,0,0,0.06)", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:3 }}>
                    <span style={{ fontWeight:700, fontSize:14 }}>{r.workerName}</span>
                    <span style={{ background:"#F0F0EC", borderRadius:6, padding:"2px 8px", fontSize:12, color:"#555" }}>{r.projectName}</span>
                    <span style={{ fontSize:12, color:"#999" }}>📅 {r.date}</span>
                  </div>
                  {r.note && <p style={{ margin:0, fontSize:13, color:"#666", lineHeight:1.5 }}>{r.note}</p>}
                </div>
                <button onClick={()=>delReport(r)} style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:15, padding:0, flexShrink:0 }}>✕</button>
              </div>
            ))}
          </>
        )}

        {/* PROJECTS LIST */}
        {mgTab==="projects" && !detailProject && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div>
                <h1 style={{ margin:0, fontSize:20, fontWeight:800 }}>פרויקטים</h1>
                <p style={{ margin:"3px 0 0", color:"#777", fontSize:13 }}>{projects.length} פרויקטים</p>
              </div>
              <button onClick={()=>setNewPM(true)} style={btnY}>+ פרויקט חדש</button>
            </div>
            {projects.length===0 && <div style={{ background:"#fff", borderRadius:14, padding:44, textAlign:"center", border:"1.5px dashed #DDD", color:"#AAA" }}><div style={{ fontSize:34, marginBottom:8 }}>🏗️</div><p style={{ margin:0 }}>אין פרויקטים — הוסף את הראשון</p></div>}
            {projects.map(p => {
              const sc = STATUS_COLORS[p.status]||STATUS_COLORS["ממתין"];
              const pr = projReports(p.id);
              // ✅ ימים ייחודיים
              const totalDays = uniqueWorkDaysForProject(reports, p.id);
              return (
                <div key={p._dbid} style={{ background:"#fff", borderRadius:14, padding:"17px 20px", marginBottom:11, boxShadow:"0 2px 8px rgba(0,0,0,0.07)", border:"1.5px solid #EEE" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:9 }}>
                    <div style={{ flex:1, cursor:"pointer" }} onClick={()=>{ setDetailId(p.id); setEditProj({...p}); }}>
                      <h2 style={{ margin:0, fontSize:15, fontWeight:700, color:"#1A1A2E", textDecoration:"underline", textDecorationColor:"#E8C547" }}>{p.name}</h2>
                      {(p.startDate||p.endDate) && <p style={{ margin:"3px 0 0", color:"#888", fontSize:12 }}>📅 {p.startDate} — {p.endDate}</p>}
                    </div>
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <span style={{ background:sc.bg, color:sc.text, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                        <span style={{ width:5, height:5, borderRadius:"50%", background:sc.dot, display:"inline-block" }}/>{p.status}
                      </span>
                      <button onClick={()=>delProject(p)} style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:14 }}>✕</button>
                    </div>
                  </div>
                  <div style={{ marginBottom:9 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontSize:12, color:"#666" }}>אחוז ביצוע</span>
                      <span style={{ fontSize:12, fontWeight:700 }}>{p.progress||0}%</span>
                    </div>
                    <div style={{ background:"#EEE", borderRadius:99, height:6 }}>
                      <div style={{ height:"100%", width:`${p.progress||0}%`, background:p.progress>=100?"#43A047":"#E8C547", borderRadius:99 }}/>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:9 }}>
                    <span style={{ background:"#F0F4FF", color:"#3B5BDB", borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:600 }}>📅 {totalDays} ימי עבודה</span>
                    {p.plannedDays && <span style={{ background:"#F5F5F0", color:"#555", borderRadius:8, padding:"3px 10px", fontSize:12 }}>מתוכנן: {p.plannedDays}</span>}
                    {p.materialCost && <span style={{ background:"#FFF8E1", color:"#B26A00", borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:600 }}>🧱 ₪{fmtNum(p.materialCost)}</span>}
                    {p.totalCost && <span style={{ background:"#FCE4EC", color:"#B71C1C", borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:600 }}>💰 ₪{fmtNum(p.totalCost)}</span>}
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <p style={{ margin:0, fontSize:12, color:"#666" }}>👷 {getWkrNames(p.workers)||"לא שויכו עובדים"}</p>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ fontSize:12, color:"#999" }}>💬 {pr.length}</span>
                      <button onClick={()=>{ setAssignPid(p.id); setAssignM(true); }} style={{ background:"#1A1A2E", color:"#E8C547", border:"none", borderRadius:6, padding:"3px 10px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:600 }}>שייך עובדים</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* PROJECT DETAIL */}
        {mgTab==="projects" && detailProject && editProj && (() => {
          const pr = projReports(detailProject.id);
          // ✅ ימים ייחודיים לפי תאריך
          const totalDays = uniqueWorkDaysForProject(reports, detailProject.id);
          // ימי עבודה לפי עובד (לצורך תצוגת שכר בפרויקט)
          const daysMap = workerDaysForProject(reports, detailProject.id);
          const workerEntries = Object.entries(daysMap).sort((a,b)=>b[1]-a[1]);
          return (
            <>
              <button onClick={()=>{ setDetailId(null); setEditProj(null); }} style={{ background:"none", border:"none", fontSize:13, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:600, marginBottom:14, padding:0, color:"#1A1A2E" }}>← חזור לפרויקטים</button>
              <div style={{ background:"#1A1A2E", borderRadius:16, padding:"18px 22px", marginBottom:14, color:"#fff" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8, marginBottom:14 }}>
                  <div>
                    <h2 style={{ margin:0, fontSize:19, fontWeight:800 }}>{detailProject.name}</h2>
                    {(detailProject.startDate||detailProject.endDate) && <p style={{ margin:"4px 0 0", color:"#AAA", fontSize:12 }}>📅 {detailProject.startDate} — {detailProject.endDate}</p>}
                  </div>
                  <span style={{ background:STATUS_COLORS[detailProject.status]?.bg, color:STATUS_COLORS[detailProject.status]?.text, borderRadius:20, padding:"4px 13px", fontSize:12, fontWeight:700 }}>{detailProject.status}</span>
                </div>
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontSize:12, color:"#AAA" }}>אחוז ביצוע</span>
                    <span style={{ fontSize:12, fontWeight:700, color:"#E8C547" }}>{editProj.progress||0}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={editProj.progress||0}
                    onChange={e=>{ const v=Number(e.target.value); setEditProj(p=>({...p,progress:v})); updateProjField(detailProject,{progress:v}); }}
                    style={{ width:"100%", accentColor:"#E8C547", cursor:"pointer" }}/>
                </div>
              </div>

              {/* Worker days in project */}
              <div style={{ background:"#fff", borderRadius:14, padding:"16px 20px", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>👷 עובדים בפרויקט</h3>
                  {/* ✅ ימים ייחודיים */}
                  <span style={{ background:"#F0F4FF", color:"#3B5BDB", borderRadius:8, padding:"4px 12px", fontSize:13, fontWeight:700 }}>📅 {totalDays} ימי עבודה</span>
                </div>
                {workerEntries.length===0 ? <p style={{ margin:0, fontSize:13, color:"#AAA" }}>אין דיווחים עדיין</p> :
                  workerEntries.map(([name, days]) => {
                    const w = workers.find(w=>w.name===name);
                    const rate = Number(w?.dailyRate||0);
                    return (
                      <div key={name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 12px", background:"#F9F9F9", borderRadius:10, marginBottom:7 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:34, height:34, borderRadius:"50%", background:"#1A1A2E", color:"#E8C547", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, flexShrink:0 }}>{name[0]}</div>
                          <div>
                            <p style={{ margin:0, fontWeight:700, fontSize:14 }}>{name}</p>
                            {w?.role && <p style={{ margin:0, fontSize:12, color:"#888" }}>{w.role}</p>}
                          </div>
                        </div>
                        <div style={{ textAlign:"left" }}>
                          <p style={{ margin:0, fontWeight:800, fontSize:15, color:"#3B5BDB" }}>{days} ימים</p>
                          {rate>0 && <p style={{ margin:0, fontSize:12, color:"#888" }}>₪{fmtNum(days*rate)}</p>}
                        </div>
                      </div>
                    );
                  })
                }
              </div>

              <div style={{ background:"#fff", borderRadius:14, padding:"16px 20px", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
                <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700 }}>📊 נתוני פרויקט</h3>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {[
                    { key:"plannedDays", label:"📅 ימי עבודה מתוכננים" },
                    { key:"materialCost", label:"🧱 עלות חומר (₪)" },
                    { key:"totalCost", label:"💰 עלות פרויקט (₪)" },
                  ].map(f => (
                    <label key={f.key} style={{ display:"block" }}>
                      <span style={{ fontSize:12, fontWeight:600, display:"block", marginBottom:4, color:"#555" }}>{f.label}</span>
                      <input type="number" value={editProj[f.key]||""} placeholder="0"
                        onChange={e=>{ const v=e.target.value; setEditProj(p=>({...p,[f.key]:v})); updateProjField(detailProject,{[f.key]:v}); }}
                        style={{ ...inp, fontSize:15 }}/>
                    </label>
                  ))}
                  <div style={{ background:"#F0F4FF", borderRadius:10, padding:"10px 14px" }}>
                    <p style={{ margin:0, fontSize:11, color:"#888" }}>ימים בוצעו בפועל</p>
                    <p style={{ margin:"4px 0 0", fontSize:20, fontWeight:800, color:"#3B5BDB" }}>{totalDays}</p>
                    {editProj.plannedDays && <p style={{ margin:"2px 0 0", fontSize:11, color:"#888" }}>מתוך {editProj.plannedDays} מתוכנן</p>}
                  </div>
                </div>
                {(detailProject.materialCost && detailProject.totalCost) && (
                  <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #EEE" }}>
                    <div style={{ background:"#FFF8E1", borderRadius:10, padding:"10px 14px" }}>
                      <p style={{ margin:0, fontSize:11, color:"#888" }}>חומר מסך העלות</p>
                      <p style={{ margin:"4px 0 0", fontSize:18, fontWeight:800, color:"#B26A00" }}>{Math.round((Number(detailProject.materialCost)/Number(detailProject.totalCost))*100)}%</p>
                      <p style={{ margin:"2px 0 0", fontSize:11, color:"#888" }}>₪{fmtNum(detailProject.materialCost)} מתוך ₪{fmtNum(detailProject.totalCost)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ background:"#fff", borderRadius:14, padding:"16px 20px", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
                <h3 style={{ margin:"0 0 13px", fontSize:15, fontWeight:700 }}>🧑‍💼 פרטי ניהול</h3>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <label style={{ display:"block" }}>
                    <span style={{ fontSize:12, fontWeight:600, display:"block", marginBottom:4, color:"#555" }}>מנהל פרויקט</span>
                    <input value={editProj.projectManager||""} placeholder="שם מנהל"
                      onChange={e=>{ const v=e.target.value; setEditProj(p=>({...p,projectManager:v})); updateProjField(detailProject,{projectManager:v}); }}
                      style={{ ...inp, fontSize:14 }}/>
                  </label>
                  <label style={{ display:"block" }}>
                    <span style={{ fontSize:12, fontWeight:600, display:"block", marginBottom:4, color:"#555" }}>כמות עובדים מתוכננת</span>
                    <input type="number" value={editProj.plannedWorkers||""} placeholder="לדוגמה: 5"
                      onChange={e=>{ const v=e.target.value; setEditProj(p=>({...p,plannedWorkers:v})); updateProjField(detailProject,{plannedWorkers:v}); }}
                      style={{ ...inp, fontSize:14 }}/>
                  </label>
                </div>
              </div>

              <div style={{ background:"#fff", borderRadius:14, padding:"16px 20px", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
                <h3 style={{ margin:"0 0 10px", fontSize:15, fontWeight:700 }}>📌 דגשים לעבודה</h3>
                <textarea value={editProj.highlights||""} placeholder="הנחיות בטיחות, דרישות, הערות חשובות..." rows={5}
                  onChange={e=>{ const v=e.target.value; setEditProj(p=>({...p,highlights:v})); updateProjField(detailProject,{highlights:v}); }}
                  style={{ ...inp, resize:"vertical", fontSize:14, lineHeight:1.7 }}/>
              </div>

              <div style={{ background:"#fff", borderRadius:14, padding:"16px 20px", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:13 }}>
                  <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>🪜 שלבי ביצוע</h3>
                  <button onClick={()=>{ const phases=[...(editProj.phases||[]),{id:Date.now(),name:"",done:false,targetDate:"",notes:""}]; setEditProj(p=>({...p,phases})); updateProjField(detailProject,{phases}); }}
                    style={{ background:"#1A1A2E", color:"#E8C547", border:"none", borderRadius:7, padding:"4px 12px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>+ הוסף שלב</button>
                </div>
                {(!editProj.phases||editProj.phases.length===0) && <p style={{ margin:0, fontSize:13, color:"#AAA" }}>אין שלבים עדיין</p>}
                {(editProj.phases||[]).map((ph,idx) => {
                  const updPhase = (changes) => {
                    const phases=(editProj.phases||[]).map((p,i)=>i===idx?{...p,...changes}:p);
                    setEditProj(p=>({...p,phases})); updateProjField(detailProject,{phases});
                  };
                  return (
                    <div key={ph.id} style={{ marginBottom:10, background:"#F9F9F9", borderRadius:12, padding:"12px 14px", borderRight:ph.done?"4px solid #22C55E":"4px solid #DDD" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                        <input type="checkbox" checked={!!ph.done} onChange={e=>updPhase({done:e.target.checked})} style={{ width:18, height:18, accentColor:"#22C55E", cursor:"pointer", flexShrink:0 }}/>
                        <input value={ph.name} placeholder={`שם השלב ${idx+1}`} onChange={e=>updPhase({name:e.target.value})}
                          style={{ flex:1, border:"none", background:"transparent", fontSize:14, fontFamily:"Heebo,sans-serif", outline:"none", fontWeight:700, textDecoration:ph.done?"line-through":"none", color:ph.done?"#AAA":"#1A1A2E" }}/>
                        <button onClick={()=>{ const phases=(editProj.phases||[]).filter((_,i)=>i!==idx); setEditProj(p=>({...p,phases})); updateProjField(detailProject,{phases}); }}
                          style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:14, padding:0, flexShrink:0 }}>✕</button>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                        <span style={{ fontSize:12, color:"#888", whiteSpace:"nowrap" }}>🎯 יעד:</span>
                        <input type="date" value={ph.targetDate||""} onChange={e=>updPhase({targetDate:e.target.value})}
                          style={{ border:"1px solid #DDD", borderRadius:7, padding:"4px 8px", fontSize:13, fontFamily:"Heebo,sans-serif", background:"#fff", outline:"none" }}/>
                        {ph.targetDate && ph.done && <span style={{ background:"#F0FDF4", color:"#2E7D32", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:600 }}>✓ הושלם</span>}
                        {ph.targetDate && !ph.done && new Date(ph.targetDate)<new Date() && <span style={{ background:"#FCE4EC", color:"#B71C1C", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:600 }}>⚠ באיחור</span>}
                      </div>
                      <textarea value={ph.notes||""} placeholder="הערות, פירוט..." onChange={e=>updPhase({notes:e.target.value})} rows={2}
                        style={{ width:"100%", border:"1px solid #E8E8E8", borderRadius:8, padding:"7px 10px", fontSize:13, fontFamily:"Heebo,sans-serif", background:"#fff", outline:"none", resize:"vertical", boxSizing:"border-box", lineHeight:1.6 }}/>
                    </div>
                  );
                })}
                {(editProj.phases||[]).length>0 && (
                  <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #EEE", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:13, color:"#666" }}>{(editProj.phases||[]).filter(p=>p.done).length} / {(editProj.phases||[]).length} שלבים הושלמו</span>
                    <div style={{ background:"#EEE", borderRadius:99, height:7, width:120 }}>
                      <div style={{ height:"100%", borderRadius:99, background:"#22C55E", width:`${Math.round(((editProj.phases||[]).filter(p=>p.done).length/Math.max((editProj.phases||[]).length,1))*100)}%` }}/>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ background:"#fff", borderRadius:14, padding:"13px 18px", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.07)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:700 }}>👷 עובדים משויכים</p>
                  <p style={{ margin:0, fontSize:13, color:"#555" }}>{getWkrNames(detailProject.workers)||"לא שויכו עובדים"}</p>
                </div>
                <button onClick={()=>{ setAssignPid(detailProject.id); setAssignM(true); }} style={{ ...btnD, fontSize:13, padding:"7px 14px" }}>שייך עובדים</button>
              </div>

              <h3 style={{ margin:"0 0 10px", fontWeight:700, fontSize:15 }}>📋 דיווחים מהשטח ({pr.length})</h3>
              {pr.length===0 && <div style={{ background:"#fff", borderRadius:12, padding:24, textAlign:"center", color:"#AAA", border:"1.5px dashed #DDD" }}><p style={{ margin:0 }}>אין דיווחים עדיין</p></div>}
              {[...pr].reverse().map(r => (
                <div key={r._dbid} style={{ background:"#fff", borderRadius:12, padding:"12px 16px", marginBottom:9, borderRight:"4px solid #E8C547", boxShadow:"0 1px 5px rgba(0,0,0,0.06)", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:3 }}>
                      <span style={{ fontWeight:700, fontSize:14 }}>{r.workerName}</span>
                      <span style={{ fontSize:12, color:"#999" }}>📅 {r.date}</span>
                    </div>
                    {r.note && <p style={{ margin:0, fontSize:13, color:"#555" }}>{r.note}</p>}
                  </div>
                  <button onClick={()=>delReport(r)} style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:14, padding:0 }}>✕</button>
                </div>
              ))}
            </>
          );
        })()}

        {/* WORKERS */}
        {mgTab==="workers" && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div>
                <h1 style={{ margin:0, fontSize:20, fontWeight:800 }}>עובדים</h1>
                <p style={{ margin:"3px 0 0", color:"#777", fontSize:13 }}>{workers.length} עובדים</p>
              </div>
              <button onClick={()=>setNewWM(true)} style={btnY}>+ עובד חדש</button>
            </div>
            {workers.length===0 && <div style={{ background:"#fff", borderRadius:14, padding:44, textAlign:"center", border:"1.5px dashed #DDD", color:"#AAA" }}><div style={{ fontSize:34, marginBottom:8 }}>👷</div><p style={{ margin:0 }}>אין עובדים — הוסף את הצוות</p></div>}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:11 }}>
              {workers.map(w => {
                const wr = reports.filter(r=>r.workerId===w.id);
                return (
                  <div key={w._dbid} style={{ background:"#fff", borderRadius:14, padding:16, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:9 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                        <div style={{ width:38, height:38, borderRadius:"50%", background:"#1A1A2E", color:"#E8C547", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:15, flexShrink:0 }}>{w.name[0]}</div>
                        <div>
                          <p style={{ margin:0, fontWeight:700, fontSize:14 }}>{w.name}</p>
                          <p style={{ margin:0, color:"#777", fontSize:12 }}>{w.role}</p>
                        </div>
                      </div>
                      <button onClick={()=>delWorker(w)} style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:14 }}>✕</button>
                    </div>
                    <div style={{ background:"#F5F5F0", borderRadius:8, padding:"6px 11px", fontSize:12, marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span><span style={{ color:"#888" }}>קוד: </span><span style={{ fontWeight:700, letterSpacing:2 }}>{w.code||"—"}</span></span>
                      <button onClick={()=>{ setEditWorker({...w}); setEditWM(true); }} style={{ background:"#1A1A2E", color:"#E8C547", border:"none", borderRadius:6, padding:"2px 9px", fontSize:11, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>ערוך</button>
                    </div>
                    {w.dailyRate && <p style={{ margin:"0 0 4px", fontSize:12, color:"#555" }}>💵 ₪{fmtNum(w.dailyRate)} ליום</p>}
                    <p style={{ margin:0, fontSize:12, color:"#999" }}>💬 {wr.length} דיווחים</p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ✅ PAYROLL TAB */}
        {mgTab==="payroll" && (
          <>
            <div style={{ marginBottom:16 }}>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800 }}>💰 שכר עובדים</h1>
              <p style={{ margin:"3px 0 0", color:"#777", fontSize:13 }}>סיכום תשלומים לפי עובד וחודש</p>
            </div>

            {workers.length===0 && <div style={{ background:"#fff", borderRadius:14, padding:44, textAlign:"center", border:"1.5px dashed #DDD", color:"#AAA" }}><p style={{ margin:0 }}>אין עובדים עדיין</p></div>}

            {/* סיכום כולל */}
            {workers.length>0 && (() => {
              const totalAll = workers.reduce((sum, w) => {
                const { totalPay } = calcWorkerPayroll(w, reports);
                return sum + totalPay;
              }, 0);
              return (
                <div style={{ background:"#1A1A2E", borderRadius:14, padding:"14px 20px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ color:"#AAA", fontSize:13 }}>סה"כ לתשלום לכל העובדים</span>
                  <span style={{ color:"#E8C547", fontSize:22, fontWeight:800 }}>₪{fmtNum(totalAll)}</span>
                </div>
              );
            })()}

            {workers.map(w => {
              const { totalDays, totalPay, months } = calcWorkerPayroll(w, reports);
              const isOpen = payrollWorker === w._dbid;
              const hasRate = Number(w.dailyRate||0) > 0;
              return (
                <div key={w._dbid} style={{ background:"#fff", borderRadius:14, marginBottom:11, boxShadow:"0 2px 8px rgba(0,0,0,0.07)", overflow:"hidden" }}>
                  {/* כותרת עובד */}
                  <div onClick={()=>setPayrollWorker(isOpen ? null : w._dbid)}
                    style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px", cursor:"pointer" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:38, height:38, borderRadius:"50%", background:"#1A1A2E", color:"#E8C547", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:15, flexShrink:0 }}>{w.name[0]}</div>
                      <div>
                        <p style={{ margin:0, fontWeight:700, fontSize:15 }}>{w.name}</p>
                        <p style={{ margin:0, fontSize:12, color:"#888" }}>{w.role} {hasRate ? `· ₪${fmtNum(w.dailyRate)}/יום` : "· אין שכר יומי"}</p>
                      </div>
                    </div>
                    <div style={{ textAlign:"left", display:"flex", alignItems:"center", gap:12 }}>
                      <div>
                        <p style={{ margin:0, fontSize:12, color:"#888" }}>{totalDays} ימים</p>
                        {hasRate && <p style={{ margin:0, fontSize:18, fontWeight:800, color:"#1A1A2E" }}>₪{fmtNum(totalPay)}</p>}
                        {!hasRate && <p style={{ margin:0, fontSize:12, color:"#E53935" }}>לא הוגדר שכר</p>}
                      </div>
                      <span style={{ fontSize:18, color:"#BBB" }}>{isOpen?"▲":"▼"}</span>
                    </div>
                  </div>

                  {/* פירוט לפי חודש */}
                  {isOpen && (
                    <div style={{ borderTop:"1px solid #EEE", padding:"12px 18px" }}>
                      {months.length===0 && <p style={{ margin:0, fontSize:13, color:"#AAA", textAlign:"center", padding:"10px 0" }}>אין דיווחים עדיין</p>}
                      {months.map(m => (
                        <div key={m.month} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"10px 0", borderBottom:"1px solid #F0F0EC" }}>
                          <div>
                            <p style={{ margin:0, fontWeight:700, fontSize:14 }}>{m.label}</p>
                            <p style={{ margin:"2px 0 0", fontSize:12, color:"#888" }}>{m.days} ימים · {m.projects}</p>
                          </div>
                          <div style={{ textAlign:"left" }}>
                            {hasRate
                              ? <span style={{ background:"#F0FDF4", color:"#2E7D32", borderRadius:8, padding:"4px 12px", fontSize:13, fontWeight:700 }}>₪{fmtNum(m.pay)}</span>
                              : <span style={{ background:"#F5F5F0", color:"#888", borderRadius:8, padding:"4px 12px", fontSize:13 }}>{m.days} ימים</span>
                            }
                          </div>
                        </div>
                      ))}
                      {months.length>0 && hasRate && (
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:12 }}>
                          <span style={{ fontSize:13, color:"#666", fontWeight:600 }}>סה"כ</span>
                          <span style={{ fontSize:17, fontWeight:800, color:"#1A1A2E" }}>₪{fmtNum(totalPay)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* SETTINGS */}
        {mgTab==="settings" && (
          <>
            <h1 style={{ margin:"0 0 20px", fontSize:20, fontWeight:800 }}>הגדרות</h1>
            <div style={{ background:"#fff", borderRadius:14, padding:22, boxShadow:"0 2px 8px rgba(0,0,0,0.07)", maxWidth:360 }}>
              <h3 style={{ margin:"0 0 6px", fontWeight:700, fontSize:15 }}>🔐 קוד מנהל</h3>
              <p style={{ margin:"0 0 12px", color:"#777", fontSize:13 }}>שנה את קוד הכניסה למנהל</p>
              <input value={newAdminCode} onChange={e=>setNAC(e.target.value)} placeholder="קוד חדש" style={{ ...inp, marginBottom:10 }}/>
              <button onClick={saveAdminCode} style={{ ...btnD, width:"100%" }}>שמור קוד חדש</button>
            </div>
          </>
        )}
      </main>

      {/* MODAL: Assign */}
      {assignM && assignProject && (
        <div onClick={()=>setAssignM(false)} style={OVL}>
          <div onClick={e=>e.stopPropagation()} style={MOD}>
            <h3 style={{ margin:"0 0 5px", fontWeight:800, fontSize:17 }}>שיוך עובדים</h3>
            <p style={{ margin:"0 0 14px", color:"#777", fontSize:13 }}>פרויקט: {assignProject.name}</p>
            {workers.length===0 && <p style={{ color:"#AAA", textAlign:"center", padding:"14px 0" }}>אין עובדים עדיין</p>}
            {workers.map(w => {
              const isA = (assignProject.workers||[]).some(x=>String(x)===String(w.id));
              return (
                <div key={w._dbid} onClick={()=>toggleAssign(w.id)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 13px", borderRadius:10, marginBottom:7, cursor:"pointer", background:isA?"#F0FDF4":"#F9F9F9", border:`1.5px solid ${isA?"#86EFAC":"#EEE"}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                    <div style={{ width:30, height:30, borderRadius:"50%", background:isA?"#1A1A2E":"#DDD", color:isA?"#E8C547":"#888", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12 }}>{w.name[0]}</div>
                    <div>
                      <p style={{ margin:0, fontWeight:600, fontSize:13 }}>{w.name}</p>
                      <p style={{ margin:0, fontSize:11, color:"#888" }}>{w.role}</p>
                    </div>
                  </div>
                  <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${isA?"#22C55E":"#CCC"}`, background:isA?"#22C55E":"transparent", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:12 }}>{isA?"✓":""}</div>
                </div>
              );
            })}
            <button onClick={()=>setAssignM(false)} style={{ ...btnD, width:"100%", marginTop:10 }}>סגור</button>
          </div>
        </div>
      )}

      {/* MODAL: Edit Worker */}
      {editWM && editWorker && (
        <div onClick={()=>{ setEditWM(false); setEditWorker(null); }} style={OVL}>
          <div onClick={e=>e.stopPropagation()} style={MOD}>
            <h3 style={{ margin:"0 0 18px", fontWeight:800, fontSize:17 }}>עריכת עובד</h3>
            {[
              { key:"name", label:"שם מלא", ph:"דוד כהן", extra:{} },
              { key:"code", label:"קוד אישי", ph:"4321", extra:{ letterSpacing:3, fontSize:17 } },
              { key:"role", label:"תפקיד", ph:"קבלן אינסטלציה", extra:{} },
              { key:"dailyRate", label:"שכר יומי (₪)", ph:"500", extra:{ type:"number" } },
            ].map(f => (
              <label key={f.key} style={{ display:"block", marginBottom:12 }}>
                <LBL t={f.label}/>
                <input type={f.extra.type||"text"} value={editWorker[f.key]||""} placeholder={f.ph}
                  onChange={e=>setEditWorker({...editWorker,[f.key]:e.target.value})} style={{ ...inp, ...f.extra }}/>
              </label>
            ))}
            <div style={{ display:"flex", gap:10, marginTop:6 }}>
              <button onClick={saveEditWorker} style={{ ...btnD, flex:1 }}>שמור</button>
              <button onClick={()=>{ setEditWM(false); setEditWorker(null); }} style={{ ...btnG, flex:1 }}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: New Project */}
      {newPM && (
        <div onClick={()=>setNewPM(false)} style={OVL}>
          <div onClick={e=>e.stopPropagation()} style={{ ...MOD, maxWidth:500 }}>
            <h3 style={{ margin:"0 0 16px", fontWeight:800, fontSize:17 }}>פרויקט חדש</h3>
            <label style={{ display:"block", marginBottom:11 }}>
              <LBL t="שם הפרויקט"/>
              <input value={newProject.name} onChange={e=>setNewProject({...newProject,name:e.target.value})} placeholder="לדוגמה: בנין רחוב הרצל" style={inp}/>
            </label>
            <div style={{ display:"flex", gap:10, marginBottom:11 }}>
              <label style={{ flex:1 }}><LBL t="תאריך התחלה"/><input type="date" value={newProject.startDate} onChange={e=>setNewProject({...newProject,startDate:e.target.value})} style={inp}/></label>
              <label style={{ flex:1 }}><LBL t="תאריך סיום"/><input type="date" value={newProject.endDate} onChange={e=>setNewProject({...newProject,endDate:e.target.value})} style={inp}/></label>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:11 }}>
              {[{ key:"plannedDays", label:"ימי עבודה מתוכננים" },{ key:"materialCost", label:"עלות חומר (₪)" },{ key:"totalCost", label:"עלות פרויקט (₪)" }].map(f=>(
                <label key={f.key} style={{ display:"block" }}>
                  <LBL t={f.label}/>
                  <input type="number" value={newProject[f.key]||""} placeholder="0" onChange={e=>setNewProject({...newProject,[f.key]:e.target.value})} style={inp}/>
                </label>
              ))}
            </div>
            <label style={{ display:"block", marginBottom:16 }}>
              <LBL t="סטטוס"/>
              <select value={newProject.status} onChange={e=>setNewProject({...newProject,status:e.target.value})} style={inp}>
                {["ממתין","בביצוע","מושהה","הושלם"].map(s=><option key={s}>{s}</option>)}
              </select>
            </label>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={addProject} style={{ ...btnD, flex:1 }}>הוסף פרויקט</button>
              <button onClick={()=>setNewPM(false)} style={{ ...btnG, flex:1 }}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: New Worker */}
      {newWM && (
        <div onClick={()=>setNewWM(false)} style={OVL}>
          <div onClick={e=>e.stopPropagation()} style={MOD}>
            <h3 style={{ margin:"0 0 6px", fontWeight:800, fontSize:17 }}>עובד חדש</h3>
            <p style={{ margin:"0 0 14px", color:"#777", fontSize:13 }}>קבע קוד — העובד ישתמש בו לכניסה</p>
            {[
              { key:"name", label:"שם מלא", ph:"דוד כהן", extra:{} },
              { key:"code", label:"קוד אישי", ph:"לדוגמה: 4321", extra:{ letterSpacing:3, fontSize:17 } },
              { key:"role", label:"תפקיד (אופציונלי)", ph:"קבלן אינסטלציה", extra:{} },
              { key:"dailyRate", label:"שכר יומי ₪ (אופציונלי)", ph:"500", extra:{ type:"number" } },
            ].map(f=>(
              <label key={f.key} style={{ display:"block", marginBottom:11 }}>
                <LBL t={f.label}/>
                <input type={f.extra.type||"text"} value={newWorker[f.key]||""} placeholder={f.ph}
                  onChange={e=>setNewWorker({...newWorker,[f.key]:e.target.value})} style={{ ...inp, ...f.extra }}/>
              </label>
            ))}
            <div style={{ display:"flex", gap:10, marginTop:6 }}>
              <button onClick={addWorker} style={{ ...btnD, flex:1 }}>הוסף עובד</button>
              <button onClick={()=>setNewWM(false)} style={{ ...btnG, flex:1 }}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
