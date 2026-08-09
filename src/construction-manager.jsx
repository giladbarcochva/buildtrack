import { useState, useEffect, useCallback, useRef } from "react";

const SUPABASE_URL = "https://rkjcrhywhoixdkqlfnko.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJramNyaHl3aG9peGRrcWxmbmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMzA2NzQsImV4cCI6MjA5NDYwNjY3NH0.yKZzdMCNOyWJClmip03QY617HX2IB-xKPKGUZtKT_Z0";
// ===== אימות מאובטח (JWT) =====
let AUTH_TOKEN = null;
try { AUTH_TOKEN = localStorage.getItem("bt_tok_" + (window.location.pathname.split("/").filter(Boolean)[0] || "admin")) || null; } catch(e) {}
function setAuthToken(t) {
  AUTH_TOKEN = t;
  try {
    const k = "bt_tok_" + (ORG_SLUG || "admin");
    if (t) localStorage.setItem(k, t); else localStorage.removeItem(k);
  } catch(e) {}
}
function hdrs() {
  return { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": "Bearer " + (AUTH_TOKEN || SUPABASE_KEY) };
}
async function apiLogin(kind, code) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/app-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY },
    body: JSON.stringify({ slug: ORG_SLUG, kind, code })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.token) throw new Error(data.error || "קוד שגוי");
  setAuthToken(data.token);
  return data;
}

// ===== Multi-tenant: current org from URL path (/gne → org "gne") =====
const ORG_SLUG = (() => {
  const seg = window.location.pathname.split("/").filter(Boolean)[0];
  // נתיב ייעודי לניהול ראשי — לא נשמר ולא מפנה
  if (seg === "admin") return "";
  if (seg) return seg.toLowerCase();
  // נפתח בלי נתיב (אייקון מסך בית) — הפניה לארגון האחרון
  try {
    const last = localStorage.getItem("bt_last_org");
    if (last) { window.location.replace("/" + last); return last; }
  } catch(e) {}
  return "";
})();
let CURRENT_ORG = null;
const TERMS_VERSION = "1.0"; // העלאת המספר תחייב אישור מחדש מכל הקבלנים

// ===== מסלולי מנוי =====
const PLANS = {
  free:     { label:"🎁 חינם",   maxWorkers:Infinity, maxProjects:Infinity, foremen:true,  subs:true  },
  basic:    { label:"🥉 בסיס",   maxWorkers:5,        maxProjects:3,        foremen:false, subs:false },
  pro:      { label:"🥈 מקצועי", maxWorkers:15,       maxProjects:Infinity, foremen:true,  subs:true  },
  business: { label:"🥇 עסקי",   maxWorkers:Infinity, maxProjects:Infinity, foremen:true,  subs:true  },
};
// ===== תוכן מסך העזרה =====
const HELP_TOPICS = [
  { icon:"🔑", title:"כניסה למערכת", body:"במסך הפתיחה שלוש כניסות:\n• כניסת עובד — עם הקוד האישי שהמנהל הגדיר לעובד.\n• כניסת מנהל עבודה — עם קוד מנהל העבודה (מוגדר בטאב מנהלי עבודה).\n• כניסת מנהל — עם קוד המנהל של העסק.\nאת הקישור של העסק מוסיפים למסך הבית: פותחים בדפדפן ← שיתוף ← הוספה למסך הבית — ומקבלים אייקון כמו אפליקציה." },
  { icon:"📝", title:"דיווח יומי של עובד", body:"העובד נכנס עם הקוד שלו, בוחר פרויקט (מוצגים רק פרויקטים שהוא משויך אליהם — השיוך בכפתור 'שייך עובדים' בפרויקט), בוחר יום מלא או חצי יום, מסמן דלק אם נסע ברכב, ולוחץ שלח.\n• אי אפשר לדווח פעמיים על אותו תאריך.\n• דיווח על תאריך שעבר נכנס ל'ממתינים לאישור' אצל המנהל ולא נספר בשכר עד שמאושר.\n• בטאב 'היומן שלי' העובד רואה את הימים שהוא משובץ בהם." },
  { icon:"⏱️", title:"עובד שעתי — שעון נוכחות", body:"עובד שהוגדר כשעתי רואה שעון נוכחות במקום טופס דיווח: בוחר פרויקט ← ▶️ כניסה בתחילת היום ← 🛑 יציאה בסיומו.\nחישוב השכר: 9 שעות ראשונות 100%, שעות 10-11 לפי 125%, משעה 12 לפי 150%.\nשכח לסגור? המנהל רואה 'שעון תקוע' בטאב דיווחים ומתקן עם כפתור '✏️ שעות'." },
  { icon:"👷", title:"ניהול עובדים וסוגי העסקה", body:"בטאב עובדים מוסיפים עובד עם שם, קוד אישי ותפקיד, ובוחרים סוג העסקה:\n• יומי — שכר קבוע ליום (עם אפשרות חצי יום).\n• שעתי — שכר לשעה + שעון נוכחות.\n• גלובלי — משכורת חודשית קבועה.\nלכל עובד אפשר להגדיר אם יראה כפתור דלק וכמה ₪ דלק ליום.\nחשוב: כדי שעובד יוכל לדווח, חובה לשייך אותו לפרויקט (כפתור 'שייך עובדים' בתוך הפרויקט)." },
  { icon:"🏗️", title:"פרויקטים", body:"בטאב פרויקטים יוצרים פרויקט חדש ונכנסים אליו לניהול מלא: תיאור (מומלץ לכתוב כמויות — למשל '200 מטר גבס'), שלבי ביצוע עם סטטוס ותאריך יעד, הוצאות וחומרים, קבלני משנה, חשבוניות ותוכניות.\nסטטוס 'הושלם' מסתיר את הפרויקט מהעובדים ומרשימות השיבוץ.\nכרטיס 'סה\"כ הוצאות פרויקט' מסכם הוצאות + קבלני משנה." },
  { icon:"📄", title:"הצעות מחיר", body:"בטאב הצעות מחיר יוצרים הצעה עם פרטי לקוח וסכום — או מחולקת לסעיפים (גבס, בטון...) כשלכל סעיף מחיר וסימון כולל/בלי חומר; הסה\"כ מחושב אוטומטית.\nכשהלקוח מאשר לוחצים '✓ נסגרה — צור פרויקט' וההצעה הופכת לפרויקט פעיל: הסעיפים נכתבים לתיאור והסכום נכנס כשלב קבלת תשלום.\nהצעה שנדחתה נשארת לתיעוד ואפשר להחזירה." },
  { icon:"🔨", title:"קבלני משנה", body:"בתוך דף פרויקט, בקטע קבלני משנה, מוסיפים קבלן עם תיאור עבודה, מחיר, ימים מתוכננים וסימון כולל/בלי חומר.\nמגדירים שלבי תשלום (מתי וכמה) ומסמנים ✓ כשמשולם — נשמר תאריך.\nבטאב שכר ← '🔨 קבלנים' רואים את כל הקבלנים מכל הפרויקטים וכמה נשאר לשלם לכל אחד." },
  { icon:"💵", title:"קבלת תשלומים מהלקוח", body:"בכל פרויקט יש קטע 'שלבי קבלת תשלום': מגדירים שלבים (מקדמה, אחרי שלד, מסירה...) עם סכומים, ומסמנים ✓ כשכסף התקבל.\nשורת הסיכום מציגה סה\"כ / התקבל / נותר — כך רואים בכל רגע כמה הלקוח עוד חייב." },
  { icon:"📅", title:"יומן ושיבוץ עובדים", body:"לוחצים על יום ← '+ הוסף פרויקט' ← בוחרים פרויקט ומסמנים עובדים. אפשר כמה פרויקטים באותו יום.\nעובד שכבר משובץ לפרויקט אחר באותו יום — המערכת מתריעה ומציגה מי שיבץ; מנהל ראשי יכול לאשר בכל זאת, מנהל עבודה חסום.\nהעובד רואה את השיבוצים שלו בטאב 'היומן שלי'." },
  { icon:"💰", title:"שכר עובדים", body:"בטאב שכר: 'לתשלום' מציג כמה מגיע לכל עובד, עם פירוט לפי חודש ולפי פרויקט.\n• 'שולם במלואו' סוגר את החודש, 'שולם חלקית' מזין סכום ומשאיר יתרה.\n• 'היסטוריה' מציגה תשלומים שבוצעו + סה\"כ ימים לפי פרויקט, ומאפשרת עריכה או ביטול.\nשעתי מוצג עם פירוט שעות רגילות/נוספות; גלובלי מופיע עם המשכורת הקבועה בכל חודש פעיל." },
  { icon:"🦺", title:"מנהלי עבודה", body:"בטאב מנהלי עבודה: מוסיפים מנהל חדש או הופכים עובד קיים, מגדירים לו קוד כניסה נפרד ומשייכים פרויקטים (פעילים בלבד).\nמנהל עבודה רואה רק את הפרויקטים שלו: דיווחים, פרויקטים (בלי יצירה/מחיקה), עובדים (צפייה ושיוך), ויומן. בלי שכר, ציוד והגדרות.\nכפתור '📝 דיווח יום' בכותרת מאפשר לו לדווח ימי עבודה לעצמו." },
  { icon:"✅", title:"אישור דיווחי עבר", body:"דיווח של עובד על תאריך שכבר עבר לא נכנס ישר לשכר — הוא ממתין בקטע צהוב בראש טאב הדיווחים.\nהמנהל (או מנהל העבודה של אותו פרויקט) מאשר דיווח בודד או את כולם — ורק אז הוא נספר בשכר ובימי הפרויקט." },
  { icon:"📸", title:"חשבוניות ותוכניות", body:"בתוך דף פרויקט מעלים תמונות חשבוניות ותוכניות אדריכליות (תמונה או PDF, גם כמה יחד).\nלחיצה על שם הקובץ פותחת אותו לצפייה; ✕ מוחק (עם אישור).\nהקבצים נשמרים בענן מאובטח ונגישים מכל מכשיר." },
  { icon:"🛒", title:"ציוד — רשימת קניות", body:"טאב ציוד הוא רשימת קניות משותפת: מוסיפים פריט וכמות, מסמנים ✓ כשנקנה, ומוחקים כשלא צריך.\nמתעדכן לכל המנהלים במכשירים שלהם." },
  { icon:"🛠️", title:"תקלות נפוצות", body:"• 'קוד שגוי' למרות קוד נכון — ודאו שנכנסתם דרך הקישור הנכון של העסק שלכם.\n• נתונים לא מתעדכנים — צאו והתחברו מחדש, או משכו לרענון.\n• המסך נראה ישן אחרי עדכון — סגרו את האפליקציה לגמרי ופתחו שוב.\n• ההתחברות תקפה 12 שעות — אחריהן פשוט מתחברים שוב.\nלכל בעיה אחרת — פנו לספק המערכת." },
];

function quoteTotal(q) {
  return (q.items && q.items.length)
    ? q.items.reduce((s,it) => s + Number(it.amount||0), 0)
    : Number(q.amount||0);
}
const WHATSAPP_QUOTE = "https://wa.me/972543276493?text=" + encodeURIComponent("היי, אשמח לקבל הצעת מחיר למערכת BuildTrack לניהול אתרי בנייה 🏗️");
function rememberOrg() {
  try { if (CURRENT_ORG?.slug) localStorage.setItem("bt_last_org", CURRENT_ORG.slug); } catch(e) {}
} // set after org load; holds {id, slug, name, logo, settings, active, _dbid}
const SUPER_ADMIN_CODE_DEFAULT = "GNE-MASTER-2026"; // קוד התחלתי — ניתן לשינוי ממסך הניהול
async function getMasterCode() {
  try {
    const cfg = await orgGetBySlug("_config");
    return cfg?.settings?.masterCode || SUPER_ADMIN_CODE_DEFAULT;
  } catch(e) { return SUPER_ADMIN_CODE_DEFAULT; }
}
async function setMasterCode(newCode) {
  let cfg = await orgGetBySlug("_config");
  if (cfg) await orgUpdate(cfg._dbid, { settings: { ...(cfg.settings||{}), masterCode: newCode } });
  else await orgInsert({ slug: "_config", name: "_config", active: false, settings: { masterCode: newCode } });
}

// 🔑 הדבק כאן את מפתח ה-API של Anthropic (מ-console.anthropic.com)
const ANTHROPIC_API_KEY = "PASTE_YOUR_KEY_HERE";

async function dbGet(table) {
  const orgFilter = CURRENT_ORG ? `&org_id=eq.${CURRENT_ORG.id}` : "";
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&order=id.asc${orgFilter}`, { headers: hdrs() });
  const rows = await r.json();
  if (!Array.isArray(rows)) {
    const msg = JSON.stringify(rows);
    if (msg.includes("JWT") || msg.includes("jwt")) setAuthToken(null);
    throw new Error(`Table ${table} error: ${msg}`);
  }
  return rows.map(row => ({ ...row.data, _dbid: row.id }));
}
async function dbInsert(table, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST", headers: { ...hdrs(), "Prefer": "return=representation" },
    body: JSON.stringify({ data, org_id: CURRENT_ORG?.id || null })
  });
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error("dbInsert error:", table, rows);
    throw new Error(`Insert to ${table} failed: ${JSON.stringify(rows)}`);
  }
  return { ...rows[0].data, _dbid: rows[0].id };
}
async function dbUpdate(table, dbid, data) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${dbid}`, {
    method: "PATCH", headers: hdrs(), body: JSON.stringify({ data })
  });
}
async function dbDelete(table, dbid) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${dbid}`, {
    method: "DELETE", headers: hdrs()
  });
}

// ===== Organizations (multi-tenant) =====
async function orgGetBySlug(slug) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/organizations?select=*&slug=eq.${encodeURIComponent(slug)}`, { headers: hdrs() });
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length===0) return null;
  return { ...rows[0], _dbid: rows[0].id };
}
async function orgGetAll() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/organizations?select=*&order=id.asc`, { headers: hdrs() });
  const rows = await r.json();
  return Array.isArray(rows) ? rows.map(x=>({ ...x, _dbid: x.id })) : [];
}
async function orgInsert(org) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/organizations`, {
    method: "POST", headers: { ...hdrs(), "Prefer": "return=representation" },
    body: JSON.stringify(org)
  });
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length===0) throw new Error(JSON.stringify(rows));
  return { ...rows[0], _dbid: rows[0].id };
}
async function orgUpdate(dbid, changes) {
  await fetch(`${SUPABASE_URL}/rest/v1/organizations?id=eq.${dbid}`, {
    method: "PATCH", headers: hdrs(), body: JSON.stringify(changes)
  });
}
async function orgExportData(orgId) {
  const tables = ["projects","workers","reports","calendar","equipment"];
  const out = { exportedAt: new Date().toISOString(), orgId };
  for (const t of tables) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*&org_id=eq.${orgId}`, { headers: hdrs() });
    out[t] = await r.json();
  }
  return out;
}

// ===== Supabase Storage (תוכניות אדריכליות) =====
async function storageUpload(file, path) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/plans/${encodeURIComponent(path)}`, {
    method: "POST",
    headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + (AUTH_TOKEN || SUPABASE_KEY), "Content-Type": file.type || "application/octet-stream" },
    body: file
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`העלאה נכשלה: ${err}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/plans/${encodeURIComponent(path)}`;
}
async function storageDelete(path) {
  await fetch(`${SUPABASE_URL}/storage/v1/object/plans/${encodeURIComponent(path)}`, {
    method: "DELETE",
    headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + (AUTH_TOKEN || SUPABASE_KEY) }
  });
}

const LOGO_URL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QDsRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAC5ADAAIAAAAUAAAApJAEAAIAAAAUAAAAuJAQAAIAAAAHAAAAzJARAAIAAAAHAAAA1JASAAIAAAAHAAAA3JKQAAIAAAAEMDAwAJKRAAIAAAAEMDAwAJKSAAIAAAAEMDAwAKABAAMAAAABAAEAAKACAAQAAAABAAAGAKADAAQAAAABAAAEAAAAAAAyMDI2OjAyOjAzIDIzOjUzOjAzADIwMjY6MDI6MDMgMjM6NTM6MDMAKzAyOjAwAAArMDI6MDAAACswMjowMAAA/+0AfFBob3Rvc2hvcCAzLjAAOEJJTQQEAAAAAABEHAFaAAMbJUccAgAAAgACHAI/AAYyMzUzMDMcAj4ACDIwMjYwMjAzHAI3AAgyMDI2MDIwMxwCPAALMjM1MzAzKzAyMDA4QklNBCUAAAAAABBICnNdASpPBV2C7YqHLlau/8IAEQgEAAYAAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAMCBAEFAAYHCAkKC//EAMMQAAEDAwIEAwQGBAcGBAgGcwECAAMRBBIhBTETIhAGQVEyFGFxIweBIJFCFaFSM7EkYjAWwXLRQ5I0ggjhU0AlYxc18JNzolBEsoPxJlQ2ZJR0wmDShKMYcOInRTdls1V1pJXDhfLTRnaA40dWZrQJChkaKCkqODk6SElKV1hZWmdoaWp3eHl6hoeIiYqQlpeYmZqgpaanqKmqsLW2t7i5usDExcbHyMnK0NTV1tfY2drg5OXm5+jp6vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAQIAAwQFBgcICQoL/8QAwxEAAgIBAwMDAgMFAgUCBASHAQACEQMQEiEEIDFBEwUwIjJRFEAGMyNhQhVxUjSBUCSRoUOxFgdiNVPw0SVgwUThcvEXgmM2cCZFVJInotIICQoYGRooKSo3ODk6RkdISUpVVldYWVpkZWZnaGlqc3R1dnd4eXqAg4SFhoeIiYqQk5SVlpeYmZqgo6SlpqeoqaqwsrO0tba3uLm6wMLDxMXGx8jJytDT1NXW19jZ2uDi4+Tl5ufo6ery8/T19vf4+fr/2wBDAAICAgICAgMCAgMFAwMDBQYFBQUFBggGBgYGBggKCAgICAgICgoKCgoKCgoMDAwMDAwODg4ODg8PDw8PDw8PDw//2wBDAQIDAwQEBAcEBAcQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/2gAMAwEAAhEDEQAAAfvzbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttXg/ZfLPx36HN+2G/Nr7I5tPXdthrttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbV8H/G/wBkfGvt8RNk65e8/YX5ibDX9t5/Jr7J8/o+nM1dc2u21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21fB/xv8AZXxr7fF+nPxN+i3x/wAm3yOq0+g+3m+aMQbr3X1j8KJyb9nL78W/qrz+n763Bd7yb7bVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttXwn8Z/Znxr7fF+unx39g/H3Bv83/st+Nv7JNflH5H655H6HKnZLLsrU4+6/gz60w1/QbbeN27bVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVtRfK2i/Y2/Nv7edPRtthr8KfGX2b8Ze3xfrn8ffYXx7wb/Of7Jfjf8Asg1+UvkPrXkvocqdsy7JVW+sPk/6ww1/QrbeN27bVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW3ifyBvl94fI/yI39DG0pfY6nbLzR0zU6/Y/2n+M/tvDv7H8X/aHxj1L+uPyF9e/IXn7/ADj+yH43/sg1+UfkfrvkXocqdsypUnUr6u+T/rLDX9Ctt43bttW21bbVttWyF1ttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttWZfKnxZ14fd/yR41YehjX9B9NfdmDfk77d1Hn736QfnT6Z8fYNxik70OZXrXkfrWTe8fGf2d8Xq/65/IX178gcW/zr+x344/sc1+UfkPrnkvocqdsyp21b6y+TfrPDX9Cdt43bttW1P84aL9T8l+dfh3Zh92/NPLG683f6S/kn+kODdz6/8AiN6Srfrjvi36k4d+u22bbbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbV+W9Bf9l7PF9cfJv3P+b3Jt9Qdn+bXumi8NxXrvouuW82/T3888Nfk/ZXocyfXPI/XM291+NPsv40R/wBdvj36/wDj3i3+eP2M/HH9jmvyk8g9c8l9DlTlJZdtqT9afJv1lhr+hDV1+XXm9H2J84eN/Tvbj8Zdr1H6gV+ZP0NeeFZt+hv54cp4dotf+hf56fdLr8MK26ct9FfOv0Zm/wCl228Pv22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22r8tfN/Rr/ANvi8+j9afz3xb136x+BRculv5R5Z2vdh3vzv+iHzwr/ADJtunDeueR+tZN7p8Z/Z3xmr/rp8e/X/wAf8W/zp+yH45/sY1+UnkXrXkfocqkvPrYXx7vrX5QoP1l8m/Web/oP+T/6wfk/yb/X/pP5b+y6Jz15yH6GMv5des/XFircj4L9r/Bi3hf218T/AF/05/IiVbfJP0V86/RGb/pltvD79tq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq/LEoOW9ni+i/ln76+e8m4f66be4Y6fH7nz7yLfP8AXn84PKcLi9t2Yb1jyX1pG95+Mvs34yzf9cPkH6/+PuTf55/Yz8cf2OZPyb6H7u9VVvN/SB+NeV2e0+W1nsRvy97z9CeL9Hj7T8n/ANYPyfc/YH0r+RbDRPWffviP6Z1XyjzD6Y9Xr4sT+wv58pfJn1P8tfR+6/OSdtct9EfOv0Vnr+mG28Pt22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22r8s+04/wAz9ni/UH4F6Ticm5frvqb6zzb8pfSOw5jRf0A/P73P44x08j2T6XJvXPI/XFb3j4x+zPjnJ/1u+Vfq/ufN6fkL7B3H4adh5p4L5N8t73b8YNXy/uK7vgsy/bHon51+u/T+J9b/ADT7d1H1HhfM/wBJl+ctU+fvur8ea/0uf7W4f5fUyfQfjFHtFV7l4b65XkO2dd9EfOv0Znr+mG28Pt22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22r8uev4zlvZ4v1z/O3ivHsNPqZ98bq3y7Hjtts07Y221b1Sn++cNaf0T1tHl9a6ryL5x+d9b2XwZvvkvotlbj2TtbOanWVbRMNSB97587q7Mf0IffA30b9b89efA36ik+k8X8QVfpR8J+lz8Htt8ldFzurZOpX0Z85/R2ev6Wbbw+3battq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbc3XSbjFNdjuOJXW7l+oW/LHw/7K+h/W5Pizt/0J3Jt+KLH9ivirpx+TEum/ZgnOPqdG+aPsr6s67zelg/5z5p8T0vdvmPhN8d9Fk7eZ37ZVZ17F9Ge55ngf0Pb76v5+l+dfqTV+dIfvD5o+P8AovKlDV43oqUPV6B9L/FCvV4v0Wrvl/6Q+x+b+T/iz9pOV9vzfxvT9W/K3pcw9s676O+cfozPX9MNt4fbttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVvzn/AEY/Ofsx+WUk3qcY96X9x5a/Nf6TZp5HW7ZeIeAfPet9D0Pz2r532fvq6/PX3b3fL9U+R/uC4+n8Tyj1fcvg114D41y3xv0jpnt4HsZWySd1/wBMerxeD/Sfdb6353bb1OLbattq22rzX5m+40eR6H50J+s/mz5D6KhyVef1KfMdH6S97/PbpPovG+8PLWPsH13gflx4R+33z/63D+Yf0PwPLdeX7Ob41+t/J7LPbZNttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21b87f0S8Z3y/N/wC2vptxpSjxf59+Z9r3/wCfef3ynvp2vuLpo99EXfref8ubr+M8vusvevnPb5foNbfnv759R4HrnzN9aWvdy/nHvuPzL5j3vAfo32G29zywH29/yNtq3zn9GfEO+fB+yfn/APTHoYe0+UVvzbX6Y+//ABb9pefvtthpmbzV83/Pv6Jc5877PwQn13yD5X6Aih7lfem+aK3z+4+1/O32v6nwvpz5H+pb76jxPxkd/rl8V+lzdt9V/jF0tfsTvkH6v4N3+2ybbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq2w6IHyP508b0voD555bfK/QbXXtmTfPfpP1R1P0HkeQ+rn30Pjbbb57zr0XZa/JPkX6J1Xget+fW+oPEPnfXovf/mYit+hz74B9++p8L6AzJ77/AJG21bbVvGvZfzy3X0r0H8v/AKa68Pqfzryn5dr9UfbfhH7u4t9tsm22rbat5n6Zs9fhTjv0W8N+U935bVY1nzftkUNSCy+gvmtXdz/oW7+C/pP6352/+DP0130XkfiD2/6E/Bnpc/1/9S/it3GDfr9vk/6k4ul5tsm22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbatHlnzx5HofQHzjyF18r7/Pq+hfbenH5c9t9g30XjNnO3refttW21bbVttW21bbV554f9Z7ze787mn6D+NfN+z89fRPhHIcXX+ibn4J+ifqPC9twTe35W/P39Atov4g/Tf6RN+rL86/mT9sy18O/cW3Lrttm221bbVttW21Uvzj9Ubi6/zpH9x/MHxv0Xnqhq8jvVtq9F+k/idXr8H6KM/mL6M+v+d+XviT9meb9vzfxp733n5P8AQw/RX6W/E70Xm1/XXfLn055+59srbbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVt5985eX6Hv/zrzHt3z/rfPvpH1L0/Zz+Q+sG30Pi7bb57bVttW21bbVttW21bbVttW21bbVvOvRdlr8leUfoZX+B6nxR9E1vi/F1/aq/hj6L9jzfXNE+z5u21bbVttW21bbVttW21bbVttXjvzT98M/E9L89U/RHz98h9IBQ1cfUawq1FPpf3L8/un+i8b7l8zZes/W+B+XXhX7dfPXrcP5leks+C7cP0m+j/AMSvT+Tf9a980fSfn7k2ytttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVtx/kfD0+p/Off+yed3fLHtfr26MG7jb1/P22rbattq22rbattq22rbattq22rbattq22rbattq22rlfDfpzcXX8ge5+k8Bx7+hbj+w9Xz9ttF22rbattq22rbattq22rbaty3U5W+POY+6t8/6/wAI77uyv8Lq+5st8L+lfT23yYP9vf8AIYfHH2ttF/Fur/Yb4N9Lm+a/UfLt1Zfpf9C/iX6vw7/rDvnb6J8/fbZW22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq1fYauE7vbNtvCPj/AK8P0j8k/L5n14fofRfB6tV+7J+EtX3aj4VVX3THwvq+60/Cmr7vT8JavuxPwrq+64+FdX3Uj4Y1fdKvhRVfdCPhjV9z++fk1+hWGv1htvP6dtq22rNvHfmvxPU+qfOvnxXzvr+tsvM1cnT6nfeHZk+rfTvgYnocv6Jb5R+lfpvDudt6HJttW21bbUj43+x/xN68PumPhPdmH3ZHwtq+6Z+FU193J+FdX3VHwtq+7EfC2r7on4W1fdaPhXV91T8Kavu5Pwnq/Qz6h/FL3bLX71Yd90Hn7+Qp9g1eO+j3em22W22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq2zCg/n9xHiHqcmSrdmG21KUnUrJ1KyVUpO1bJ1KydW21KydSttWUnUpOTW/Qn89v0J5t/rHbeR17bVvmnt/kD5n3dsr4/6NKt1LpyyvoG/9Tz/mHfRXn2GvnCVJ8/q3S81nH3n0vw59u/f/ACRtt6nDttW21D/E39svxP8AQ5h7b0ObbJrbatlJrbalZOpW2pO2rbattq22r6V/SX8Rf2D8zr7fbcW+21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVviP7K/HPrw59WT6vIrbVttSsnVttSslVbZNKTsttszZSVS7bUrJ1K21ZO1b9Cvz1/Qzj3+rtt5fXtmtfF3AOA/l33acpxkfWvq1vY/o3x223ocm21effHn6CeH/ADvs/K+Sr4v6NP158i+verwfXW2/Qfkttq22of4n/th+Jvocydt6HNkq1bbVkqTW2TSslVKydW21bbVsnUrJ1b9Cfz2+6ubf7S23kde21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbV8+/mP9v/ABB63ElKt1ZbbVkqTSur7P8AT3m3+LfXPpfefv4VHu2VvC97pq8NR7rq8K3uurwuPddXhe901eGo911eGq9w1eHp9y1eH+gdhkttlbVdohb86tZ1n5Z97ryjwv0Y3Cd3+pfCbbaLttWYvtXgtn7PuDr8at/Tsy7bdvNttW21D/E39svxN9DmTtvQ5lJ2rJUmvsX7o+GvvLyO5nLvc2jNTrU0l1qZqdamsO9TLPdTXOtTVZ9W21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttX57fJ31d8o+zxJ22+SttSdiV+ovubN54PobbK221bbVttW21bbVttW21bbVttW21bbVttXyt4d97/AA58L9TW7bw/T6/7N+Ber9nzvuvcv1H3fy22zLttW21bbVttW21bbUP8T/2w/E/0OYe29Dm22pO2r7J+8fhH7u8ju225tNtq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq/PX5P+sPk/2eJKtt8ttqTdUt0jftFtvC9Dbattq22rzD4s+rfzA9Lm+kh/N+6cPo6fm7V9Jb5t1fR8fN+r6QT846vowvzZq+kPaPgf6iz1/RrbeR17bVvLPUwYa/ns39u8T/ADn7Hbbm2vPsb4btvX4P0C3B95938pttou21bYVFzWFnebKo+2aH+KP7Xfij6HMHKT6HNttSdtT51U6rLVeFaKqdVpqtJrhNXqtE1qatFVaa+of0b/M/9MPK7ttuTTbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22r89fk/6w+T/AGeLbbfLbak31DeI37QbbwvQ22rbattq8J/L/wDUP8vPV5Nk7rwycmiZOrbakqTq2Tq31B8v/UGGv6Pbbxu3beUYaW3yrzLb4X6vKSryu3Z30Go5LbZGw+wPi936XF+h+8r9U+9+U223z3j3sPg3B1/Lw1b86+xT774J9G+nwfR+2/Qfkh/if+2H4n+hzDTk+hzK21bbUpO1bbVttWSpNbbUrbVk7TfR36Xfmf8Aph5XVttybbbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21fnr8n/V3yf7PErbb5ZO1a8obZG/ajJV4XobbVttW21eEfmF+xXivdzfm6n9H46U/N/fo+pL84N+kia/Nvei+cdeKk7G22pP1F8v/UWGv6Nbbxu3nPhj2nwT4f6nbbwfT3r7f7C+i8emsXe+y+d+OvKP0S+SfkPovI8nfNew8+tfkBx6HL+im8b9k+/+R3yp9T/A3jenz22+J+lV9dfI/wB/fRePebb7T5sf4n/th+J/ocw0qT6HNtk1ttWV9W/Y3Nv+Rm/XNOQ/I7frnq/IxP66pn/IzfrrpPyKV+u0T/kUn9ddXwp+mXGdnyb7bYNttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbV+efyj9e/IXs8W22+SUq1JUnTftJdfLH1P4PdtsrbbVttW21bbVttW2BX5beJ9hyPu+enbOqk7VvqL5b+p8Nf0X2a+N2/B/O5X5Z91tniP9t9mlX6j8JttqubuNXyH47+jXyp8d9J4koZPmvYN9VfKKu7k+s/ki1qpx5SeHo9M+0vJPW/v/k9tvX88f4n/ALYfif6HMPbehzJSrUnbV9nfd3wj93eR3bbc2m21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21fIXwJ+tH5M+pyJSpPZgnKTW21dH+j35fKw1/brfkR65w7fo3vz9yt+gW/P3V+gW/P3V+gW/PtVfoFvz7pJf0b+JPl7hevNQ1bswTlak7ak/a/wAVfpdzb/RzV1vI6/zl19z/AOWfdKUPI36IPPE/bP034rbbpw22rIXq+U/Ef0Z+U/kPovFNt8x7W21D9aovs/6DybDbfbfM7bUP8T/2w/E/0OYe29DmyVJrJVq+y/u/8mvZ/P6fv7fAew0+/N8Aqr783wGmvv7fn/q/QDfAOr7+3wHq+/N8A6vv7fAfsy30ttsNdtq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rfk9+sPiPTl+WqTB9fiydq22pWTqyk6lbalbatsmlbZZO2a22rbattqyVarT9jvjL7l8rr225N/lbwz7y+HPhfqWCVJ8P07X7I+JnHp8X6Jb5Z9Q+x+e9W3Hs+vm7zeFeO+b2/QvyxQK+V91O28zt2yad/YXxk99Lk/Q3ea+lfoHyW22mY/xP8A2w/E/wBDmHtvQ5k7attq2yaVk6lZOpWTq22rKSqttq22rfXHyP8AXWGv6Abbxu3battq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22r5M/P79tPE+3D8r96b5l6XJtlGyVJrKTqVk6lZOpShqpWTq22rbak7alZNhTH331P7a4d1PtvN69tq3ivtWw1/OcP2X8qfBfW0eTvN6lDUlpJE6lKTliKHeuKb2D0v2v6jwfkXx39E/kTHfyfJ3zXsPfsT4ue+lyfojvM/TP0D5If4n/tb+KPqcSNt6HMnKTW2TSk7UnbVlJ1KyVUrbVttWSrVttW+uPkf64w1/QLbeN27bVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbUPwf3zMv5/eSfq5unL8Z6H9tm+q/iWr9sZr8Td+2er8TN+2er8TN+2ia/E3ftjq/ExX7Y6vxQeftKSvyA9L/TfI3xn9QdZubTbbN9tq22rbasye6vDfIftDeR6H561P6QNvL9D86Cfoa6UfBXoH11u7n8b9adb2PN223yzR3q+aWP1JvJ9D5bV9RZH+avoZ/u7lB+L37UJ9Th/FFP7YbfP8T0/tlq/Evftpq/Evftpq/EtP7bavxJ37bRX4lK/bOa/E3ftlq/Evftpq/EtX7ZavxN37ZavxJ+ufv2FZe24d9tq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbatoa07zJqrW+pctdbm24frNycLdbuMSbtdxKRdxuCQregbzyK9E3ner0TeeavQ955q9D3nSq9D3ncV6LvOFV6LvOtXou861ei7zua9D3nmr0PeeKr0Hef6vQNwOrvtwSq7vccR163ckQXU7mnzJb6qW9ZZouVxtmttq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbas3cauGofV9yb+F130Lubf5kZ/U+z1+N637a2Gnwq1+9Nhr+f9b+iQ1P52j/Rcat+cif0ZZI/54q/QuFvz3cfoBXV8HK+8EK3wlvusIvhhX3LBvh1X22FX+Kk/a6a+Kt9ppS+MlfZqa+NE/Zur4y32amvjTfZeh8Zb7NiPxqn7N03xlvs6ZfjDfZ+r4wV9mqr4y32aqvi4f2vnvibfbU18SK+3VsnxCn7jVXwwn7t1fCg/vJdfA2/QUjL+eyf0PM1+eRv0PU6/nxYffSinw6++1Nrn8avvrzar8vv/AKR22Xg9/wCs7fDg+ve7rx223y22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbattq22rbatwF18TV39V7x2deNfQXzz7dXSc/dfEFd1yPq3sVfO/wBC+WeC1945o7r5u7Xw3g6/QqsoL2vl762+A/vyt416j8G12++oCVxnr3Bd7XylQ/VHK14NqL6+rgPZKq1r5g5Ou+hq8M7v2H5jr6+d+Ce915HX1FXX0vtq+TPqL4W+5Ktmbz5JrovO+i+ka+ZffGvMV7p8efYfOV8rJ9e8ipH0R0VrVj8jfXP571+gRgHpn4DzKq5a9+k+Sq09A/P77Wrq/D/cPmmr73j86/sSvUPkD6//AD5r9BFJVW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbV4NzHW+dV9cbattq4f5S+vfiyvvvNnNb4s+z/hqvqL0fg+8r4x6zkfpKvk77I8N8+rmf0A/P8A/QCg/EH3KOvjb1XtPIa+irj4m+2a3GdnxlfI33Z8F/elbbV8S/T3y7R196fKfmPU16v9AV1jXz7VX3GV9WbRXwN9xfCf3pT786f0Y/PWvva04vtK2yaVtq8q8U9s8Vr6+21b88/0M/PWv0DIM1fnd+gXwL9x10+2r5qtOT7yvcfmr6V+a6o/MvoSwrv/AIjveer9CFbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21U/xJ9511fNHWO6uvKvrmg9ArfIv10KvkP0625OuAe+v+rUbbV8W/SlH3lXPxl9pUtfDv354j7dVN8jfaXAVxvO2DivHvtyjvK3GdnTV8QffHiPt1bbV8O/U/LelVX/HH3j5hXXdD5n6ZXJfFn6AcbXnXKdC9rxj7bq7St4B7/q+Cvd+786qgedb7BT7bV5T4r9N8hXqm2rfnv8AoR4XXtp0LrwDw37x8/riuQ6C5r55+3V2Nb5n+mPP64L33iO3r5a8M/Q/xqvbFbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbVttW21bbV//9oACAEBAAEFAv8A3w2PFnjE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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAqEIAMMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACooAkABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI0CqYCEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlA8CaC6AkAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfIpQYAMCoCEAAQAA4jLZYoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABCUamQBGj4CEAABWJ7WpQgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AtUgBOA6CEMJQQY4dUYAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABaZkjIAMJAEE4BcRsygZIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7hKkBGIAcKFMFJEDGIMBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQrOIAACRGEAAABGjkgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQo4ALMoAIs/EAAiGEYAAFccIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA6Y1KbCSMEAFEAAADIoAKNgRkQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE+wIAMhCZkZgABBCgIAAYAAOGqNYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7AYlMBLE4IQgAASMOAAABAAgBKDFAIQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB7EAAAAAAAADCbiAhJGGIAAAABEUAAMtdOIIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATciMAAAAAAAAAAAKSksgAAAAAAAACU0ADVAAvIIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8jKAAAAAAAAAAAAAAAADH4EAAAAAAAABGIIBCBI5FYoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACE2NFGGHFEGFHFHEAAAmKLMAMAAADeFGEFFHGFEFIIIIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACoAAAAAAAAAAAABQAAEAYQ4AAAAABEAAAAAAAAAACMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAYACAJMAAcBEAAAUAAAQwgQwwwgQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACIAABTDCADDBDAABIAQgIkAAKGEAADUAADJACABDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAIAAAAAAAAAAAACABIkAAAAAABUAACIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAAoNNOOPMQABIMAMEAAAQwBkAAABJIABCCIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAAgAAAAAAQAOkAgBcMBFDUCkAAAAAAAAACIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAACEUsMoAAIAABPGgAItYBMAEAAAQk0g0QyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAACIAAAAAAAMAAYAEKMACEBGoAoAsAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAADA8M88ctIAAARAECIABCgAB8ABEAACoMMM8MMMEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABEAAAAAAAAAAAAAAMCwDE4IeEADcED0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMoAAAAAAAAAAA4ABIIAAAARuwCck0AAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIMZoLaI44ZNMAAABBIIECIABCJGEYIIKpZoo565UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwkEYoQIYoI4Y4Y4Y4Y44YIoQYcEwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABADBAAIEk8kMUckwwYY448o4Yoo4wQEUUU0MQMMAMPIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAiyARCQgBSBjwhwwBDQgwBAAAgQTRCASQwABAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQADQhgBDABAyhQAACAAwQAiAACAACwAABDgAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACjAQAgATABBwgQgBwSiASgBywAAASDBQACCiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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";

const STATUS_COLORS = {
  "בביצוע": { bg:"#E8F5E9", text:"#2E7D32", dot:"#43A047" },
  "ממתין":  { bg:"#FFF8E1", text:"#F57F17", dot:"#FFB300" },
  "הושלם":  { bg:"#E3F2FD", text:"#1565C0", dot:"#1E88E5" },
  "מושהה":  { bg:"#FCE4EC", text:"#B71C1C", dot:"#E53935" },
};

// חישוב שכר שעתי לפי חוק: 9 שעות 100%, שעתיים הבאות 125%, מעבר לכך 150%
function calcHourlyPay(hours, rate) {
  const h = Number(hours)||0, r = Number(rate)||0;
  const reg = Math.min(h, 9);
  const ot125 = Math.min(Math.max(h-9,0), 2);
  const ot150 = Math.max(h-11, 0);
  return { reg, ot125, ot150, pay: reg*r + ot125*r*1.25 + ot150*r*1.5 };
}

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
};
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
    .forEach(r => { map[r.workerName] = (map[r.workerName] || 0) + Number(r.days||1); });
  return map;
}

// ✅ חישוב שכר לעובד: ימים כולל + לפי חודש
function calcWorkerPayroll(worker, reports) {
  const myReports = reports.filter(r => !r._paymentRecord && !r.pendingApproval && (String(r.workerId) === String(worker.id) || r.workerName === worker.name));
  const payType = worker.payType || "daily";
  const rate = Number(worker.dailyRate || 0);
  const hRate = Number(worker.hourlyRate || 0);
  const monthly = Number(worker.monthlySalary || 0);

  // עלות שורה בודדת לפי סוג העסקה
  const rowValue = (r) => {
    if (payType === "hourly") {
      if (r._shift && r.hours != null) return calcHourlyPay(r.hours, hRate).pay;
      // דיווח יומי ישן של עובד שהפך לשעתי — 9 שעות ליום
      return calcHourlyPay(Number(r.days||1) * 9, hRate).pay;
    }
    if (payType === "global") return 0; // גלובלי — שכר חודשי קבוע, לא לפי ימים
    return Number(r.days||1) * rate;
  };

  const totalDays = myReports.reduce((s, r) => s + (r._shift ? ((r.hours||0) > 0 ? 1 : 0) : Number(r.days||1)), 0);
  const totalFuel = myReports.reduce((s,r) => s + (r.fuel ? Number(r.fuelAmt||50) : 0), 0);

  // לפי חודש
  const byMonth = {};
  myReports.forEach(r => {
    if (!r.date) return;
    const month = r.date.slice(0, 7);
    if (!byMonth[month]) byMonth[month] = { days: 0, hours: 0, reg: 0, ot125: 0, ot150: 0, fuel: 0, pay: 0, projects: new Set(), byProject: {} };
    const m = byMonth[month];
    const dv = r._shift ? ((r.hours||0) > 0 ? 1 : 0) : Number(r.days||1);
    m.days += dv;
    if (payType === "hourly") {
      const hrs = r._shift && r.hours != null ? Number(r.hours) : Number(r.days||1) * 9;
      const hp = calcHourlyPay(hrs, hRate);
      m.hours += hrs; m.reg += hp.reg; m.ot125 += hp.ot125; m.ot150 += hp.ot150;
    }
    m.pay += rowValue(r);
    if (r.fuel) m.fuel += Number(r.fuelAmt||50);
    const pName = r.projectName || String(r.projectId || "ללא פרויקט");
    m.projects.add(pName);
    if (!m.byProject[pName]) m.byProject[pName] = { days: 0, fuel: 0, pay: 0 };
    m.byProject[pName].days += dv;
    m.byProject[pName].pay += rowValue(r);
    if (r.fuel) m.byProject[pName].fuel += Number(r.fuelAmt||50);
  });

  // גלובלי: כל חודש עם פעילות = המשכורת הקבועה
  if (payType === "global") {
    Object.values(byMonth).forEach(m => { m.pay = monthly; });
  }

  // סה"כ לפי פרויקט (כל הזמנים)
  const totalByProject = {};
  myReports.forEach(r => {
    const pName = r.projectName || String(r.projectId || "ללא פרויקט");
    if (!totalByProject[pName]) totalByProject[pName] = { days: 0, fuel: 0, pay: 0 };
    totalByProject[pName].days += r._shift ? ((r.hours||0) > 0 ? 1 : 0) : Number(r.days||1);
    totalByProject[pName].pay += rowValue(r);
    if (r.fuel) totalByProject[pName].fuel += Number(r.fuelAmt||50);
  });
  const projectBreakdown = Object.entries(totalByProject)
    .sort((a,b) => b[1].days - a[1].days)
    .map(([name, v]) => ({ name, days: Math.round(v.days*100)/100, fuel: v.fuel, pay: Math.round(v.pay + v.fuel) }));

  const months = Object.entries(byMonth)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, v]) => ({
      month,
      label: new Date(month + "-01").toLocaleDateString("he-IL", { year:"numeric", month:"long" }),
      days: Math.round(v.days*100)/100,
      hours: Math.round(v.hours*100)/100,
      reg: Math.round(v.reg*100)/100,
      ot125: Math.round(v.ot125*100)/100,
      ot150: Math.round(v.ot150*100)/100,
      fuel: v.fuel||0,
      pay: Math.round(v.pay + (v.fuel||0)),
      projects: [...v.projects].join(", "),
      projectRows: Object.entries(v.byProject)
        .sort((a,b) => b[1].days - a[1].days)
        .map(([name, pv]) => ({ name, days: Math.round(pv.days*100)/100, fuel: pv.fuel, pay: Math.round(pv.pay + pv.fuel) })),
    }));

  const totalPay = months.reduce((s,m)=>s+m.pay,0);

  return { totalDays: Math.round(totalDays*100)/100, totalPay, months, projectBreakdown };
}

export default function App() {
  const [projects,  setProjects]  = useState([]);
  const [workers,   setWorkers]   = useState([]);
  const [reports,   setReports]   = useState([]);
  const [adminCode, setAdminCode] = useState("1234");
  const [adminConfigDbid, setAdminConfigDbid] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [org, setOrg] = useState(null);            // הארגון הנוכחי
  const [orgError, setOrgError] = useState("");    // שגיאת טעינת ארגון
  const [superAdmin, setSuperAdmin] = useState(false); // מצב סופר-אדמין
  const [saOrgs, setSaOrgs] = useState([]);        // רשימת ארגונים לסופר-אדמין
  const [saNewOrg, setSaNewOrg] = useState({ slug:"", name:"", adminCode:"" });
  const [saCodeInput, setSaCodeInput] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true); // עד שנטען — לא חוסמים
  const [quotes, setQuotes] = useState([]);
  const [quoteM, setQuoteM] = useState(false);
  const [editQuote, setEditQuote] = useState({ clientName:"", clientPhone:"", title:"", desc:"", amount:"", items:[] });
  const [helpSearch, setHelpSearch] = useState("");
  const [helpOpen, setHelpOpen] = useState(null);

  const [screen,       setScreen]       = useState("home");
  const [codeInput,    setCodeInput]    = useState("");
  const [codeError,    setCodeError]    = useState(false);
  const [loggedWorker, setLoggedWorker] = useState(null);
  const [loggedForeman, setLoggedForeman] = useState(null);

  const [repDate,    setRepDate]    = useState(todayStr());
  const [repProject, setRepProject] = useState("");
  const [repNote,    setRepNote]    = useState("");
  const [dayType,    setDayType]    = useState("full"); // "full" | "half"
  const [repFuel,    setRepFuel]    = useState(false); // true = 50 ₪ fuel
  const [repSent,    setRepSent]    = useState(false);
  const [workerView, setWorkerView] = useState("report"); // "report" | "calendar"
  const [wCalMonth, setWCalMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  });
  const [pendingDate, setPendingDate] = useState("");
  const [showDateApproval, setShowDateApproval] = useState(false);
  const [pendingReports, setPendingReports] = useState([]); // reports waiting manager approval

  const [mgTab,      setMgTab]      = useState("reports");
  const [detailId,   setDetailId]   = useState(null);
  const [projTab,    setProjTab]    = useState("active"); // "active" | "completed"
  const [newPM,      setNewPM]      = useState(false);
  const [newWM,      setNewWM]      = useState(false);
  const [editWM,     setEditWM]     = useState(false);
  const [editWorker, setEditWorker] = useState(null);
  const [assignM,    setAssignM]    = useState(false);
  const [assignPid,  setAssignPid]  = useState(null);
  const [newAdminCode, setNAC]      = useState("");
  const [newForemanM, setNewForemanM] = useState(false);
  const [newForeman, setNewForeman] = useState({ name:"", role:"", dailyRate:"", code:"", foremanCode:"" });
  const [promoteId, setPromoteId]   = useState("");
  const [planUploading, setPlanUploading] = useState(false);
  const [payrollWorker, setPayrollWorker] = useState(null);
  const [paidMonths, setPaidMonths] = useState({}); // key: workerId_month
  const [partialInput, setPartialInput] = useState({}); // key: workerId_month -> amount string
  const [showPartial, setShowPartial] = useState({}); // key: workerId_month -> bool
  const [payrollView, setPayrollView] = useState("pending");
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  });
  const [calEvents, setCalEvents] = useState({}); // key: YYYY-MM-DD -> {workers:[], tasks:[]}
  const [calEditDay, setCalEditDay] = useState(null);
  const [calEditData, setCalEditData] = useState({assignments:[], tasks:""});
  const [equipList, setEquipList] = useState([]); // [{id, name, qty, done}]
  const [equipNew, setEquipNew] = useState({name:"", qty:""}); // "pending" | "history"
  const [editPaymentKey, setEditPaymentKey] = useState(null);
  const [invoiceAnalyzing, setInvoiceAnalyzing] = useState(false); // per project
  const [invoiceResults, setInvoiceResults] = useState({}); // projectId -> [{desc,qty,price}] // key being edited
  const [editPaymentAmt, setEditPaymentAmt] = useState("");

  const emptyProj = { name:"", status:"ממתין", progress:0, startDate:"", endDate:"", plannedDays:"", materialCost:"", totalCost:"", projectManager:"", plannedWorkers:"", highlights:"", phases:[], workers:[], expenses:[] };
  const [newProject, setNewProject] = useState(emptyProj);
  const [editProj,   setEditProj]   = useState(null);
  const [newWorker,  setNewWorker]  = useState({ name:"", code:"", role:"", dailyRate:"", payType:"daily", hourlyRate:"", monthlySalary:"", showFuel:true, fuelAmount:50 });

  const detailProject = projects.find(p => String(p.id) === String(detailId)) || null;
  const assignProject = projects.find(p => String(p.id) === String(assignPid)) || null;

  // Debounce ref for Supabase updates
  const debounceRef = useRef({});
  const lastEditRef = useRef(0);
  const updateProjFieldDebounced = useCallback((proj, changes) => {
    lastEditRef.current = Date.now();
    // Update local state immediately (no cursor jump)
    setEditProj(p => p ? {...p, ...changes} : p);
    setProjects(prev => prev.map(p => p._dbid===proj._dbid ? {...p,...changes} : p));
    // Debounce the Supabase call by 800ms
    const key = proj._dbid;
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(async () => {
      const latest = { ...proj, ...changes };
      await dbUpdate("projects", proj._dbid, latest);
    }, 800);
  }, []);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [p, w, r] = await Promise.all([dbGet("projects"), dbGet("workers"), dbGet("reports")]);
      // load calendar and equipment safely (tables may not exist yet)
      try {
        const cal = await dbGet("calendar");
        const calMap = {};
        cal.forEach(c => { calMap[c.date] = { ...c, _dbid: c._dbid }; });
        setCalEvents(calMap);
      } catch(e) { console.log("calendar table not ready yet"); }
      try {
        const eq = await dbGet("equipment");
        setEquipList(eq.map(e => ({...e})));
      } catch(e) { console.log("equipment table not ready yet"); }
      setQuotes(p.filter(x => x._quote));
      setProjects(p.filter(x => !x._quote));
      const termsRec = w.find(x => x._termsRecord);
      setTermsAccepted(!!termsRec && termsRec.termsVersion === TERMS_VERSION);
      const realWorkers = w.filter(x => !x._isConfig && !x._termsRecord);
      // load payment records - keep only latest per key
      const payRecs = r.filter(x => x._paymentRecord);
      const paidMap = {};
      payRecs.sort((a,b) => (a.id||0)-(b.id||0)).forEach(x => {
        const key = `${x.workerId}_${x.month}`;
        if (x.paid) {
          paidMap[key] = { amount: x.amount, paidAmt: x.paidAmt||x.amount, partial: x.partial||false, fullyPaid: x.fullyPaid!==false, paidAt: x.paidAt||"" };
        } else {
          delete paidMap[key];
        }
      });
      setPaidMonths(paidMap);
      setWorkers(realWorkers);
      // Reports: anything without _paymentRecord goes to normal OR pending
      const normalReports = r.filter(x => !x._paymentRecord && x.pendingApproval !== true);
      const pendingReps = r.filter(x => !x._paymentRecord && x.pendingApproval === true);
      setReports(normalReports);
      setPendingReports(pendingReps);
      const configRow = w.find(x => x._isConfig && x._adminCode);
      if (configRow) { setAdminCode(configRow._adminCode); setAdminConfigDbid(configRow._dbid); }
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  // ===== אתחול: זיהוי ארגון מהכתובת → טעינת נתונים =====
  useEffect(() => {
    (async () => {
      if (!ORG_SLUG) {
        // ללא ארגון בכתובת — מסך שער (בחירה/סופר-אדמין)
        setOrgError("landing");
        setLoading(false);
        return;
      }
      try {
        const o = await orgGetBySlug(ORG_SLUG);
        if (!o) { setOrgError("notfound"); setLoading(false); return; }
        if (o.active === false) { setOrgError("suspended"); setLoading(false); return; }
        CURRENT_ORG = o;
        setOrg(o);
        if (AUTH_TOKEN) {
          loadAll().catch(() => { setAuthToken(null); setLoading(false); });
        } else {
          setLoading(false);
        }
      } catch(e) {
        setOrgError("error: " + e.message);
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh data every 60 seconds while on manager screen
  useEffect(() => {
    if (screen !== "mgr" && screen !== "foreman") return;
    const interval = setInterval(() => {
      if (!AUTH_TOKEN) return;
      // לא מרעננים בזמן הקלדה — מונע מחיקת טקסט באמצע כתיבה
      if (Date.now() - lastEditRef.current < 20000) return;
      loadAll(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [screen, loadAll]);

  const projReports = id => reports.filter(r => String(r.projectId) === String(id));
  const getWkrNames = (ids=[]) => ids.map(id => workers.find(w => String(w.id)===String(id))?.name).filter(Boolean).join(", ");

  // ====== מסלול נוכחי ======
  const plan = PLANS[org?.settings?.plan] || PLANS.free;

  // ====== הרשאות מנהל עבודה ======
  const isForeman = screen === "foreman";
  const foremanProjectIds = (loggedForeman?.foremanProjects || []).map(String);
  const canSeeProject = (pid) => !isForeman || foremanProjectIds.includes(String(pid));
  const visibleProjects = isForeman ? projects.filter(p => canSeeProject(p.id)) : projects;
  const visibleReports  = isForeman ? reports.filter(r => canSeeProject(r.projectId)) : reports;
  const visiblePending  = isForeman ? pendingReports.filter(r => canSeeProject(r.projectId)) : pendingReports;

  const foremanLogin = async () => {
    try {
      const res = await apiLogin("foreman", codeInput.trim());
      rememberOrg();
      setLoggedForeman(res.worker); setCodeInput(""); setCodeError(false); setMgTab("reports"); setDetailId(null); setScreen("foreman");
      loadAll(true);
    } catch(e) { setCodeError(true); }
  };

  const workerLogin = async () => {
    try {
      const res = await apiLogin("worker", codeInput.trim());
      rememberOrg();
      setLoggedWorker(res.worker); setCodeInput(""); setCodeError(false); setScreen("worker");
      setRepSent(false); setRepDate(todayStr()); setRepProject(""); setRepNote(""); setDayType("full"); setRepFuel(false); setWorkerView("report");
      loadAll(true);
    } catch(e) { setCodeError(true); }
  };
  const managerLogin = async () => {
    try {
      await apiLogin("manager", codeInput.trim());
      rememberOrg(); setCodeInput(""); setCodeError(false); setScreen("mgr");
      loadAll(true);
    } catch(e) { setCodeError(true); }
  };

  // ====== שעון נוכחות לעובד שעתי ======
  const myOpenShift = loggedWorker ? reports.find(r =>
    r._shift && !r.clockOut &&
    (String(r.workerId)===String(loggedWorker.id) || r.workerName===loggedWorker.name)
  ) : null;

  const clockIn = async () => {
    if (!repProject) { alert("בחר פרויקט לפני הפעלת השעון"); return; }
    try {
      const proj = projects.find(p => String(p.id) === String(repProject));
      const rec = { _shift:true, workerId: loggedWorker.id, workerName: loggedWorker.name,
        projectId: repProject, projectName: proj?.name||"", date: todayStr(),
        clockIn: Date.now(), clockOut: null, fuel: repFuel, fuelAmt: repFuel ? Number(loggedWorker.fuelAmount||50) : 0, id: Date.now() };
      const saved = await dbInsert("reports", rec);
      setReports(prev => [...prev, saved]);
    } catch(e) { alert("שגיאה: " + e.message); }
  };

  const clockOut = async () => {
    if (!myOpenShift) return;
    try {
      const now = Date.now();
      const hours = (now - myOpenShift.clockIn) / 3600000;
      const fuelOn = repFuel || myOpenShift.fuel;
      const updated = { ...myOpenShift, clockOut: now, hours: Math.round(hours*100)/100, fuel: fuelOn, fuelAmt: fuelOn ? Number(loggedWorker.fuelAmount||50) : 0 };
      const { _dbid, ...data } = updated;
      await dbUpdate("reports", myOpenShift._dbid, data);
      setReports(prev => prev.map(r => r._dbid===myOpenShift._dbid ? updated : r));
      setRepSent(true);
    } catch(e) { alert("שגיאה: " + e.message); }
  };

  const submitReport = async () => {
    if (!repProject) return;
    try {
      // Block duplicate report: same worker, same date
      const existingReport = [...reports, ...pendingReports].find(r =>
        !r._paymentRecord &&
        r.date === repDate &&
        (String(r.workerId) === String(loggedWorker.id) || r.workerName === loggedWorker.name)
      );
      if (existingReport) {
        alert("כבר דיווחת על תאריך זה! לא ניתן לדווח פעמיים על אותו יום.");
        return;
      }
      const proj = projects.find(p => String(p.id) === String(repProject));
      const today = todayStr();
      const isPast = repDate < today; // only strictly BEFORE today
      const newRep = { workerId: loggedWorker.id, workerName: loggedWorker.name, projectId: repProject, projectName: proj?.name || "", date: repDate, note: repNote, days: dayType==="half" ? 0.5 : 1, dayType, fuel: repFuel, fuelAmt: repFuel ? Number(loggedWorker.fuelAmount||50) : 0, id: Date.now(), pendingApproval: isPast };
      const saved = await dbInsert("reports", newRep);
      if (isPast) {
        setPendingReports(prev => [...prev, saved]);
      } else {
        setReports(prev => [...prev, saved]);
      }
      const uniqueDays = uniqueWorkDaysForProject([...reports, saved], repProject);
      const proj2 = projects.find(p => String(p.id) === String(repProject));
      if (proj2) {
        const updated = { ...proj2, actualDays: uniqueDays };
        await dbUpdate("projects", proj2._dbid, updated);
        setProjects(prev => prev.map(p => String(p.id)===String(repProject) ? updated : p));
      }
      setRepSent(true);
    } catch(e) {
      alert("שגיאה בשליחת הדיווח: " + e.message + "\nנסה שוב.");
      return;
    }
  };

  const addProject = async () => {
    if (!newProject.name) return;
    const activeCount = projects.filter(p => p.status !== "הושלם").length;
    if (activeCount >= plan.maxProjects) {
      alert(`המסלול הנוכחי מוגבל ל-${plan.maxProjects} פרויקטים פעילים.\nסיים פרויקט קיים או צרו קשר לשדרוג המסלול.`);
      return;
    }
    const p = { ...newProject, id: Date.now(), progress: Number(newProject.progress)||0 };
    const saved = await dbInsert("projects", p);
    setProjects(prev => [...prev, saved]);
    setNewProject(emptyProj); setNewPM(false);
  };

  const addWorker = async () => {
    if (!newWorker.name || !newWorker.code) return;
    if (workers.length >= plan.maxWorkers) {
      alert(`המסלול הנוכחי מוגבל ל-${plan.maxWorkers} עובדים.\nלשדרוג המסלול צרו קשר עם הספק.`);
      return;
    }
    const w = { ...newWorker, id: Date.now() };
    const saved = await dbInsert("workers", w);
    setWorkers(prev => [...prev, saved]);
    setNewWorker({ name:"", code:"", role:"", dailyRate:"", payType:"daily", hourlyRate:"", monthlySalary:"", showFuel:true, fuelAmount:50 }); setNewWM(false);
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
    if (!window.confirm(`למחוק את הדיווח של ${rep.workerName} מתאריך ${rep.date}?`)) return;
    if (!window.confirm("אישור סופי — פעולה זו בלתי הפיכה. האם למחוק?")) return;
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

  const markPaid = async (workerId, month, amount, partial=false, partialAmt=0) => {
    const key = `${workerId}_${month}`;
    const paidAt = new Date().toLocaleDateString("he-IL");
    // Add to existing paid amount - accumulate, do not replace
    const existing = paidMonths[key];
    const prevPaid = existing ? Number(existing.paidAmt||0) : 0;
    const addAmt = partial ? Number(partialAmt) : (amount - prevPaid);
    const newPaidAmt = prevPaid + addAmt;
    const isFullyPaid = newPaidAmt >= amount;
    const entry = { amount, paidAmt: newPaidAmt, partial: !isFullyPaid, paidAt, fullyPaid: isFullyPaid };
    const newPaid = {...paidMonths, [key]: entry };
    setPaidMonths(newPaid);
    setShowPartial(p => ({...p, [key]: false}));
    setPartialInput(p => ({...p, [key]: ""}));
    await dbInsert("reports", { _paymentRecord: true, workerId, month, paid: true, partial: !isFullyPaid, paidAmt: newPaidAmt, amount, paidAt, id: Date.now() });
  };

  const unmarkPaid = async (workerId, month) => {
    const key = `${workerId}_${month}`;
    const newPaid = {...paidMonths};
    delete newPaid[key];
    setPaidMonths(newPaid);
    await dbInsert("reports", { _paymentRecord: true, workerId, month, paid: false, id: Date.now() });
  };

  const approveReport = async (rep) => {
    const updated = { ...rep, pendingApproval: false };
    delete updated._dbid;
    await dbUpdate("reports", rep._dbid, updated);
    setPendingReports(prev => prev.filter(r => r._dbid !== rep._dbid));
    setReports(prev => [...prev, { ...updated, _dbid: rep._dbid }]);
  };

  const rejectReport = async (rep) => {
    if (!window.confirm(`לדחות את הדיווח של ${rep.workerName} מתאריך ${rep.date}?`)) return;
    await dbDelete("reports", rep._dbid);
    setPendingReports(prev => prev.filter(r => r._dbid !== rep._dbid));
  };

  const saveCalDay = async (date, data) => {
    try {
      // טעינה טרייה מהשרת — מניעת התנגשות בין שני מכשירים
      let existing = calEvents[date];
      try {
        const freshCal = await dbGet("calendar");
        const freshDay = freshCal.find(x => x.date === date);
        if (freshDay) existing = freshDay;
      } catch(e) {}
      // מנהל עבודה עורך רק את השיבוצים של הפרויקטים שלו — השאר נשמרים
      const prevAssigns = existing?.assignments?.length
        ? existing.assignments
        : (existing?.workers?.length ? [{ projectId:"", workers: existing.workers }] : []);
      const keepOthers = isForeman ? prevAssigns.filter(a => !canSeeProject(a.projectId)) : [];
      const merged = [...keepOthers, ...(data.assignments || [])];
      // בדיקת כפילות מול הנתונים העדכניים (למנהל עבודה — חסימה; למנהל — כבר אישר בלחיצה)
      if (isForeman) {
        const seen = {};
        for (const a of merged) {
          for (const wid of (a.workers||[])) {
            if (seen[wid]) {
              const wk = workers.find(w=>String(w.id)===String(wid));
              const pr = projects.find(p=>String(p.id)===String(seen[wid].projectId));
              alert(`${wk?.name||"עובד"} כבר משובץ ליום זה לפרויקט "${pr?.name||"אחר"}" (שובץ ע"י: ${seen[wid].assignedBy||"לא ידוע"}). השיבוץ לא נשמר.`);
              return;
            }
            seen[wid] = a;
          }
        }
      }
      const entry = { date, assignments: merged, tasks: data.tasks,
                      workers: merged.flatMap(a => a.workers||[]) };
      if (existing && existing._dbid) {
        await dbUpdate("calendar", existing._dbid, entry);
        setCalEvents(prev => ({...prev, [date]: {...entry, _dbid: existing._dbid}}));
      } else {
        const saved = await dbInsert("calendar", {...entry, id: Date.now()});
        setCalEvents(prev => ({...prev, [date]: saved}));
      }
      setCalEditDay(null);
    } catch(e) {
      alert("שגיאה בשמירת יומן: " + e.message);
    }
  };

  const addEquipItem = async () => {
    if (!equipNew.name.trim()) return;
    try {
      const item = { name: equipNew.name.trim(), qty: equipNew.qty || "1", done: false, id: Date.now() };
      const saved = await dbInsert("equipment", item);
      setEquipList(prev => [...prev, saved]);
      setEquipNew({name:"", qty:""});
    } catch(e) {
      alert("שגיאה בשמירת פריט: " + e.message);
    }
  };

  const toggleEquipDone = async (item) => {
    const updated = {...item, done: !item.done};
    await dbUpdate("equipment", item._dbid, updated);
    setEquipList(prev => prev.map(e => e._dbid===item._dbid ? updated : e));
  };

  const delEquipItem = async (item) => {
    await dbDelete("equipment", item._dbid);
    setEquipList(prev => prev.filter(e => e._dbid!==item._dbid));
  };

  const analyzeInvoice = async (projectId, imageBase64, mimeType) => {
    setInvoiceAnalyzing(true);
    try {
      if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === "PASTE_YOUR_KEY_HERE") {
        alert("צריך להגדיר מפתח API של Anthropic בקוד. פנה למפתח.");
        setInvoiceAnalyzing(false);
        return;
      }
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
              { type: "text", text: 'אתה מנתח חשבוניות והצעות מחיר בעברית. חלץ מהמסמך את כל שורות המוצרים. לכל שורה: תאור מוצר (desc), כמות (qty - רק המספר), וסהכ מחיר של השורה אחרי הנחה (price - מספר בלבד ללא סימן שקל). החזר JSON בלבד ללא שום טקסט נוסף, ללא markdown, בפורמט המדויק: {"items":[{"desc":"שם","qty":"כמות","price":מספר}],"total":מספר}. total = המחיר הסופי של המסמך.' }
            ]
          }]
        })
      });
      const data = await response.json();
      const text = data.content?.find(b => b.type==="text")?.text || "{}";
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);

      // Save to project expenses
      const proj = projects.find(p => String(p.id)===String(projectId));
      if (proj && parsed.items) {
        const newExpenses = [
          ...(proj.expenses||[]),
          ...parsed.items.map(item => ({
            id: Date.now() + Math.random(),
            desc: `${item.desc}${item.qty ? " × "+item.qty : ""}`,
            amount: item.price||0,
            date: todayStr(),
            fromInvoice: true,
            qty: item.qty||""
          }))
        ];
        await updateProjField(proj, { expenses: newExpenses });
      }

      setInvoiceResults(prev => ({...prev, [projectId]: parsed.items||[]}));
    } catch(e) {
      alert("שגיאה בניתוח: " + e.message);
    }
    setInvoiceAnalyzing(false);
  };

  // פתיחת קובץ dataURL — ספארי חוסם data: ב-target blank, לכן ממירים ל-Blob
  const openPlan = (plan) => {
    // תוכניות חדשות — קישור ישיר ל-Storage
    if (plan.url) { window.open(plan.url, "_blank"); return; }
    // תוכניות ישנות — dataUrl בבסיס הנתונים
    try {
      const [meta, b64] = plan.dataUrl.split(",");
      const mime = (meta.match(/data:(.*?);/)||[])[1] || "application/octet-stream";
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i=0; i<bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      window.open(url, "_blank");
      setTimeout(()=>URL.revokeObjectURL(url), 60000);
    } catch(e) { alert("שגיאה בפתיחת הקובץ: " + e.message); }
  };

  // ====== ניהול מנהלי עבודה ======
  const updateWorkerFields = async (w, changes) => {
    const updated = { ...w, ...changes };
    await dbUpdate("workers", w._dbid, updated);
    setWorkers(prev => prev.map(x => x._dbid===w._dbid ? updated : x));
    if (loggedForeman && loggedForeman._dbid === w._dbid) setLoggedForeman(updated);
  };

  const toggleForemanProject = async (w, pid) => {
    const cur = (w.foremanProjects||[]).map(String);
    const next = cur.includes(String(pid)) ? cur.filter(x=>x!==String(pid)) : [...cur, String(pid)];
    await updateWorkerFields(w, { foremanProjects: next });
  };

  const promoteToForeman = async () => {
    if (!promoteId) return;
    const w = workers.find(x => String(x.id)===String(promoteId));
    if (!w) return;
    await updateWorkerFields(w, { isForeman: true, foremanCode: w.foremanCode||"", foremanProjects: w.foremanProjects||[] });
    setPromoteId("");
  };

  const demoteForeman = async (w) => {
    if (!window.confirm(`לבטל את ההרשאה של ${w.name} כמנהל עבודה?`)) return;
    await updateWorkerFields(w, { isForeman: false, foremanCode: "", foremanProjects: [] });
  };

  const addNewForeman = async () => {
    if (!newForeman.name.trim() || !newForeman.foremanCode.trim()) {
      alert("יש למלא שם וקוד מנהל עבודה");
      return;
    }
    try {
      const w = {
        name: newForeman.name.trim(),
        role: newForeman.role.trim() || "מנהל עבודה",
        dailyRate: newForeman.dailyRate || "",
        code: newForeman.code.trim(),
        isForeman: true,
        foremanCode: newForeman.foremanCode.trim(),
        foremanProjects: [],
        id: Date.now()
      };
      const saved = await dbInsert("workers", w);
      setWorkers(prev => [...prev, saved]);
      setNewForeman({ name:"", role:"", dailyRate:"", code:"", foremanCode:"" });
      setNewForemanM(false);
    } catch(e) { alert("שגיאה: " + e.message); }
  };

  // ====== הצעות מחיר ======
  const saveQuote = async () => {
    if (!editQuote.title.trim()) { alert("יש למלא שם פרויקט/עבודה"); return; }
    try {
      if (editQuote._dbid) {
        const { _dbid, ...data } = editQuote;
        await dbUpdate("projects", _dbid, data);
        setQuotes(prev => prev.map(q => q._dbid===_dbid ? editQuote : q));
      } else {
        const q = { ...editQuote, _quote:true, status:"נשלחה", id: Date.now(), date: todayStr() };
        const saved = await dbInsert("projects", q);
        setQuotes(prev => [...prev, saved]);
      }
      setQuoteM(false);
      setEditQuote({ clientName:"", clientPhone:"", title:"", desc:"", amount:"", items:[] });
    } catch(e) { alert("שגיאה: " + e.message); }
  };

  const delQuote = async (q) => {
    if (!window.confirm(`למחוק את ההצעה "${q.title}"?`)) return;
    await dbDelete("projects", q._dbid);
    setQuotes(prev => prev.filter(x => x._dbid !== q._dbid));
  };

  const setQuoteStatus = async (q, status) => {
    const updated = { ...q, status };
    const { _dbid, ...data } = updated;
    await dbUpdate("projects", _dbid, data);
    setQuotes(prev => prev.map(x => x._dbid===q._dbid ? updated : x));
  };

  const convertQuote = async (q) => {
    if (!window.confirm(`ההצעה "${q.title}" נסגרה? 🎉\nהיא תהפוך לפרויקט פעיל.`)) return;
    try {
      const total = quoteTotal(q);
      const itemsTxt = (q.items||[]).map(it =>
        `${it.desc||"סעיף"} — ₪${Number(it.amount||0).toLocaleString("he-IL")} (${it.withMaterial!==false?"כולל חומר":"בלי חומר"})`
      ).join("\n");
      const proj = { ...q, status:"בתהליך", name: q.title,
        description: [q.desc, itemsTxt].filter(Boolean).join("\n"),
        quoteClosedAt: todayStr(), workers: [],
        clientPayments: total>0
          ? [{ id: Date.now(), desc:'סה"כ לפי הצעת מחיר', amount: total, received:false }]
          : [] };
      delete proj._quote;
      const { _dbid, ...data } = proj;
      await dbUpdate("projects", q._dbid, data);
      setQuotes(prev => prev.filter(x => x._dbid !== q._dbid));
      setProjects(prev => [...prev, { ...proj, _dbid: q._dbid }]);
      setMgTab("projects");
    } catch(e) { alert("שגיאה: " + e.message); }
  };

  const acceptTerms = async () => {
    try {
      const rec = { _termsRecord: true, termsVersion: TERMS_VERSION, acceptedAt: new Date().toISOString(), acceptedBy: "מנהל", id: Date.now() };
      await dbInsert("workers", rec);
      setTermsAccepted(true);
    } catch(e) { alert("שגיאה בשמירת האישור: " + e.message); }
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
  const PayTypeFields = ({ obj, setObj }) => (
    <>
      <div style={{ marginBottom:11 }}>
        <LBL t="סוג העסקה"/>
        <div style={{ display:"flex", gap:6 }}>
          {[{v:"daily",l:"יומי"},{v:"hourly",l:"שעתי"},{v:"global",l:"גלובלי"}].map(o=>(
            <button key={o.v} type="button" onClick={()=>setObj({...obj, payType:o.v})}
              style={{ flex:1, background:(obj.payType||"daily")===o.v?"#1A1A2E":"#F0F0EC", color:(obj.payType||"daily")===o.v?"#E8C547":"#888", border:"none", borderRadius:9, padding:"9px 0", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>
              {o.l}
            </button>
          ))}
        </div>
      </div>
      {(obj.payType||"daily")==="daily" && (
        <label style={{ display:"block", marginBottom:11 }}>
          <LBL t="שכר יומי (₪)"/>
          <input type="number" value={obj.dailyRate||""} placeholder="550" onChange={e=>setObj({...obj, dailyRate:e.target.value})} style={inp}/>
        </label>
      )}
      {obj.payType==="hourly" && (
        <label style={{ display:"block", marginBottom:11 }}>
          <LBL t="שכר שעתי (₪)"/>
          <input type="number" value={obj.hourlyRate||""} placeholder="60" onChange={e=>setObj({...obj, hourlyRate:e.target.value})} style={inp}/>
          <p style={{ margin:"4px 0 0", fontSize:11, color:"#888" }}>9 שעות ראשונות 100% · שעות 10-11 ‏125% · משעה 12 ‏150%</p>
        </label>
      )}
      {obj.payType==="global" && (
        <label style={{ display:"block", marginBottom:11 }}>
          <LBL t="משכורת חודשית (₪)"/>
          <input type="number" value={obj.monthlySalary||""} placeholder="12000" onChange={e=>setObj({...obj, monthlySalary:e.target.value})} style={inp}/>
        </label>
      )}
      <div style={{ background:"#F9F9F9", borderRadius:9, padding:"9px 12px", marginBottom:11 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:13, fontWeight:600 }}>⛽ הצג לעובד כפתור דלק</span>
          <button type="button" onClick={()=>setObj({...obj, showFuel: obj.showFuel===false ? true : false})}
            style={{ background: obj.showFuel!==false ? "#1A1A2E":"#DDD", color: obj.showFuel!==false ? "#E8C547":"#777", border:"none", borderRadius:8, padding:"4px 14px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>
            {obj.showFuel!==false ? "✓ כן" : "לא"}
          </button>
        </div>
        {obj.showFuel!==false && (
          <label style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
            <span style={{ fontSize:12, color:"#555", whiteSpace:"nowrap" }}>סכום דלק ליום (₪)</span>
            <input type="number" value={obj.fuelAmount ?? 50} placeholder="50"
              onChange={e=>setObj({...obj, fuelAmount: e.target.value})}
              style={{ flex:1, border:"1.5px solid #DDD", borderRadius:8, padding:"6px 10px", fontSize:13, fontFamily:"Heebo,sans-serif", outline:"none", background:"#fff" }}/>
          </label>
        )}
      </div>
    </>
  );

  const LBL  = ({ t }) => <span style={{ fontSize:13, fontWeight:600, display:"block", marginBottom:5 }}>{t}</span>;
  const GFont = () => <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800&display=swap" rel="stylesheet" />;
  const base = { fontFamily:"Heebo,sans-serif", direction:"rtl", minHeight:"100vh" };

  const orgLogoSrc = org?.logo || (org?.slug==="gne" ? LOGO_URL : null);
  const LogoSmall = () => orgLogoSrc
    ? <img src={orgLogoSrc} alt={org?.name||""} style={{ height:38, borderRadius:6, objectFit:"contain", background:"#fff", padding:3 }}/>
    : <span style={{ color:"#E8C547", fontWeight:800, fontSize:16 }}>{org?.name||"BuildTrack"}</span>;
  const LogoBig   = () => <div style={{ textAlign:"center", marginBottom:10 }}>
    {orgLogoSrc
      ? <img src={orgLogoSrc} alt={org?.name||""} style={{ height:110, objectFit:"contain", borderRadius:12 }}/>
      : <h2 style={{ color:"#1A1A2E", fontWeight:800, fontSize:22, margin:0 }}>{org?.name||"BuildTrack"}</h2>}
  </div>;

  if (loading) return (
    <div style={{ ...base, background:"#1A1A2E", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <GFont/>
      <div style={{ textAlign:"center" }}>
        <img src={LOGO_URL} alt="G&E" style={{ height:100, borderRadius:12, background:"#fff", padding:"8px 16px", marginBottom:20 }}/>
        <p style={{ color:"#E8C547", fontSize:16, fontWeight:600 }}>טוען נתונים...</p>
      </div>
    </div>
  );

  // ===== מסכי שער (ללא ארגון / שגיאה / סופר-אדמין) =====
  if (orgError && !superAdmin) return (
    <div style={{ ...base, background:"#1A1A2E", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <GFont/>
      <div style={{ background:"#fff", borderRadius:20, padding:30, width:"100%", maxWidth:340, direction:"rtl", textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:10 }}>🏗️</div>
        <h2 style={{ margin:"0 0 8px", fontWeight:800, fontSize:20 }}>BuildTrack</h2>
        {orgError==="landing" && <>
          <p style={{ margin:"0 0 16px", color:"#777", fontSize:14 }}>מערכת ניהול אתרי בנייה לקבלנים.<br/>כניסה דרך הקישור הייעודי של העסק שלך.</p>
          <a href={WHATSAPP_QUOTE} target="_blank" rel="noreferrer"
            style={{ display:"block", background:"#25D366", color:"#fff", borderRadius:12, padding:"13px 0", fontWeight:800, fontSize:15, textDecoration:"none", marginBottom:16, fontFamily:"Heebo,sans-serif" }}>
            💬 קבל הצעת מחיר בוואטסאפ
          </a>
        </>}
        {orgError==="notfound" && <p style={{ margin:"0 0 16px", color:"#E53935", fontSize:14 }}>הכתובת לא מוכרת. בדוק את הקישור שקיבלת.</p>}
        {orgError==="suspended" && <p style={{ margin:"0 0 16px", color:"#E53935", fontSize:14 }}>המערכת מושהית זמנית.<br/>צור קשר עם הספק.</p>}
        {orgError.startsWith?.("error") && <p style={{ margin:"0 0 16px", color:"#E53935", fontSize:13 }}>{orgError}</p>}
        <input value={saCodeInput} onChange={e=>setSaCodeInput(e.target.value)} placeholder="קוד ניהול ראשי" type="password"
          style={{ ...inp, textAlign:"center", marginBottom:8, fontSize:13 }}/>
        <button onClick={async ()=>{
          try {
            await apiLogin("master", saCodeInput.trim());
            const all = await orgGetAll();
            setSaOrgs(all.filter(o=>o.slug!=="_config")); setSuperAdmin(true); setSaCodeInput("");
          } catch(e) { alert("קוד שגוי"); }
        }} style={{ ...btnG, width:"100%", fontSize:13 }}>ניהול ראשי</button>
      </div>
    </div>
  );

  // ===== מסך סופר-אדמין =====
  if (superAdmin) return (
    <div style={{ ...base, background:"#F5F5F0", minHeight:"100vh", direction:"rtl" }}>
      <GFont/>
      <header style={{ background:"#1A1A2E", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ color:"#E8C547", fontWeight:800, fontSize:16 }}>👑 ניהול ראשי — BuildTrack</span>
        <div style={{ display:"flex", gap:8 }}>
        <button onClick={async ()=>{
          const cur = window.prompt("קוד ניהול חדש (לפחות 6 תווים):");
          if (!cur) return;
          if (cur.trim().length < 6) { alert("קוד קצר מדי"); return; }
          if (!window.confirm(`לשנות את קוד הניהול הראשי ל: ${cur.trim()}?`)) return;
          try { await setMasterCode(cur.trim()); alert("קוד הניהול עודכן! שמור אותו במקום בטוח."); }
          catch(e) { alert("שגיאה: " + e.message); }
        }} style={{ background:"rgba(232,197,71,0.2)", color:"#E8C547", border:"none", borderRadius:8, padding:"5px 12px", fontSize:13, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>🔑 שנה קוד</button>
        <button onClick={()=>{ setSuperAdmin(false); setAuthToken(null); }} style={{ background:"rgba(255,255,255,0.1)", color:"#ccc", border:"none", borderRadius:8, padding:"5px 12px", fontSize:13, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>יציאה</button>
        </div>
      </header>
      <main style={{ padding:20, maxWidth:520, margin:"0 auto" }}>
        {/* הוספת קבלן */}
        <div style={{ background:"#fff", borderRadius:14, padding:"16px 18px", marginBottom:16, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
          <h3 style={{ margin:"0 0 12px", fontSize:15, fontWeight:700 }}>➕ קבלן חדש</h3>
          <input value={saNewOrg.slug} onChange={e=>setSaNewOrg({...saNewOrg, slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"")})}
            placeholder="כתובת (אנגלית, למשל: kablan-a)" style={{ ...inp, marginBottom:8, direction:"ltr", textAlign:"left" }}/>
          <input value={saNewOrg.name} onChange={e=>setSaNewOrg({...saNewOrg, name:e.target.value})}
            placeholder="שם העסק (למשל: כהן בנייה)" style={{ ...inp, marginBottom:8 }}/>
          <input value={saNewOrg.adminCode} onChange={e=>setSaNewOrg({...saNewOrg, adminCode:e.target.value})}
            placeholder="קוד מנהל ראשוני" style={{ ...inp, marginBottom:10, letterSpacing:2 }}/>
          <button onClick={async ()=>{
            if (!saNewOrg.slug || !saNewOrg.name || !saNewOrg.adminCode) { alert("מלא את כל השדות"); return; }
            try {
              const created = await orgInsert({ slug: saNewOrg.slug, name: saNewOrg.name, active: true, settings: {} });
              // יצירת רשומת קוד מנהל בארגון החדש
              await fetch(`${SUPABASE_URL}/rest/v1/workers`, { method:"POST", headers:hdrs(),
                body: JSON.stringify({ data: { _isConfig:true, _adminCode: saNewOrg.adminCode, id: Date.now() }, org_id: created.id }) });
              setSaOrgs((await orgGetAll()).filter(o=>o.slug!=="_config"));
              setSaNewOrg({ slug:"", name:"", adminCode:"" });
              const link = `${window.location.origin}/${created.slug}`;
              const text = `שלום! מצורף קישור למערכת ניהול האתרים של ${created.name}:\n${link}\n\nפתח את הקישור בטלפון ← לחץ שיתוף ← "הוספה למסך הבית" — וזהו, יש לך אפליקציה 📱`;
              if (navigator.share) {
                try { await navigator.share({ title: created.name, text }); } catch(e) {}
              } else {
                alert(`נוצר! הקישור: ${link}`);
              }
            } catch(e) { alert("שגיאה: " + e.message); }
          }} style={{ ...btnD, width:"100%" }}>צור קבלן</button>
        </div>

        {/* רשימת קבלנים */}
        {saOrgs.map(o => (
          <div key={o._dbid} style={{ background:"#fff", borderRadius:14, padding:"14px 18px", marginBottom:11, boxShadow:"0 2px 8px rgba(0,0,0,0.07)", borderRight:`4px solid ${o.active!==false?"#22C55E":"#E53935"}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div>
                <p style={{ margin:0, fontWeight:700, fontSize:15 }}>{o.name}</p>
                <p style={{ margin:0, fontSize:12, color:"#888", direction:"ltr", textAlign:"right" }}>/{o.slug}</p>
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:o.active!==false?"#2E7D32":"#E53935" }}>{o.active!==false?"● פעיל":"● מושהה"}</span>
            </div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:8 }}>
              {Object.entries(PLANS).map(([k,p]) => {
                const cur = (o.settings?.plan || "free") === k;
                return (
                  <button key={k} onClick={async ()=>{
                    if (cur) return;
                    await orgUpdate(o._dbid, { settings: { ...(o.settings||{}), plan: k } });
                    setSaOrgs((await orgGetAll()).filter(x=>x.slug!=="_config"));
                  }} style={{ background:cur?"#1A1A2E":"#F0F0EC", color:cur?"#E8C547":"#777", border:"none", borderRadius:7, padding:"4px 10px", fontSize:11, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:cur?700:400 }}>
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <button onClick={()=>window.open(`/${o.slug}`, "_blank")}
                style={{ background:"#F0F0EC", color:"#555", border:"none", borderRadius:7, padding:"5px 11px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>🔗 פתח</button>
              <button onClick={async ()=>{
                const link = `${window.location.origin}/${o.slug}`;
                const text = `שלום! מצורף קישור למערכת ניהול האתרים של ${o.name}:\n${link}\n\nפתח את הקישור בטלפון ← לחץ שיתוף ← "הוספה למסך הבית" — וזהו, יש לך אפליקציה 📱`;
                if (navigator.share) {
                  try { await navigator.share({ title: o.name, text }); } catch(e) {}
                } else {
                  try { await navigator.clipboard.writeText(text); alert("הקישור הועתק! 📋"); }
                  catch(e) { window.prompt("העתק את הקישור:", link); }
                }
              }} style={{ background:"#E8F5E9", color:"#2E7D32", border:"none", borderRadius:7, padding:"5px 11px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>📤 שתף</button>
              <button onClick={async ()=>{
                await orgUpdate(o._dbid, { active: o.active===false });
                setSaOrgs((await orgGetAll()).filter(o=>o.slug!=="_config"));
              }} style={{ background:o.active!==false?"#FCE4EC":"#E8F5E9", color:o.active!==false?"#B71C1C":"#2E7D32", border:"none", borderRadius:7, padding:"5px 11px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>
                {o.active!==false?"⏸ השהה":"▶ הפעל"}
              </button>
              <button onClick={async ()=>{
                const newCode = window.prompt(`קוד מנהל זמני חדש ל"${o.name}":`);
                if (!newCode) return;
                try {
                  // איפוס קוד מנהל: מציאת רשומת ה-config של הארגון ועדכונה
                  const r = await fetch(`${SUPABASE_URL}/rest/v1/workers?select=*&org_id=eq.${o.id}`, { headers: hdrs() });
                  const rows = await r.json();
                  const cfg = rows.find(x => x.data && x.data._isConfig);
                  if (cfg) {
                    await fetch(`${SUPABASE_URL}/rest/v1/workers?id=eq.${cfg.id}`, { method:"PATCH", headers:hdrs(),
                      body: JSON.stringify({ data: { ...cfg.data, _adminCode: newCode } }) });
                  } else {
                    await fetch(`${SUPABASE_URL}/rest/v1/workers`, { method:"POST", headers:hdrs(),
                      body: JSON.stringify({ data: { _isConfig:true, _adminCode: newCode, id: Date.now() }, org_id: o.id }) });
                  }
                  alert(`קוד המנהל של "${o.name}" אופס ל: ${newCode}`);
                } catch(e) { alert("שגיאה: " + e.message); }
              }} style={{ background:"#FFF8E1", color:"#B26A00", border:"none", borderRadius:7, padding:"5px 11px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>🔑 איפוס קוד</button>
              <label style={{ background:"#EDE9FE", color:"#6D28D9", borderRadius:7, padding:"5px 11px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>
                🎨 לוגו
                <input type="file" accept="image/*" style={{ display:"none" }} onChange={async e=>{
                  const file = e.target.files[0]; e.target.value="";
                  if (!file) return;
                  if (file.size > 500*1024) { alert("לוגו עד 500KB"); return; }
                  const reader = new FileReader();
                  reader.onload = async ev => {
                    await orgUpdate(o._dbid, { logo: ev.target.result });
                    setSaOrgs((await orgGetAll()).filter(o=>o.slug!=="_config"));
                    alert("לוגו עודכן!");
                  };
                  reader.readAsDataURL(file);
                }}/>
              </label>
              <button onClick={async ()=>{
                try {
                  const data = await orgExportData(o.id);
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `backup_${o.slug}_${todayStr()}.json`; a.click();
                  setTimeout(()=>URL.revokeObjectURL(url), 5000);
                } catch(e) { alert("שגיאה: " + e.message); }
              }} style={{ background:"#E3F2FD", color:"#1565C0", border:"none", borderRadius:7, padding:"5px 11px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>💾 גיבוי</button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );

  if (screen === "home") return (
    <div style={{ ...base, background:"#1A1A2E", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
      <GFont/>
      <div style={{ textAlign:"center", marginBottom:40 }}>
        {org?.logo
          ? <img src={org.logo} alt={org?.name} style={{ height:140, objectFit:"contain", borderRadius:16, background:"#fff", padding:"10px 18px", boxShadow:"0 8px 32px rgba(0,0,0,0.3)", marginBottom:20 }}/>
          : org?.slug==="gne"
            ? <img src={LOGO_URL} alt="G&E Construction" style={{ height:140, objectFit:"contain", borderRadius:16, background:"#fff", padding:"10px 18px", boxShadow:"0 8px 32px rgba(0,0,0,0.3)", marginBottom:20 }}/>
            : <h1 style={{ color:"#E8C547", fontWeight:800, fontSize:30, margin:"0 0 12px" }}>{org?.name || "BuildTrack"}</h1>}
        <p style={{ color:"#888", margin:0, fontSize:14, letterSpacing:1 }}>מערכת ניהול אתרי בנייה</p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12, width:"100%", maxWidth:300 }}>
        <button onClick={()=>{ setScreen("wLogin"); setCodeInput(""); setCodeError(false); }} style={{ ...btnY, fontSize:16, padding:15, borderRadius:14 }}>👷 כניסת עובד</button>
        <button onClick={()=>{ setScreen("fLogin"); setCodeInput(""); setCodeError(false); }} style={{ fontSize:16, padding:15, borderRadius:14, background:"rgba(232,197,71,0.15)", color:"#E8C547", border:"1px solid rgba(232,197,71,0.35)", cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>🦺 כניסת מנהל עבודה</button>
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

  if (screen === "fLogin") return (
    <div style={{ ...base, background:"#1A1A2E", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <GFont/>
      <div style={{ background:"#fff", borderRadius:20, padding:30, width:"100%", maxWidth:320, direction:"rtl" }}>
        <button onClick={()=>setScreen("home")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:"#888", fontFamily:"Heebo,sans-serif", padding:"0 0 14px" }}>← חזור</button>
        <LogoBig/>
        <h2 style={{ margin:"12px 0 4px", fontWeight:800, fontSize:20, textAlign:"center" }}>כניסת מנהל עבודה</h2>
        <p style={{ margin:"0 0 18px", color:"#777", fontSize:14, textAlign:"center" }}>הכנס את קוד מנהל העבודה</p>
        <input value={codeInput} onChange={e=>{setCodeInput(e.target.value);setCodeError(false);}} onKeyDown={e=>e.key==="Enter"&&foremanLogin()} placeholder="קוד מנהל עבודה" type="password" style={{ ...inp, fontSize:22, letterSpacing:6, textAlign:"center", marginBottom:8 }}/>
        {codeError && <p style={{ color:"#E53935", fontSize:13, margin:"0 0 8px", textAlign:"center" }}>קוד שגוי, נסה שוב</p>}
        <button onClick={foremanLogin} style={{ ...btnD, width:"100%", marginTop:4, fontSize:15 }}>כניסה</button>
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
        <button onClick={()=>{ setLoggedWorker(null); if (loggedForeman) { setScreen("foreman"); } else { setScreen("home"); } }} style={{ background:"rgba(255,255,255,0.1)", color:"#ccc", border:"none", borderRadius:8, padding:"5px 12px", fontSize:13, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>{loggedForeman ? "← חזרה לניהול" : "יציאה"}</button>
      </header>
      <div style={{ maxWidth:440, margin:"0 auto", padding:"26px 16px" }}>
        <h2 style={{ margin:"0 0 4px", fontWeight:800, fontSize:21 }}>שלום, {loggedWorker?.name} 👋</h2>
        <p style={{ margin:"0 0 16px", color:"#777", fontSize:14 }}>{workerView==="report" ? "דווח על יום העבודה שלך" : "הימים שאתה משובץ בהם"}</p>

        {/* toggle דיווח / יומן */}
        <div style={{ display:"flex", background:"#EAEAE5", borderRadius:12, padding:3, marginBottom:16, gap:3 }}>
          {[{k:"report",l:"📝 דיווח"},{k:"calendar",l:"📅 היומן שלי"}].map(t=>(
            <button key={t.k} onClick={()=>setWorkerView(t.k)}
              style={{ flex:1, background:workerView===t.k?"#1A1A2E":"transparent", color:workerView===t.k?"#E8C547":"#888", border:"none", borderRadius:10, padding:"9px 0", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* יומן אישי לעובד */}
        {workerView==="calendar" && (() => {
          const [wy, wm] = wCalMonth.split("-").map(Number);
          const firstDay = new Date(wy, wm-1, 1);
          const daysInMonth = new Date(wy, wm, 0).getDate();
          const startDow = firstDay.getDay();
          const dayNames = ["א","ב","ג","ד","ה","ו","ש"];
          const monthLabel = firstDay.toLocaleDateString("he-IL",{year:"numeric",month:"long"});
          const myId = String(loggedWorker?.id);
          const prevM = () => { const d=new Date(wy, wm-2, 1); setWCalMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); };
          const nextM = () => { const d=new Date(wy, wm, 1); setWCalMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); };

          // רשימת הימים שהעובד משובץ בהם החודש
          const myDays = [];
          for (let day=1; day<=daysInMonth; day++) {
            const ds = `${wy}-${String(wm).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const ev = calEvents[ds];
            if (!ev) continue;
            const assigns = ev.assignments?.length ? ev.assignments : (ev.workers?.length ? [{projectId:"", workers:ev.workers}] : []);
            const mine = assigns.filter(a => (a.workers||[]).map(String).includes(myId));
            if (mine.length) myDays.push({ ds, day, mine });
          }

          return (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#1A1A2E", borderRadius:14, padding:"10px 16px", marginBottom:12 }}>
                <button onClick={prevM} style={{ background:"rgba(255,255,255,0.1)", color:"#fff", border:"none", borderRadius:8, padding:"5px 12px", fontSize:15, cursor:"pointer" }}>◀</button>
                <span style={{ color:"#E8C547", fontWeight:800, fontSize:15 }}>{monthLabel}</span>
                <button onClick={nextM} style={{ background:"rgba(255,255,255,0.1)", color:"#fff", border:"none", borderRadius:8, padding:"5px 12px", fontSize:15, cursor:"pointer" }}>▶</button>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:3 }}>
                {dayNames.map(d => <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:700, color:"#888", padding:"3px 0" }}>{d}</div>)}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:16 }}>
                {Array.from({length: startDow}).map((_,i) => <div key={`e${i}`}/>)}
                {Array.from({length: daysInMonth}).map((_,i) => {
                  const day = i+1;
                  const ds = `${wy}-${String(wm).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const isMine = myDays.some(d => d.ds === ds);
                  const isToday = ds === todayStr();
                  return (
                    <div key={day} style={{ background: isMine?"#E8C547": isToday?"#FFF8E1":"#fff", borderRadius:9, padding:"7px 2px", minHeight:38, textAlign:"center", border: isToday?"2px solid #B26A00":"1.5px solid #EEE" }}>
                      <span style={{ fontSize:13, fontWeight: isMine||isToday?800:500, color: isMine?"#1A1A2E":"#555" }}>{day}</span>
                      {isMine && <div style={{ fontSize:9 }}>👷</div>}
                    </div>
                  );
                })}
              </div>

              <h3 style={{ margin:"0 0 10px", fontSize:15, fontWeight:700 }}>הימים שלי החודש ({myDays.length})</h3>
              {myDays.length===0 && (
                <div style={{ background:"#fff", borderRadius:14, padding:30, textAlign:"center", border:"1.5px dashed #DDD", color:"#AAA" }}>
                  <p style={{ margin:0, fontSize:13 }}>אינך משובץ החודש</p>
                </div>
              )}
              {myDays.map(({ds, day, mine}) => (
                <div key={ds} style={{ background:"#fff", borderRadius:12, padding:"11px 15px", marginBottom:8, boxShadow:"0 1px 5px rgba(0,0,0,0.06)", borderRight:"4px solid #E8C547" }}>
                  <p style={{ margin:"0 0 3px", fontWeight:700, fontSize:14 }}>
                    {new Date(ds+"T12:00:00").toLocaleDateString("he-IL",{weekday:"long", day:"numeric", month:"long"})}
                  </p>
                  {mine.map((a,ai) => {
                    const pr = projects.find(p=>String(p.id)===String(a.projectId));
                    return <p key={ai} style={{ margin:0, fontSize:13, color:"#555" }}>🏗️ {pr?.name || "ללא פרויקט"}</p>;
                  })}
                </div>
              ))}
            </>
          );
        })()}

        {/* עובד שעתי — שעון נוכחות */}
        {workerView==="report" && loggedWorker?.payType==="hourly" && (
          <div style={{ background:"#fff", borderRadius:16, padding:22, boxShadow:"0 2px 8px rgba(0,0,0,0.07)", marginBottom:16 }}>
            {myOpenShift ? (
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:6 }}>⏱️</div>
                <h3 style={{ margin:"0 0 4px", fontWeight:800, fontSize:18 }}>השעון רץ</h3>
                <p style={{ margin:"0 0 4px", fontSize:14, color:"#555" }}>🏗️ {myOpenShift.projectName}</p>
                <p style={{ margin:"0 0 4px", fontSize:13, color:"#888" }}>כניסה: {new Date(myOpenShift.clockIn).toLocaleTimeString("he-IL",{hour:"2-digit",minute:"2-digit"})}</p>
                <p style={{ margin:"0 0 16px", fontSize:22, fontWeight:800, color:"#1A1A2E" }}>
                  {(() => { const h = (Date.now()-myOpenShift.clockIn)/3600000; return `${Math.floor(h)}:${String(Math.floor((h%1)*60)).padStart(2,"0")} שעות`; })()}
                </p>
                <div style={{ marginBottom:12 }}>
                  {loggedWorker?.showFuel!==false && (
                    <button type="button" onClick={()=>setRepFuel(f=>!f)}
                      style={{ width:"100%", background:(repFuel||myOpenShift.fuel)?"#1A1A2E":"#F0F0EC", color:(repFuel||myOpenShift.fuel)?"#E8C547":"#888", border:"none", borderRadius:10, padding:"10px 0", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>
                      {(repFuel||myOpenShift.fuel) ? `✅ כן — ₪${loggedWorker?.fuelAmount||50} דלק` : "לא נסעתי באוטו"}
                    </button>
                  )}
                </div>
                <button onClick={clockOut} style={{ width:"100%", background:"#B71C1C", color:"#fff", border:"none", borderRadius:12, padding:"14px 0", fontWeight:800, fontSize:16, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>
                  🛑 יציאה — סיום יום עבודה
                </button>
              </div>
            ) : repSent ? (
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:46, marginBottom:10 }}>✅</div>
                <h3 style={{ margin:"0 0 6px", fontWeight:800, fontSize:19 }}>יום העבודה נרשם!</h3>
                <button onClick={()=>{ setRepSent(false); setRepProject(""); setRepFuel(false); }} style={{ ...btnD, marginTop:10 }}>סגור</button>
              </div>
            ) : (
              <>
                <h3 style={{ margin:"0 0 12px", fontWeight:800, fontSize:16, textAlign:"center" }}>⏱️ שעון נוכחות</h3>
                {(() => {
                  const myProjects = projects.filter(p => p.status !== "הושלם" && (p.workers||[]).map(String).includes(String(loggedWorker?.id)));
                  return myProjects.length > 0 ? (
                    <>
                      <label style={{ display:"block", marginBottom:14 }}>
                        <LBL t="🏗️ באיזה אתר אתה עובד היום?"/>
                        <select value={repProject} onChange={e=>setRepProject(e.target.value)} style={{ ...inp, fontSize:15 }}>
                          <option value="">— בחר פרויקט —</option>
                          {myProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </label>
                      {loggedWorker?.showFuel!==false && (
                        <div style={{ marginBottom:14 }}>
                          <button type="button" onClick={()=>setRepFuel(f=>!f)}
                            style={{ width:"100%", background:repFuel?"#1A1A2E":"#F0F0EC", color:repFuel?"#E8C547":"#888", border:"none", borderRadius:10, padding:"10px 0", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>
                            {repFuel ? `✅ כן — ₪${loggedWorker?.fuelAmount||50} דלק` : "לא נסעתי באוטו"}
                          </button>
                        </div>
                      )}
                      <button onClick={clockIn} disabled={!repProject}
                        style={{ width:"100%", background:"#2E7D32", color:"#fff", border:"none", borderRadius:12, padding:"14px 0", fontWeight:800, fontSize:16, cursor:"pointer", fontFamily:"Heebo,sans-serif", opacity:repProject?1:0.4 }}>
                        ▶️ כניסה — התחלת יום עבודה
                      </button>
                    </>
                  ) : (
                    <div style={{ background:"#FFF8E1", border:"1.5px solid #FFD54F", borderRadius:10, padding:"12px 14px" }}>
                      <p style={{ margin:0, fontSize:13, color:"#B26A00", fontWeight:600 }}>⚠️ אינך משויך לאף פרויקט פעיל</p>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {workerView==="report" && loggedWorker?.payType!=="hourly" && (repSent ? (
          <div style={{ background:"#fff", borderRadius:16, padding:36, textAlign:"center" }}>
            <div style={{ fontSize:46, marginBottom:10 }}>✅</div>
            <h3 style={{ margin:"0 0 6px", fontWeight:800, fontSize:19 }}>הדיווח נשלח!</h3>
            <p style={{ margin:"0 0 22px", color:"#777" }}>יום העבודה שלך נרשם בהצלחה.</p>
            <button onClick={()=>{ setRepSent(false); setRepDate(todayStr()); setRepProject(""); setRepNote(""); setDayType("full"); setRepFuel(false); }} style={btnD}>דיווח נוסף</button>
          </div>
        ) : (
          <div style={{ background:"#fff", borderRadius:16, padding:22, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
            <label style={{ display:"block", marginBottom:14 }}>
              <LBL t="📅 תאריך"/>
              <input type="date" value={repDate} max={todayStr()} onChange={e=>{
                const _today = todayStr(); if(e.target.value < _today) {
                  setPendingDate(e.target.value);
                  setShowDateApproval(true);
                } else {
                  setRepDate(e.target.value);
                }
              }} style={{ ...inp, fontSize:15 }}/>
              {repDate < todayStr() && repDate !== todayStr() && <p style={{ margin:"4px 0 0", fontSize:12, color:"#F57F17", background:"#FFF8E1", borderRadius:6, padding:"3px 8px" }}>⚠️ דיווח על תאריך עבר — ממתין לאישור מנהל</p>}
            </label>
            <label style={{ display:"block", marginBottom:14 }}>
              <LBL t="⏱️ כמות שעות עבודה"/>
              <div style={{ display:"flex", gap:8 }}>
                {[{k:"full",l:"יום מלא 💪",v:1},{k:"half",l:"חצי יום ⚡",v:0.5}].map(opt=>(
                  <button key={opt.k} type="button" onClick={()=>setDayType(opt.k)}
                    style={{ flex:1, background:dayType===opt.k?"#1A1A2E":"#F0F0EC", color:dayType===opt.k?"#E8C547":"#888", border:"none", borderRadius:10, padding:"10px 0", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </label>

            {(() => {
              // רק פרויקטים פעילים שהעובד משויך אליהם (שיוך קבוע בפרויקט)
              const myProjects = projects.filter(p =>
                p.status !== "הושלם" &&
                (p.workers||[]).map(String).includes(String(loggedWorker?.id))
              );
              return (
                <label style={{ display:"block", marginBottom:14 }}>
                  <LBL t="🏗️ באיזה אתר עבדת?"/>
                  {myProjects.length > 0 ? (
                    <select value={repProject} onChange={e=>setRepProject(e.target.value)} style={{ ...inp, fontSize:15 }}>
                      <option value="">— בחר פרויקט —</option>
                      {myProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : (
                    <div style={{ background:"#FFF8E1", border:"1.5px solid #FFD54F", borderRadius:10, padding:"12px 14px" }}>
                      <p style={{ margin:0, fontSize:13, color:"#B26A00", fontWeight:600 }}>⚠️ אינך משויך לאף פרויקט פעיל</p>
                      <p style={{ margin:"4px 0 0", fontSize:12, color:"#B26A00" }}>פנה למנהל כדי שישייך אותך לפרויקט</p>
                    </div>
                  )}
                </label>
              );
            })()}
            <label style={{ display:"block", marginBottom:18 }}>
              <LBL t="📝 הערה (אופציונלי)"/>
              <textarea value={repNote} onChange={e=>setRepNote(e.target.value)} placeholder="מה בוצע היום?" rows={3} style={{ ...inp, resize:"vertical" }}/>
            </label>
            {loggedWorker?.showFuel!==false && (
            <div style={{ marginBottom:18 }}>
              <LBL t="⛽ דלק"/>
              <button type="button" onClick={()=>setRepFuel(f=>!f)}
                style={{ width:"100%", background:repFuel?"#1A1A2E":"#F0F0EC", color:repFuel?"#E8C547":"#888", border:"none", borderRadius:10, padding:"11px 0", fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>
                {repFuel ? `✅ כן — ₪${loggedWorker?.fuelAmount||50} דלק` : "לא נסעתי באוטו"}
              </button>
            </div>
            )}
            <button onClick={submitReport} disabled={!repProject} style={{ ...btnD, width:"100%", fontSize:15, opacity:repProject?1:0.4 }}>שלח דיווח יומי ✓</button>
          </div>
        ))}
      </div>

      {/* Modal: approve past date */}
      {showDateApproval && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
          <div style={{ background:"#fff", borderRadius:18, padding:26, width:"100%", maxWidth:320, direction:"rtl" }}>
            <div style={{ fontSize:32, textAlign:"center", marginBottom:10 }}>📅</div>
            <h3 style={{ margin:"0 0 8px", textAlign:"center", fontSize:16, fontWeight:800 }}>תאריך עבר</h3>
            <p style={{ margin:"0 0 16px", color:"#777", fontSize:13, textAlign:"center" }}>דיווח על {pendingDate} יישלח למנהל לאישור לפני שיופיע במערכת.</p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>{ setRepDate(pendingDate); setShowDateApproval(false); }} style={{ flex:1, background:"#1A1A2E", color:"#E8C547", border:"none", borderRadius:10, padding:"10px 0", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>שלח לאישור</button>
              <button onClick={()=>setShowDateApproval(false)} style={{ flex:1, background:"#F0F0EC", color:"#555", border:"none", borderRadius:10, padding:"10px 0", fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ====== MANAGER / FOREMAN SCREEN ======
  const allTabs = [
    { key:"reports",  label:"דיווחים",  emoji:"📋" },
    { key:"projects", label:"פרויקטים", emoji:"🏗️" },
    { key:"quotes",   label:"הצעות מחיר", emoji:"📄" },
    { key:"workers",  label:"עובדים",   emoji:"👷" },
    { key:"payroll",  label:"שכר",      emoji:"💰" },
    { key:"calendar", label:"יומן",     emoji:"📅" },
    { key:"equipment",label:"ציוד",     emoji:"🛒" },
    { key:"foremen",  label:"מנהלי עבודה", emoji:"🦺" },
    { key:"help",     label:"עזרה",     emoji:"❓" },
    { key:"settings", label:"הגדרות",   emoji:"⚙️" },
  ];
  const foremanTabs = ["reports","projects","workers","calendar","help"];
  const tabs = (isForeman ? allTabs.filter(t => foremanTabs.includes(t.key)) : allTabs)
    .filter(t => t.key !== "foremen" || plan.foremen);

  return (
    <div style={{ ...base, background:"#F5F5F0" }}>
      <GFont/>
      <header style={{ background:"#1A1A2E", padding:"0 18px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
        <LogoSmall/>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {isForeman && <>
            <span style={{ color:"#E8C547", fontSize:13, fontWeight:700 }}>🦺 {loggedForeman?.name}</span>
            <button onClick={()=>{ setLoggedWorker(loggedForeman); setRepSent(false); setRepDate(todayStr()); setRepProject(""); setRepNote(""); setDayType("full"); setRepFuel(false); setWorkerView("report"); setScreen("worker"); }}
              style={{ background:"#E8C547", color:"#1A1A2E", border:"none", borderRadius:8, padding:"5px 12px", fontSize:13, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>
              📝 דיווח יום
            </button>
          </>}
          <button onClick={()=>{ setLoggedForeman(null); setMgTab("reports"); setDetailId(null); setScreen("home"); }} style={{ background:"rgba(255,255,255,0.1)", color:"#ccc", border:"none", borderRadius:8, padding:"5px 12px", fontSize:13, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>יציאה</button>
        </div>
      </header>

      <div style={{ background:"#fff", borderBottom:"1.5px solid #EEE", display:"flex", justifyContent:"flex-start", overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
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
                <p style={{ margin:"3px 0 0", color:"#777", fontSize:13 }}>{visibleReports.length} דיווחים סה"כ</p>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {!isForeman && <button onClick={async ()=>{
                  try {
                    // Get ALL rows from reports table
                    const res = await fetch(`https://rkjcrhywhoixdkqlfnko.supabase.co/rest/v1/reports?select=*&order=id.asc`, { headers: hdrs() });
                    const rows = await res.json();
                    let count = 0;
                    for (const row of rows) {
                      if (row.data && row.data.pendingApproval === true) {
                        const newData = { ...row.data, pendingApproval: false };
                        await fetch(`https://rkjcrhywhoixdkqlfnko.supabase.co/rest/v1/reports?id=eq.${row.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJramNyaHl3aG9peGRrcWxmbmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMzA2NzQsImV4cCI6MjA5NDYwNjY3NH0.yKZzdMCNOyWJClmip03QY617HX2IB-xKPKGUZtKT_Z0", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJramNyaHl3aG9peGRrcWxmbmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMzA2NzQsImV4cCI6MjA5NDYwNjY3NH0.yKZzdMCNOyWJClmip03QY617HX2IB-xKPKGUZtKT_Z0" },
                          body: JSON.stringify({ data: newData })
                        });
                        count++;
                      }
                    }
                    await loadAll();
                    alert(`✅ אושרו ${count} דיווחים`);
                  } catch(e) {
                    alert("שגיאה: " + e.message);
                  }
                }} style={{ ...btnY, padding:"7px 14px", fontSize:13 }}>✓ אשר הכל</button>}
                <button onClick={()=>loadAll(true)} style={{ ...btnG, padding:"7px 14px", fontSize:13 }}>🔄 רענן</button>
              </div>
            </div>
            {/* Pending approval section */}
            {visiblePending.length>0 && (
              <div style={{ background:"#FFF8E1", borderRadius:14, padding:"14px 18px", marginBottom:14, border:"1.5px solid #FFD54F" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:"#B26A00" }}>⏳ ממתינים לאישור ({visiblePending.length})</h3>
                  <button onClick={async ()=>{ for(const rep of visiblePending){ await approveReport(rep); } }} style={{ background:"#1A1A2E", color:"#E8C547", border:"none", borderRadius:7, padding:"4px 12px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>✓ אשר הכל</button>
                </div>
                {visiblePending.map(r => (
                  <div key={r._dbid} style={{ background:"#fff", borderRadius:10, padding:"10px 14px", marginBottom:7, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:3 }}>
                        <span style={{ fontWeight:700, fontSize:13 }}>{r.workerName}</span>
                        <span style={{ background:"#F0F0EC", borderRadius:6, padding:"2px 7px", fontSize:11, color:"#555" }}>{r.projectName}</span>
                        <span style={{ fontSize:11, color:"#999" }}>📅 {r.date}</span>
                      </div>
                      {r.note && <p style={{ margin:0, fontSize:12, color:"#666" }}>{r.note}</p>}
                    </div>
                    <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                      <button onClick={()=>approveReport(r)} style={{ background:"#1A1A2E", color:"#E8C547", border:"none", borderRadius:7, padding:"4px 10px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>✓ אשר</button>
                      <button onClick={()=>rejectReport(r)} style={{ background:"#FCE4EC", color:"#B71C1C", border:"none", borderRadius:7, padding:"4px 10px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>✕ דחה</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {visibleReports.length===0 && visiblePending.length===0 && <div style={{ background:"#fff", borderRadius:14, padding:44, textAlign:"center", border:"1.5px dashed #DDD", color:"#AAA" }}><div style={{ fontSize:34, marginBottom:8 }}>📋</div><p style={{ margin:0 }}>אין דיווחים עדיין</p></div>}
            {[...visibleReports].reverse().map(r => (
              <div key={r._dbid} style={{ background:"#fff", borderRadius:12, padding:"13px 18px", marginBottom:9, borderRight:"4px solid #E8C547", boxShadow:"0 1px 5px rgba(0,0,0,0.06)", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:3 }}>
                    <span style={{ fontWeight:700, fontSize:14 }}>{r.workerName}</span>
                    <span style={{ background:"#F0F0EC", borderRadius:6, padding:"2px 8px", fontSize:12, color:"#555" }}>{r.projectName}</span>
                    <span style={{ fontSize:12, color:"#999" }}>📅 {r.date}</span>
                    {r.dayType==="half" && <span style={{ background:"#FFF8E1", color:"#B26A00", borderRadius:6, padding:"2px 7px", fontSize:11, fontWeight:600 }}>חצי יום</span>}
                    {r._shift && <span style={{ background:r.clockOut?"#E3F2FD":"#FCE4EC", color:r.clockOut?"#1565C0":"#B71C1C", borderRadius:6, padding:"2px 7px", fontSize:11, fontWeight:600 }}>⏱️ {r.clockOut ? `${r.hours} שעות` : (Date.now()-r.clockIn > 16*3600000 ? "⚠️ שעון תקוע" : "שעון פתוח")}</span>}
                    {r._shift && <button onClick={async ()=>{
                      const cur = r.hours != null ? String(r.hours) : "";
                      const inp2 = window.prompt(`כמה שעות עבד ${r.workerName} ב-${r.date}?`, cur);
                      if (inp2 === null) return;
                      const h = Number(inp2);
                      if (isNaN(h) || h < 0 || h > 24) { alert("מספר שעות לא תקין"); return; }
                      const updated = { ...r, hours: h, clockOut: r.clockOut || Date.now() };
                      const { _dbid, ...data } = updated;
                      await dbUpdate("reports", r._dbid, data);
                      setReports(prev => prev.map(x => x._dbid===r._dbid ? updated : x));
                    }} style={{ background:"#1A1A2E", color:"#E8C547", border:"none", borderRadius:6, padding:"2px 8px", fontSize:11, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:600 }}>✏️ שעות</button>}
                  </div>
                  {r.note && <p style={{ margin:0, fontSize:13, color:"#666", lineHeight:1.5 }}>{r.note}</p>}
                  {r.fuel && <span style={{ background:"#FFF8E1", color:"#B26A00", borderRadius:6, padding:"2px 7px", fontSize:11, fontWeight:600 }}>⛽ +₪{r.fuelAmt||50} דלק</span>}
                </div>
                <button onClick={()=>delReport(r)} style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:15, padding:0, flexShrink:0 }}>✕</button>
              </div>
            ))}
          </>
        )}

        {/* PROJECTS LIST */}
        {mgTab==="projects" && !detailProject && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div>
                <h1 style={{ margin:0, fontSize:20, fontWeight:800 }}>פרויקטים</h1>
                <p style={{ margin:"3px 0 0", color:"#777", fontSize:13 }}>{visibleProjects.length} פרויקטים</p>
              </div>
              {!isForeman && <button onClick={()=>setNewPM(true)} style={btnY}>+ פרויקט חדש</button>}
            </div>

            {/* Active / Completed toggle */}
            <div style={{ display:"flex", background:"#F0F0EC", borderRadius:12, padding:3, marginBottom:14, gap:3 }}>
              {[{k:"active",l:"פעילים 🏗️"},{k:"completed",l:"הושלמו ✅"}].map(t=>(
                <button key={t.k} onClick={()=>setProjTab(t.k)}
                  style={{ flex:1, background:projTab===t.k?"#1A1A2E":"transparent", color:projTab===t.k?"#E8C547":"#888", border:"none", borderRadius:10, padding:"8px 0", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>
                  {t.l}
                </button>
              ))}
            </div>

            {visibleProjects.filter(p => projTab==="completed" ? p.status==="הושלם" : p.status!=="הושלם").length===0 && (
              <div style={{ background:"#fff", borderRadius:14, padding:44, textAlign:"center", border:"1.5px dashed #DDD", color:"#AAA" }}>
                <div style={{ fontSize:34, marginBottom:8 }}>{projTab==="completed"?"✅":"🏗️"}</div>
                <p style={{ margin:0 }}>{projTab==="completed"?"אין פרויקטים שהושלמו עדיין":"אין פרויקטים פעילים"}</p>
              </div>
            )}
            {visibleProjects.filter(p => projTab==="completed" ? p.status==="הושלם" : p.status!=="הושלם").map(p => {
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
                      {!isForeman && <button onClick={()=>delProject(p)} style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:14 }}>✕</button>}
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
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    {["ממתין","בביצוע","מושהה","הושלם"].map(st => (
                      <button key={st} onClick={()=>updateProjField(detailProject,{status:st})}
                        style={{
                          background: detailProject.status===st ? STATUS_COLORS[st]?.bg : "rgba(255,255,255,0.08)",
                          color: detailProject.status===st ? STATUS_COLORS[st]?.text : "#AAA",
                          border: detailProject.status===st ? `1.5px solid ${STATUS_COLORS[st]?.dot}` : "1.5px solid transparent",
                          borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:detailProject.status===st?700:400,
                          cursor:"pointer", fontFamily:"Heebo,sans-serif"
                        }}>
                        {st}
                      </button>
                    ))}
                  </div>
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

              {/* EXPENSES */}
              <div style={{ background:"#fff", borderRadius:14, padding:"16px 20px", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:13 }}>
                  <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>🧾 הוצאות</h3>
                  <button onClick={()=>{ const expenses=[...(editProj.expenses||[]),{id:Date.now(),desc:"",amount:"",date:todayStr()}]; setEditProj(p=>({...p,expenses})); updateProjField(detailProject,{expenses}); }}
                    style={{ background:"#1A1A2E", color:"#E8C547", border:"none", borderRadius:7, padding:"4px 12px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>+ הוסף הוצאה</button>
                </div>
                {(!editProj.expenses||editProj.expenses.length===0) && <p style={{ margin:0, fontSize:13, color:"#AAA" }}>אין הוצאות רשומות</p>}
                {(editProj.expenses||[]).map((ex,idx) => {
                  const updExp = (changes, isText=false) => {
                    const expenses=(editProj.expenses||[]).map((e,i)=>i===idx?{...e,...changes}:e);
                    setEditProj(p=>({...p,expenses}));
                    if (isText) {
                      updateProjFieldDebounced(detailProject,{expenses});
                    } else {
                      updateProjField(detailProject,{expenses});
                    }
                  };
                  return (
                    <div key={ex.id} style={{ background:"#F9F9F9", borderRadius:12, padding:"11px 13px", marginBottom:8 }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:7 }}>
                        <input value={ex.desc} placeholder="תיאור ההוצאה" onChange={e=>updExp({desc:e.target.value}, true)}
                          style={{ flex:2, border:"1.5px solid #EEE", borderRadius:8, padding:"7px 10px", fontSize:13, fontFamily:"Heebo,sans-serif", outline:"none", background:"#fff" }}/>
                        <input type="number" value={ex.amount} placeholder="סכום ₪" onChange={e=>updExp({amount:e.target.value}, true)}
                          style={{ flex:1, border:"1.5px solid #EEE", borderRadius:8, padding:"7px 10px", fontSize:13, fontFamily:"Heebo,sans-serif", outline:"none", background:"#fff" }}/>
                        <button onClick={()=>{ const expenses=(editProj.expenses||[]).filter((_,i)=>i!==idx); setEditProj(p=>({...p,expenses})); updateProjField(detailProject,{expenses}); }}
                          style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:14, padding:0, flexShrink:0 }}>✕</button>
                      </div>
                      <input type="date" value={ex.date||""} onChange={e=>updExp({date:e.target.value})}
                        style={{ border:"1.5px solid #EEE", borderRadius:8, padding:"5px 9px", fontSize:12, fontFamily:"Heebo,sans-serif", outline:"none", background:"#fff" }}/>
                    </div>
                  );
                })}
                {(editProj.expenses||[]).length>0 && (
                  <div style={{ display:"flex", justifyContent:"space-between", paddingTop:10, borderTop:"1px solid #EEE", marginTop:4 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:"#555" }}>סה"כ הוצאות</span>
                    <span style={{ fontSize:16, fontWeight:800, color:"#B71C1C" }}>₪{fmtNum((editProj.expenses||[]).reduce((s,e)=>s+Number(e.amount||0),0))}</span>
                  </div>
                )}
              </div>

              {/* SUBCONTRACTORS */}
              {plan.subs && (
              <div style={{ background:"#fff", borderRadius:14, padding:"16px 20px", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:13 }}>
                  <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>🔨 קבלני משנה</h3>
                  <button onClick={()=>{ const subs=[...(editProj.subcontractors||[]),{id:Date.now(),name:"",work:"",price:"",withMaterial:true,plannedDays:"",payments:[]}]; setEditProj(p=>({...p,subcontractors:subs})); updateProjField(detailProject,{subcontractors:subs}); }}
                    style={{ background:"#1A1A2E", color:"#E8C547", border:"none", borderRadius:7, padding:"4px 12px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>+ הוסף קבלן</button>
                </div>
                {(!editProj.subcontractors||editProj.subcontractors.length===0) && <p style={{ margin:0, fontSize:13, color:"#AAA" }}>אין קבלני משנה</p>}
                {(editProj.subcontractors||[]).map((sc,si) => {
                  const updSub = (changes, isText=false) => {
                    const subs=(editProj.subcontractors||[]).map((x,i)=>i===si?{...x,...changes}:x);
                    setEditProj(p=>({...p,subcontractors:subs}));
                    if (isText) updateProjFieldDebounced(detailProject,{subcontractors:subs});
                    else updateProjField(detailProject,{subcontractors:subs});
                  };
                  const scPaid = (sc.payments||[]).filter(p=>p.paid).reduce((s,p)=>s+Number(p.amount||0),0);
                  const scTotal = Number(sc.price||0);
                  const scRemaining = scTotal - scPaid;
                  return (
                    <div key={sc.id} style={{ background:"#F9F9F9", borderRadius:12, padding:"13px 14px", marginBottom:10, borderRight:"4px solid #8B5CF6" }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
                        <input value={sc.name} placeholder="שם הקבלן" onChange={e=>updSub({name:e.target.value}, true)}
                          style={{ flex:1, border:"1.5px solid #EEE", borderRadius:8, padding:"7px 10px", fontSize:13, fontFamily:"Heebo,sans-serif", outline:"none", background:"#fff", fontWeight:700 }}/>
                        <button onClick={()=>{ if(!window.confirm(`למחוק את הקבלן "${sc.name||""}"?`)) return; const subs=(editProj.subcontractors||[]).filter((_,i)=>i!==si); setEditProj(p=>({...p,subcontractors:subs})); updateProjField(detailProject,{subcontractors:subs}); }}
                          style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:14, padding:0, flexShrink:0 }}>✕</button>
                      </div>
                      <input value={sc.work} placeholder="תיאור העבודה (למשל: אינסטלציה קומה א)" onChange={e=>updSub({work:e.target.value}, true)}
                        style={{ width:"100%", border:"1.5px solid #EEE", borderRadius:8, padding:"7px 10px", fontSize:13, fontFamily:"Heebo,sans-serif", outline:"none", background:"#fff", boxSizing:"border-box", marginBottom:8 }}/>
                      <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                        <input type="number" value={sc.price} placeholder="מחיר ₪" onChange={e=>updSub({price:e.target.value}, true)}
                          style={{ flex:1, border:"1.5px solid #EEE", borderRadius:8, padding:"7px 10px", fontSize:13, fontFamily:"Heebo,sans-serif", outline:"none", background:"#fff" }}/>
                        <input type="number" value={sc.plannedDays} placeholder="ימים מתוכננים" onChange={e=>updSub({plannedDays:e.target.value}, true)}
                          style={{ flex:1, border:"1.5px solid #EEE", borderRadius:8, padding:"7px 10px", fontSize:13, fontFamily:"Heebo,sans-serif", outline:"none", background:"#fff" }}/>
                      </div>
                      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
                        {[{v:true,l:"🧱 כולל חומר"},{v:false,l:"🚫 בלי חומר (אני מביא)"}].map(opt=>(
                          <button key={String(opt.v)} onClick={()=>updSub({withMaterial:opt.v})}
                            style={{ flex:1, background:sc.withMaterial===opt.v?"#1A1A2E":"#F0F0EC", color:sc.withMaterial===opt.v?"#E8C547":"#888", border:"none", borderRadius:8, padding:"6px 0", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:sc.withMaterial===opt.v?700:400 }}>
                            {opt.l}
                          </button>
                        ))}
                      </div>

                      {/* payment stages */}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:"#555" }}>💳 שלבי תשלום</span>
                        <button onClick={()=>{ const payments=[...(sc.payments||[]),{id:Date.now(),desc:"",amount:"",paid:false}]; updSub({payments}); }}
                          style={{ background:"#EDE9FE", color:"#6D28D9", border:"none", borderRadius:6, padding:"3px 10px", fontSize:11, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>+ שלב</button>
                      </div>
                      {(sc.payments||[]).map((pm,pi) => {
                        const updPm = (changes, isText=false) => {
                          const payments=(sc.payments||[]).map((x,i)=>i===pi?{...x,...changes}:x);
                          updSub({payments}, isText);
                        };
                        return (
                          <div key={pm.id} style={{ display:"flex", gap:6, alignItems:"center", marginBottom:6 }}>
                            <button onClick={()=>{
                              if (!pm.paid && !window.confirm(`לסמן תשלום של ₪${Number(pm.amount||0).toLocaleString("he-IL")} כשולם?`)) return;
                              updPm({paid:!pm.paid, paidAt: !pm.paid ? new Date().toLocaleDateString("he-IL") : ""});
                            }}
                              style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${pm.paid?"#22C55E":"#CCC"}`, background:pm.paid?"#22C55E":"#fff", cursor:"pointer", flexShrink:0, color:"#fff", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center" }}>{pm.paid?"✓":""}</button>
                            <input value={pm.desc} placeholder="מתי (למשל: אחרי יציקה)" onChange={e=>updPm({desc:e.target.value}, true)}
                              style={{ flex:2, border:"1.5px solid #EEE", borderRadius:7, padding:"5px 9px", fontSize:12, fontFamily:"Heebo,sans-serif", outline:"none", background:"#fff", textDecoration:pm.paid?"line-through":"none", color:pm.paid?"#AAA":"#333" }}/>
                            <input type="number" value={pm.amount} placeholder="₪" onChange={e=>updPm({amount:e.target.value}, true)}
                              style={{ flex:1, border:"1.5px solid #EEE", borderRadius:7, padding:"5px 9px", fontSize:12, fontFamily:"Heebo,sans-serif", outline:"none", background:"#fff", textDecoration:pm.paid?"line-through":"none", color:pm.paid?"#AAA":"#333" }}/>
                            <button onClick={()=>{ const payments=(sc.payments||[]).filter((_,i)=>i!==pi); updSub({payments}); }}
                              style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:13, padding:0, flexShrink:0 }}>✕</button>
                          </div>
                        );
                      })}

                      {/* summary line */}
                      {scTotal>0 && (
                        <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:4, paddingTop:8, borderTop:"1px solid #EEE", marginTop:4, fontSize:12 }}>
                          <span style={{ color:"#555" }}>סוכם: <b>₪{fmtNum(scTotal)}</b></span>
                          <span style={{ color:"#2E7D32" }}>שולם: <b>₪{fmtNum(scPaid)}</b></span>
                          <span style={{ color:scRemaining>0?"#B71C1C":"#2E7D32" }}>נשאר: <b>₪{fmtNum(scRemaining)}</b></span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              )}

              {/* TOTAL PROJECT COSTS */}
              {(() => {
                const expTotal = (editProj.expenses||[]).reduce((s,e)=>s+Number(e.amount||0),0);
                const subTotal = (editProj.subcontractors||[]).reduce((s,sc)=>s+Number(sc.price||0),0);
                const subPaid = (editProj.subcontractors||[]).reduce((s,sc)=>s+(sc.payments||[]).filter(p=>p.paid).reduce((s2,p)=>s2+Number(p.amount||0),0),0);
                if (expTotal===0 && subTotal===0) return null;
                return (
                  <div style={{ background:"#1A1A2E", borderRadius:14, padding:"14px 20px", marginBottom:14 }}>
                    <p style={{ margin:"0 0 8px", fontSize:13, fontWeight:700, color:"#E8C547" }}>💰 סה"כ הוצאות פרויקט</p>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#AAA", marginBottom:3 }}>
                      <span>הוצאות וחומרים</span><span>₪{fmtNum(expTotal)}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#AAA", marginBottom:3 }}>
                      <span>קבלני משנה (סוכם)</span><span>₪{fmtNum(subTotal)}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#AAA", marginBottom:8 }}>
                      <span>מתוכם שולם לקבלנים</span><span>₪{fmtNum(subPaid)}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8, borderTop:"1px solid rgba(255,255,255,0.15)" }}>
                      <span style={{ color:"#fff", fontWeight:700, fontSize:14 }}>סה"כ</span>
                      <span style={{ color:"#E8C547", fontWeight:800, fontSize:18 }}>₪{fmtNum(expTotal + subTotal)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* INVOICES */}
              <div style={{ background:"#fff", borderRadius:14, padding:"16px 20px", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
                <h3 style={{ margin:"0 0 13px", fontSize:15, fontWeight:700 }}>📸 חשבוניות</h3>
                <p style={{ margin:"0 0 12px", fontSize:13, color:"#777" }}>העלה תמונות חשבוניות של הפרויקט — נשמרות לצפייה בכל עת</p>

                <label style={{ display:"block", cursor:"pointer" }}>
                  <div style={{ background:"#F0F4FF", border:"2px dashed #90CAF9", borderRadius:12, padding:"18px", textAlign:"center" }}>
                    {invoiceAnalyzing
                      ? <p style={{ margin:0, color:"#1565C0", fontWeight:700 }}>⏳ מעלה חשבונית...</p>
                      : <p style={{ margin:0, color:"#1565C0", fontSize:14 }}>📷 לחץ להעלאת חשבונית</p>
                    }
                  </div>
                  <input type="file" accept="image/*,application/pdf" multiple style={{ display:"none" }} onChange={async e => {
                    const files = Array.from(e.target.files);
                    e.target.value = "";
                    if (!files.length) return;
                    setInvoiceAnalyzing(true);
                    try {
                      const invs = [...(editProj.invoices||[])];
                      for (const file of files) {
                        const path = `${CURRENT_ORG?.slug||"default"}/${detailProject.id}/invoices/${Date.now()}_${file.name}`;
                        const url = await storageUpload(file, path);
                        invs.push({ name: file.name, url, path, date: todayStr() });
                      }
                      setEditProj(p=>({...p, invoices: invs}));
                      updateProjField(detailProject, { invoices: invs });
                    } catch(err) {
                      alert("שגיאה בהעלאת חשבונית: " + err.message);
                    }
                    setInvoiceAnalyzing(false);
                  }}/>
                </label>

                {(editProj.invoices||[]).length>0 && (
                  <div style={{ marginTop:12, display:"flex", flexWrap:"wrap", gap:10 }}>
                    {(editProj.invoices||[]).map((inv,i) => (
                      <div key={i} style={{ background:"#F5F5F0", borderRadius:10, padding:"8px 12px", display:"flex", alignItems:"center", gap:8 }}>
                        <button onClick={()=>window.open(inv.url, "_blank")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:"#1565C0", fontWeight:600, fontFamily:"Heebo,sans-serif", padding:0 }}>
                          🧾 {inv.name}
                        </button>
                        <span style={{ fontSize:11, color:"#AAA" }}>{inv.date}</span>
                        <button onClick={async ()=>{
                          if (!window.confirm(`למחוק את "${inv.name}"?`)) return;
                          if (inv.path) { try { await storageDelete(inv.path); } catch(e) {} }
                          const invs=(editProj.invoices||[]).filter((_,j)=>j!==i);
                          setEditProj(p=>({...p,invoices:invs}));
                          updateProjField(detailProject,{invoices:invs});
                        }} style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:13 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ARCHITECTURAL PLANS */}
              <div style={{ background:"#fff", borderRadius:14, padding:"16px 20px", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
                <h3 style={{ margin:"0 0 13px", fontSize:15, fontWeight:700 }}>📐 תוכניות אדריכליות</h3>
                <label style={{ display:"block", cursor:"pointer" }}>
                  <div style={{ background:"#F5F5F0", border:"2px dashed #DDD", borderRadius:12, padding:"18px", textAlign:"center" }}>
                    {planUploading
                      ? <p style={{ margin:0, color:"#B26A00", fontSize:14, fontWeight:700 }}>⏳ מעלה תוכנית...</p>
                      : <p style={{ margin:0, color:"#888", fontSize:14 }}>📎 העלה תוכנית (תמונה או PDF)</p>}
                  </div>
                  <input type="file" accept="image/*,application/pdf" multiple style={{ display:"none" }} onChange={async e => {
                    const files = Array.from(e.target.files);
                    e.target.value = "";
                    if (!files.length) return;
                    setPlanUploading(true);
                    try {
                      const plans = [...(editProj.architecturalPlans||[])];
                      for (const file of files) {
                        const path = `${CURRENT_ORG?.slug||"default"}/${detailProject.id}/${Date.now()}_${file.name}`;
                        const url = await storageUpload(file, path);
                        plans.push({ name: file.name, url, path, date: todayStr() });
                      }
                      setEditProj(p=>({...p, architecturalPlans: plans}));
                      updateProjField(detailProject, { architecturalPlans: plans });
                    } catch(err) {
                      alert("שגיאה בהעלאת תוכנית: " + err.message);
                    }
                    setPlanUploading(false);
                  }}/>
                </label>
                {(editProj.architecturalPlans||[]).length>0 && (
                  <div style={{ marginTop:12, display:"flex", flexWrap:"wrap", gap:10 }}>
                    {(editProj.architecturalPlans||[]).map((plan,i) => (
                      <div key={i} style={{ position:"relative", background:"#F5F5F0", borderRadius:10, padding:"8px 12px", display:"flex", alignItems:"center", gap:8 }}>
                        <button onClick={()=>openPlan(plan)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:"#1565C0", fontWeight:600, fontFamily:"Heebo,sans-serif", padding:0 }}>
                          📄 {plan.name}
                        </button>
                        <button onClick={async ()=>{
                          if (!window.confirm(`למחוק את "${plan.name}"?`)) return;
                          if (plan.path) { try { await storageDelete(plan.path); } catch(e) {} }
                          const plans=(editProj.architecturalPlans||[]).filter((_,j)=>j!==i);
                          setEditProj(p=>({...p,architecturalPlans:plans}));
                          updateProjField(detailProject,{architecturalPlans:plans});
                        }} style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:13 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PROJECT DESCRIPTION */}
              <div style={{ background:"#fff", borderRadius:14, padding:"16px 20px", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
                <h3 style={{ margin:"0 0 10px", fontSize:15, fontWeight:700 }}>📋 תיאור הפרויקט</h3>
                <textarea value={editProj.description||""} placeholder="לדוגמה: 200 מטר גבס · שלד בטון 150 מ״ר · פרגולה 40 מ״ר"
                  onChange={e=>{ setEditProj(p=>({...p, description: e.target.value})); updateProjFieldDebounced(detailProject, { description: e.target.value }); }}
                  rows={3}
                  style={{ width:"100%", border:"1.5px solid #EEE", borderRadius:10, padding:"10px 12px", fontSize:14, fontFamily:"Heebo,sans-serif", outline:"none", background:"#FDFDFB", boxSizing:"border-box", resize:"vertical" }}/>
              </div>

              {/* CLIENT PAYMENT STAGES */}
              <div style={{ background:"#fff", borderRadius:14, padding:"16px 20px", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:13 }}>
                  <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>💵 שלבי קבלת תשלום</h3>
                  <button onClick={()=>{ const cp=[...(editProj.clientPayments||[]),{id:Date.now(),desc:"",amount:"",received:false}]; setEditProj(p=>({...p,clientPayments:cp})); updateProjField(detailProject,{clientPayments:cp}); }}
                    style={{ background:"#1A1A2E", color:"#E8C547", border:"none", borderRadius:7, padding:"4px 12px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>+ שלב תשלום</button>
                </div>
                {(!editProj.clientPayments||editProj.clientPayments.length===0) && <p style={{ margin:0, fontSize:13, color:"#AAA" }}>אין שלבי תשלום — למשל: מקדמה, אחרי שלד, מסירה</p>}
                {(editProj.clientPayments||[]).map((cp,ci) => {
                  const updCp = (changes, isText=false) => {
                    const clientPayments=(editProj.clientPayments||[]).map((x,i)=>i===ci?{...x,...changes}:x);
                    setEditProj(p=>({...p,clientPayments}));
                    if (isText) updateProjFieldDebounced(detailProject,{clientPayments});
                    else updateProjField(detailProject,{clientPayments});
                  };
                  return (
                    <div key={cp.id} style={{ display:"flex", gap:6, alignItems:"center", marginBottom:7 }}>
                      <button onClick={()=>{
                        if (!cp.received && !window.confirm(`לסמן שקיבלת ₪${Number(cp.amount||0).toLocaleString("he-IL")}?`)) return;
                        updCp({received:!cp.received, receivedAt: !cp.received ? new Date().toLocaleDateString("he-IL") : ""});
                      }}
                        style={{ width:24, height:24, borderRadius:"50%", border:`2px solid ${cp.received?"#22C55E":"#CCC"}`, background:cp.received?"#22C55E":"#fff", cursor:"pointer", flexShrink:0, color:"#fff", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>{cp.received?"✓":""}</button>
                      <input value={cp.desc} placeholder="מתי (למשל: אחרי שלד)" onChange={e=>updCp({desc:e.target.value}, true)}
                        style={{ flex:2, border:"1.5px solid #EEE", borderRadius:8, padding:"7px 10px", fontSize:13, fontFamily:"Heebo,sans-serif", outline:"none", background:"#fff", textDecoration:cp.received?"line-through":"none", color:cp.received?"#AAA":"#333" }}/>
                      <input type="number" value={cp.amount} placeholder="₪" onChange={e=>updCp({amount:e.target.value}, true)}
                        style={{ flex:1, border:"1.5px solid #EEE", borderRadius:8, padding:"7px 10px", fontSize:13, fontFamily:"Heebo,sans-serif", outline:"none", background:"#fff", textDecoration:cp.received?"line-through":"none", color:cp.received?"#AAA":"#333" }}/>
                      <button onClick={()=>{ const clientPayments=(editProj.clientPayments||[]).filter((_,i)=>i!==ci); setEditProj(p=>({...p,clientPayments})); updateProjField(detailProject,{clientPayments}); }}
                        style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:14, padding:0, flexShrink:0 }}>✕</button>
                    </div>
                  );
                })}
                {(editProj.clientPayments||[]).length>0 && (() => {
                  const cpTotal = (editProj.clientPayments||[]).reduce((s,x)=>s+Number(x.amount||0),0);
                  const cpReceived = (editProj.clientPayments||[]).filter(x=>x.received).reduce((s,x)=>s+Number(x.amount||0),0);
                  return (
                    <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:4, paddingTop:10, borderTop:"1px solid #EEE", marginTop:6, fontSize:13 }}>
                      <span style={{ color:"#555" }}>סה"כ: <b>₪{fmtNum(cpTotal)}</b></span>
                      <span style={{ color:"#2E7D32" }}>התקבל: <b>₪{fmtNum(cpReceived)}</b></span>
                      <span style={{ color:(cpTotal-cpReceived)>0?"#B71C1C":"#2E7D32" }}>נותר: <b>₪{fmtNum(cpTotal-cpReceived)}</b></span>
                    </div>
                  );
                })()}
              </div>

              <div style={{ background:"#fff", borderRadius:14, padding:"16px 20px", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:13 }}>
                  <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>🪜 שלבי ביצוע</h3>
                  <button onClick={()=>{ const phases=[...(editProj.phases||[]),{id:Date.now(),name:"",done:false,targetDate:"",notes:""}]; setEditProj(p=>({...p,phases})); updateProjField(detailProject,{phases}); }}
                    style={{ background:"#1A1A2E", color:"#E8C547", border:"none", borderRadius:7, padding:"4px 12px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>+ הוסף שלב</button>
                </div>
                {(!editProj.phases||editProj.phases.length===0) && <p style={{ margin:0, fontSize:13, color:"#AAA" }}>אין שלבים עדיין</p>}
                {(editProj.phases||[]).map((ph,idx) => {
                  const updPhase = (changes, isText=false) => {
                    const phases=(editProj.phases||[]).map((p,i)=>i===idx?{...p,...changes}:p);
                    setEditProj(p=>({...p,phases}));
                    if (isText) {
                      updateProjFieldDebounced(detailProject,{phases});
                    } else {
                      updateProjField(detailProject,{phases});
                    }
                  };
                  return (
                    <div key={ph.id} style={{ marginBottom:10, background:"#F9F9F9", borderRadius:12, padding:"12px 14px", borderRight:(ph.status==="הושלם"||ph.done)?"4px solid #22C55E":ph.status==="בביצוע"?"4px solid #E8C547":"4px solid #DDD" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                        <input value={ph.name} placeholder={`שם השלב ${idx+1}`} onChange={e=>updPhase({name:e.target.value}, true)}
                          style={{ flex:1, border:"none", background:"transparent", fontSize:14, fontFamily:"Heebo,sans-serif", outline:"none", fontWeight:700, textDecoration:ph.status==="הושלם"?"line-through":"none", color:ph.status==="הושלם"?"#AAA":"#1A1A2E" }}/>
                        <button onClick={()=>{ const phases=(editProj.phases||[]).filter((_,i)=>i!==idx); setEditProj(p=>({...p,phases})); updateProjField(detailProject,{phases}); }}
                          style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:14, padding:0, flexShrink:0 }}>✕</button>
                      </div>
                      <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                        {["ממתין","בביצוע","הושלם"].map(st => (
                          <button key={st} onClick={()=>updPhase({status:st, done:st==="הושלם"})}
                            style={{
                              background: ph.status===st ? (st==="הושלם"?"#22C55E":st==="בביצוע"?"#E8C547":"#DDD") : "#F5F5F0",
                              color: ph.status===st ? (st==="הושלם"?"#fff":st==="בביצוע"?"#1A1A2E":"#555") : "#888",
                              border:"none", borderRadius:7, padding:"3px 10px", fontSize:12,
                              cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:ph.status===st?700:400
                            }}>
                            {st==="ממתין"?"⏳":st==="בביצוע"?"🔨":"✅"} {st}
                          </button>
                        ))}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                        <span style={{ fontSize:12, color:"#888", whiteSpace:"nowrap" }}>🎯 יעד:</span>
                        <input type="date" value={ph.targetDate||""} onChange={e=>updPhase({targetDate:e.target.value})}
                          style={{ border:"1px solid #DDD", borderRadius:7, padding:"4px 8px", fontSize:13, fontFamily:"Heebo,sans-serif", background:"#fff", outline:"none" }}/>
                        {ph.targetDate && (ph.status==="הושלם"||ph.done) && <span style={{ background:"#F0FDF4", color:"#2E7D32", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:600 }}>✓ הושלם</span>}
                        {ph.targetDate && ph.status!=="הושלם" && !ph.done && new Date(ph.targetDate)<new Date() && <span style={{ background:"#FCE4EC", color:"#B71C1C", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:600 }}>⚠ באיחור</span>}
                      </div>
                      <textarea value={ph.notes||""} placeholder="הערות, פירוט..." onChange={e=>updPhase({notes:e.target.value}, true)} rows={2}
                        style={{ width:"100%", border:"1px solid #E8E8E8", borderRadius:8, padding:"7px 10px", fontSize:13, fontFamily:"Heebo,sans-serif", background:"#fff", outline:"none", resize:"vertical", boxSizing:"border-box", lineHeight:1.6 }}/>
                    </div>
                  );
                })}
                {(editProj.phases||[]).length>0 && (
                  <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #EEE", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:13, color:"#666" }}>{(editProj.phases||[]).filter(p=>p.status==="הושלם"||p.done).length} / {(editProj.phases||[]).length} שלבים הושלמו</span>
                    <div style={{ background:"#EEE", borderRadius:99, height:7, width:120 }}>
                      <div style={{ height:"100%", borderRadius:99, background:"#22C55E", width:`${Math.round(((editProj.phases||[]).filter(p=>p.status==="הושלם"||p.done).length/Math.max((editProj.phases||[]).length,1))*100)}%` }}/>
                    </div>
                  </div>
                )}
              </div>

              {/* REMAINING MATERIALS - shown when project is completed */}
              {detailProject.status==="הושלם" && (editProj.expenses||[]).filter(e=>e.fromInvoice).length>0 && (
                <div style={{ background:"#fff", borderRadius:14, padding:"16px 20px", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.07)", border:"2px solid #E8C547" }}>
                  <h3 style={{ margin:"0 0 4px", fontSize:15, fontWeight:700 }}>📦 מלאי שנשאר</h3>
                  <p style={{ margin:"0 0 12px", fontSize:12, color:"#777" }}>מלא כמה נשאר מכל חומר</p>
                  <div style={{ borderRadius:10, overflow:"hidden", border:"1px solid #EEE" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr auto", background:"#F5F5F0", padding:"7px 12px", fontSize:12, fontWeight:700, color:"#555" }}>
                      <span>חומר</span><span>נשאר</span>
                    </div>
                    {(editProj.expenses||[]).filter(e=>e.fromInvoice).map((ex,i) => (
                      <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr auto", padding:"8px 12px", borderTop:"1px solid #F0F0EC", alignItems:"center" }}>
                        <span style={{ fontSize:13 }}>{ex.desc}</span>
                        <input type="text" placeholder="כמה נשאר?"
                          value={ex.remaining||""}
                          onChange={e=>{
                            const expenses=(editProj.expenses||[]).map((ex2,j)=>j===i?{...ex2,remaining:e.target.value}:ex2);
                            setEditProj(p=>({...p,expenses}));
                            updateProjFieldDebounced(detailProject,{expenses});
                          }}
                          style={{ width:90, border:"1.5px solid #DDD", borderRadius:8, padding:"5px 8px", fontSize:13, fontFamily:"Heebo,sans-serif", outline:"none", textAlign:"center" }}/>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
              {!isForeman && <button onClick={()=>setNewWM(true)} style={btnY}>+ עובד חדש</button>}
            </div>
            {workers.length===0 && <div style={{ background:"#fff", borderRadius:14, padding:44, textAlign:"center", border:"1.5px dashed #DDD", color:"#AAA" }}><div style={{ fontSize:34, marginBottom:8 }}>👷</div><p style={{ margin:0 }}>אין עובדים — הוסף את הצוות</p></div>}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:11 }}>
              {workers.map(w => {
                const wr = reports.filter(r=>!r._paymentRecord && (String(r.workerId)===String(w.id) || r.workerName===w.name));
                return (
                  <div key={w._dbid} style={{ background:"#fff", borderRadius:14, padding:16, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:9 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                        <div style={{ width:38, height:38, borderRadius:"50%", background:"#1A1A2E", color:"#E8C547", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:15, flexShrink:0 }}>{w.name[0]}</div>
                        <div>
                          <p style={{ margin:0, fontWeight:700, fontSize:14 }}>{w.name} {w.isForeman && <span style={{ fontSize:11 }}>🦺</span>}</p>
                          <p style={{ margin:0, color:"#777", fontSize:12 }}>{w.role}{w.isForeman ? " · מנהל עבודה" : ""}</p>
                        </div>
                      </div>
                      {!isForeman && <button onClick={()=>delWorker(w)} style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:14 }}>✕</button>}
                    </div>
                    <div style={{ background:"#F5F5F0", borderRadius:8, padding:"6px 11px", fontSize:12, marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span><span style={{ color:"#888" }}>קוד: </span><span style={{ fontWeight:700, letterSpacing:2 }}>{w.code||"—"}</span></span>
                      {!isForeman && <button onClick={()=>{ setEditWorker({...w}); setEditWM(true); }} style={{ background:"#1A1A2E", color:"#E8C547", border:"none", borderRadius:6, padding:"2px 9px", fontSize:11, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>ערוך</button>}
                    </div>
                    {w.payType==="hourly" ? <p style={{ margin:"0 0 4px", fontSize:12, color:"#555" }}>⏱️ ₪{fmtNum(w.hourlyRate)} לשעה</p>
                     : w.payType==="global" ? <p style={{ margin:"0 0 4px", fontSize:12, color:"#555" }}>📅 ₪{fmtNum(w.monthlySalary)} לחודש</p>
                     : w.dailyRate ? <p style={{ margin:"0 0 4px", fontSize:12, color:"#555" }}>💵 ₪{fmtNum(w.dailyRate)} ליום</p> : null}
                    <p style={{ margin:0, fontSize:12, color:"#999" }}>💬 {wr.length} דיווחים</p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* PAYROLL TAB */}
        {mgTab==="payroll" && !isForeman && (() => {
          // calc pending/paid per worker
          const allWorkerData = workers.map(w => {
            const { totalDays, totalPay, months, projectBreakdown } = calcWorkerPayroll(w, reports);
            const hasRate = (w.payType==="hourly") ? Number(w.hourlyRate||0)>0
                          : (w.payType==="global") ? Number(w.monthlySalary||0)>0
                          : Number(w.dailyRate||0) > 0;
            // For each month, calculate remaining balance (total earned - already paid)
            const pendingMonths = months.filter(m => {
              const info = paidMonths[`${w.id}_${m.month}`];
              if (!info) return true; // not paid at all
              const alreadyPaid = Number(info.paidAmt||0);
              const remaining = m.pay - alreadyPaid;
              return remaining > 0; // still has balance to pay
            });
            const historyMonths = months.filter(m => {
              const info = paidMonths[`${w.id}_${m.month}`];
              if (!info) return false;
              const alreadyPaid = Number(info.paidAmt||0);
              const remaining = m.pay - alreadyPaid;
              return remaining <= 0; // fully covered
            });
            const pendingPay = pendingMonths.reduce((s, m) => {
              const info = paidMonths[`${w.id}_${m.month}`];
              const already = info ? Number(info.paidAmt||0) : 0;
              return s + m.pay - already;
            }, 0);
            const paidTotal = months.reduce((s, m) => {
              const info = paidMonths[`${w.id}_${m.month}`];
              return s + Number(info?.paidAmt||0);
            }, 0);
            return { w, totalDays, totalPay, months, hasRate, pendingMonths, historyMonths, pendingPay, paidTotal, projectBreakdown };
          });

          const grandPending = allWorkerData.reduce((s, d) => s + (d.hasRate ? d.pendingPay : 0), 0);
          const grandPaid    = allWorkerData.reduce((s, d) => s + (d.hasRate ? d.paidTotal : 0), 0);

          return (
          <>
            <div style={{ marginBottom:14 }}>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800 }}>💰 שכר עובדים</h1>
            </div>

            {/* toggle pending / history */}
            <div style={{ display:"flex", background:"#F0F0EC", borderRadius:12, padding:3, marginBottom:14, gap:3 }}>
              {[{k:"pending",l:"לתשלום"},{k:"history",l:"היסטוריה"},...(plan.subs?[{k:"subs",l:"🔨 קבלנים"}]:[])].map(t=>(
                <button key={t.k} onClick={()=>setPayrollView(t.k)}
                  style={{ flex:1, background:payrollView===t.k?"#1A1A2E":"transparent", color:payrollView===t.k?"#E8C547":"#888", border:"none", borderRadius:10, padding:"8px 0", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>
                  {t.l}
                </button>
              ))}
            </div>

            {/* summary bar */}
            {payrollView!=="subs" && (
            <div style={{ background:"#1A1A2E", borderRadius:14, padding:"12px 18px", marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ color:"#AAA", fontSize:12 }}>{payrollView==="pending" ? 'סה"כ נשאר לתשלום' : 'סה"כ שולם עד כה'}</span>
              <span style={{ color:"#E8C547", fontSize:20, fontWeight:800 }}>₪{fmtNum(payrollView==="pending" ? grandPending : grandPaid)}</span>
            </div>
            )}

            {/* SUBCONTRACTORS VIEW */}
            {payrollView==="subs" && (() => {
              // אוסף כל הקבלנים מכל הפרויקטים
              const allSubs = [];
              projects.forEach(pr => {
                (pr.subcontractors||[]).forEach(sc => {
                  const paid = (sc.payments||[]).filter(p=>p.paid).reduce((s,p)=>s+Number(p.amount||0),0);
                  const total = Number(sc.price||0);
                  allSubs.push({ sc, project: pr, paid, total, remaining: total - paid });
                });
              });
              const grandSubRemaining = allSubs.reduce((s,x)=>s+Math.max(x.remaining,0),0);
              const grandSubPaid = allSubs.reduce((s,x)=>s+x.paid,0);
              return (
                <>
                  <div style={{ background:"#1A1A2E", borderRadius:14, padding:"12px 18px", marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ color:"#AAA", fontSize:12 }}>נשאר לשלם לקבלני משנה</span>
                    <span style={{ color:"#E8C547", fontSize:20, fontWeight:800 }}>₪{fmtNum(grandSubRemaining)}</span>
                  </div>
                  {allSubs.length===0 && (
                    <div style={{ background:"#fff", borderRadius:14, padding:44, textAlign:"center", border:"1.5px dashed #DDD", color:"#AAA" }}>
                      <div style={{ fontSize:34, marginBottom:8 }}>🔨</div>
                      <p style={{ margin:0 }}>אין קבלני משנה — מוסיפים בתוך דף פרויקט</p>
                    </div>
                  )}
                  {allSubs.map(({sc, project, paid, total, remaining}, i) => (
                    <div key={i} style={{ background:"#fff", borderRadius:14, padding:"14px 18px", marginBottom:11, boxShadow:"0 2px 8px rgba(0,0,0,0.07)", borderRight:"4px solid #8B5CF6" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                        <div>
                          <p style={{ margin:0, fontWeight:700, fontSize:15 }}>{sc.name||"ללא שם"}</p>
                          <p style={{ margin:"2px 0 0", fontSize:12, color:"#888" }}>🏗️ {project.name}{sc.work ? ` · ${sc.work}` : ""}</p>
                          <p style={{ margin:"2px 0 0", fontSize:11, color:"#AAA" }}>{sc.withMaterial ? "🧱 כולל חומר" : "🚫 בלי חומר"}{sc.plannedDays ? ` · ${sc.plannedDays} ימים מתוכננים` : ""}</p>
                        </div>
                        <div style={{ textAlign:"left" }}>
                          <p style={{ margin:0, fontSize:16, fontWeight:800, color: remaining>0?"#B71C1C":"#2E7D32" }}>₪{fmtNum(Math.max(remaining,0))}</p>
                          <p style={{ margin:0, fontSize:11, color:"#AAA" }}>נשאר מתוך ₪{fmtNum(total)}</p>
                        </div>
                      </div>
                      {(sc.payments||[]).length>0 && (
                        <div style={{ background:"#F9F9F9", borderRadius:9, padding:"8px 11px" }}>
                          {(sc.payments||[]).map((pm,pi)=>(
                            <div key={pi} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"3px 0", fontSize:12 }}>
                              <span style={{ color:pm.paid?"#2E7D32":"#555" }}>{pm.paid?"✅":"⏳"} {pm.desc||"שלב"}{pm.paid && pm.paidAt ? ` (${pm.paidAt})` : ""}</span>
                              <span style={{ fontWeight:700, color:pm.paid?"#2E7D32":"#333", textDecoration:pm.paid?"line-through":"none" }}>₪{fmtNum(pm.amount||0)}</span>
                            </div>
                          ))}
                          <div style={{ display:"flex", justifyContent:"space-between", paddingTop:6, borderTop:"1px solid #EEE", marginTop:4, fontSize:12 }}>
                            <span style={{ color:"#2E7D32" }}>שולם: ₪{fmtNum(paid)}</span>
                            <span style={{ color:"#888" }}>סימון תשלום — בדף הפרויקט</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              );
            })()}

            {payrollView!=="subs" && workers.length===0 && <div style={{ background:"#fff", borderRadius:14, padding:44, textAlign:"center", border:"1.5px dashed #DDD", color:"#AAA" }}><p style={{ margin:0 }}>אין עובדים עדיין</p></div>}

            {payrollView!=="subs" && allWorkerData.map(({ w, months, hasRate, pendingMonths, historyMonths, pendingPay, paidTotal, projectBreakdown, totalDays }) => {
              const isOpen = payrollWorker === w._dbid;
              const shownMonths = payrollView==="pending" ? pendingMonths : historyMonths;
              if (shownMonths.length===0) return null;
              const displayAmt = payrollView==="pending" ? pendingPay : paidTotal;

              return (
                <div key={w._dbid} style={{ background:"#fff", borderRadius:14, marginBottom:11, boxShadow:"0 2px 8px rgba(0,0,0,0.07)", overflow:"hidden" }}>
                  <div onClick={()=>setPayrollWorker(isOpen ? null : w._dbid)}
                    style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px", cursor:"pointer" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:38, height:38, borderRadius:"50%", background:"#1A1A2E", color:"#E8C547", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:15, flexShrink:0 }}>{w.name[0]}</div>
                      <div>
                        <p style={{ margin:0, fontWeight:700, fontSize:15 }}>{w.name}</p>
                        <p style={{ margin:0, fontSize:12, color:"#888" }}>{w.role}{w.payType==="hourly" ? ` · ₪${fmtNum(w.hourlyRate)}/שעה` : w.payType==="global" ? ` · ₪${fmtNum(w.monthlySalary)}/חודש` : hasRate ? ` · ₪${fmtNum(w.dailyRate)}/יום` : " · אין שכר"}</p>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ textAlign:"left" }}>
                        {hasRate
                          ? <p style={{ margin:0, fontSize:17, fontWeight:800, color: payrollView==="pending"?"#E53935":"#2E7D32" }}>₪{fmtNum(displayAmt)}</p>
                          : <p style={{ margin:0, fontSize:12, color:"#E53935" }}>לא הוגדר שכר</p>}
                        <p style={{ margin:0, fontSize:11, color:"#AAA" }}>{shownMonths.length} חודשים</p>
                      </div>
                      <span style={{ fontSize:16, color:"#BBB" }}>{isOpen?"▲":"▼"}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ borderTop:"1px solid #EEE", padding:"12px 18px" }}>
                      {/* סיכום כללי לפי פרויקט — רק בטאב היסטוריה */}
                      {payrollView==="history" && projectBreakdown?.length>0 && (
                        <div style={{ background:"#F0F4FF", borderRadius:10, padding:"10px 12px", marginBottom:12 }}>
                          <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:700, color:"#3B5BDB" }}>📊 סה"כ ימים לפי פרויקט ({totalDays} ימים)</p>
                          {projectBreakdown.map((pr,pi) => (
                            <div key={pi} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"3px 0", fontSize:12 }}>
                              <span style={{ color:"#555" }}>🏗️ {pr.name}</span>
                              <span style={{ color:"#3B5BDB", fontWeight:700, whiteSpace:"nowrap" }}>
                                {pr.days} ימים{hasRate ? ` · ₪${fmtNum(pr.pay)}` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {shownMonths.length===0 && <p style={{ margin:0, fontSize:13, color:"#AAA", textAlign:"center", padding:"10px 0" }}>אין נתונים</p>}
                      {shownMonths.map(m => {
                        const pKey = `${w.id}_${m.month}`;
                        const paidInfo = paidMonths[pKey];
                        const alreadyPaid = Number(paidInfo?.paidAmt||0);
                        const remaining = m.pay - alreadyPaid;
                        const isShowPartial = showPartial[pKey];
                        return (
                          <div key={m.month} style={{ padding:"12px 0", borderBottom:"1px solid #F5F5F0" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                              <div>
                                <p style={{ margin:0, fontWeight:700, fontSize:14 }}>{m.label}</p>
                                <p style={{ margin:"2px 0 0", fontSize:12, color:"#888" }}>
                                  {w.payType==="hourly"
                                    ? `${m.hours} שעות (רגילות ${m.reg} · 125% ${m.ot125} · 150% ${m.ot150})`
                                    : w.payType==="global" ? `משכורת גלובלית · ${m.days} ימי נוכחות`
                                    : `סה"כ ${m.days} ימים`}{m.fuel>0 ? ` · ⛽ ₪${m.fuel} דלק` : ""}
                                </p>
                                {paidInfo?.partial && !paidInfo.fullyPaid && (
                                  <p style={{ margin:"3px 0 0", fontSize:12, color:"#F57F17" }}>שולם חלקית: ₪{fmtNum(alreadyPaid)} · נותר: ₪{fmtNum(remaining)}</p>
                                )}
                                {paidInfo?.paidAt && <p style={{ margin:"2px 0 0", fontSize:11, color:"#AAA" }}>{paidInfo.fullyPaid?"שולם":"שולם חלקית"} ב-{paidInfo.paidAt}</p>}
                              </div>
                              <div style={{ textAlign:"left" }}>
                                <p style={{ margin:"0 0 4px", fontWeight:700, fontSize:14, color: paidInfo?.fullyPaid?"#2E7D32": paidInfo?.partial?"#F57F17":"#1A1A2E", textDecoration: paidInfo?.fullyPaid?"line-through":"none" }}>₪{fmtNum(m.pay)}</p>
                              </div>
                            </div>

                            {/* per-project breakdown */}
                            {m.projectRows?.length>0 && (
                              <div style={{ background:"#F9F9F9", borderRadius:8, padding:"7px 10px", marginBottom:8 }}>
                                {m.projectRows.map((pr,pi) => (
                                  <div key={pi} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"3px 0", fontSize:12 }}>
                                    <span style={{ color:"#555" }}>🏗️ {pr.name}</span>
                                    <span style={{ color:"#888", whiteSpace:"nowrap" }}>
                                      {pr.days} ימים{pr.fuel>0 ? ` · ⛽₪${pr.fuel}` : ""}{hasRate ? ` · ₪${fmtNum(pr.pay)}` : ""}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* action buttons */}
                            {payrollView==="pending" && hasRate && (() => {
                              const alreadyPaid = Number(paidInfo?.paidAmt||0);
                              const remaining = m.pay - alreadyPaid;
                              const hasRemaining = remaining > 0;
                              return (
                              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                                {hasRemaining && (
                                  <button onClick={()=>markPaid(w.id, m.month, m.pay, false, 0)}
                                    style={{ background:"#1A1A2E", color:"#E8C547", border:"none", borderRadius:8, padding:"5px 12px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>
                                    ✓ שולם במלואו {alreadyPaid>0 ? `(יתרה ₪${fmtNum(remaining)})` : ""}
                                  </button>
                                )}
                                {hasRemaining && (
                                  <button onClick={()=>setShowPartial(p=>({...p,[pKey]:!isShowPartial}))}
                                    style={{ background:"#FFF8E1", color:"#B26A00", border:"1.5px solid #FFD54F", borderRadius:8, padding:"5px 12px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>
                                    שולם חלקית
                                  </button>
                                )}
                                {paidInfo && (
                                  <button onClick={()=>{ if(window.confirm("לבטל את סימון התשלום?") && window.confirm("אישור סופי — האם לבטל?")) unmarkPaid(w.id, m.month); }}
                                    style={{ background:"#FCE4EC", color:"#B71C1C", border:"none", borderRadius:8, padding:"5px 10px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>
                                    בטל הכל
                                  </button>
                                )}
                              </div>
                              );
                            })()}
                            {payrollView==="history" && hasRate && paidInfo && (
                              <div style={{ marginTop:6 }}>
                                {editPaymentKey !== pKey ? (
                                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                                    <button onClick={()=>{ setEditPaymentKey(pKey); setEditPaymentAmt(String(paidInfo.paidAmt||"")); }}
                                      style={{ background:"#E3F2FD", color:"#1565C0", border:"none", borderRadius:8, padding:"5px 12px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>
                                      ✏️ ערוך סכום
                                    </button>
                                    <button onClick={()=>{ if(window.confirm("לבטל את סימון התשלום?") && window.confirm("אישור סופי — האם לבטל?")) unmarkPaid(w.id, m.month); }}
                                      style={{ background:"#FCE4EC", color:"#B71C1C", border:"none", borderRadius:8, padding:"5px 10px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>
                                      🗑 בטל
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ background:"#F0F8FF", borderRadius:10, padding:"10px 12px", border:"1.5px solid #90CAF9" }}>
                                    <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:700, color:"#1565C0" }}>עריכת סכום ששולם</p>
                                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                                      <input type="number" value={editPaymentAmt}
                                        onChange={e=>setEditPaymentAmt(e.target.value)}
                                        placeholder={`מתוך ₪${fmtNum(m.pay)}`}
                                        style={{ flex:1, border:"1.5px solid #90CAF9", borderRadius:8, padding:"7px 10px", fontSize:14, fontFamily:"Heebo,sans-serif", outline:"none", background:"#fff" }}/>
                                      <button onClick={()=>{
                                        if (!editPaymentAmt) return;
                                        if (!window.confirm(`לשנות לסכום ₪${Number(editPaymentAmt).toLocaleString("he-IL")}?`)) return;
                                        markPaid(w.id, m.month, m.pay, Number(editPaymentAmt) < m.pay, editPaymentAmt);
                                        setEditPaymentKey(null);
                                        setEditPaymentAmt("");
                                      }} style={{ background:"#1565C0", color:"#fff", border:"none", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>
                                        שמור
                                      </button>
                                      <button onClick={()=>{ setEditPaymentKey(null); setEditPaymentAmt(""); }}
                                        style={{ background:"#F0F0EC", color:"#555", border:"none", borderRadius:8, padding:"7px 12px", fontSize:13, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>
                                        ביטול
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* partial amount input */}
                            {isShowPartial && payrollView==="pending" && (
                              <div style={{ display:"flex", gap:6, marginTop:8, alignItems:"center" }}>
                                <input type="number" placeholder={`מתוך ₪${fmtNum(m.pay)}`}
                                  value={partialInput[pKey]||""}
                                  onChange={e=>setPartialInput(p=>({...p,[pKey]:e.target.value}))}
                                  style={{ flex:1, border:"1.5px solid #FFD54F", borderRadius:8, padding:"6px 10px", fontSize:14, fontFamily:"Heebo,sans-serif", outline:"none" }}/>
                                <button onClick={()=>{ if(partialInput[pKey]) markPaid(w.id, m.month, m.pay, true, partialInput[pKey]); }}
                                  style={{ background:"#F57F17", color:"#fff", border:"none", borderRadius:8, padding:"6px 14px", fontSize:13, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>
                                  אשר
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* total row */}
                      {shownMonths.length>0 && hasRate && (
                        <div style={{ display:"flex", justifyContent:"space-between", paddingTop:10 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:"#555" }}>סה"כ {payrollView==="pending"?"לתשלום":"שולם"}</span>
                          <span style={{ fontSize:16, fontWeight:800, color: payrollView==="pending"?"#E53935":"#2E7D32" }}>₪{fmtNum(displayAmt)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
          );
        })()}

        {/* CALENDAR TAB */}
        {mgTab==="calendar" && (() => {
          const [year, month] = calMonth.split("-").map(Number);
          const firstDay = new Date(year, month-1, 1);
          const lastDay = new Date(year, month, 0);
          const daysInMonth = lastDay.getDate();
          // day of week of first day (0=sun)
          const startDow = firstDay.getDay();
          const dayNames = ["א","ב","ג","ד","ה","ו","ש"];
          const prevMonth = () => {
            const d = new Date(year, month-2, 1);
            setCalMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
          };
          const nextMonth = () => {
            const d = new Date(year, month, 1);
            setCalMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
          };
          const monthLabel = new Date(year, month-1, 1).toLocaleDateString("he-IL",{year:"numeric",month:"long"});

          return (
          <>
            <div style={{ marginBottom:14 }}>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800 }}>📅 יומן עסקי</h1>
              <p style={{ margin:"3px 0 0", color:"#777", fontSize:13 }}>לוח חודשי — תכנון עובדים ומשימות</p>
            </div>

            {/* Month navigation */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#1A1A2E", borderRadius:14, padding:"12px 18px", marginBottom:14 }}>
              <button onClick={prevMonth} style={{ background:"rgba(255,255,255,0.1)", color:"#fff", border:"none", borderRadius:8, padding:"6px 14px", fontSize:16, cursor:"pointer" }}>◀</button>
              <span style={{ color:"#E8C547", fontWeight:800, fontSize:16 }}>{monthLabel}</span>
              <button onClick={nextMonth} style={{ background:"rgba(255,255,255,0.1)", color:"#fff", border:"none", borderRadius:8, padding:"6px 14px", fontSize:16, cursor:"pointer" }}>▶</button>
            </div>

            {/* Day names header */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:3 }}>
              {dayNames.map(d => (
                <div key={d} style={{ textAlign:"center", fontSize:12, fontWeight:700, color:"#888", padding:"4px 0" }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:16 }}>
              {Array.from({length: startDow}).map((_,i) => <div key={`e${i}`}/>)}
              {Array.from({length: daysInMonth}).map((_,i) => {
                const day = i+1;
                const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const ev = calEvents[dateStr];
                // תאימות לאחור: נתונים ישנים עם workers בלבד
                const allAssigns = ev?.assignments?.length
                  ? ev.assignments
                  : (ev?.workers?.length ? [{ projectId: "", workers: ev.workers }] : []);
                const assigns = isForeman ? allAssigns.filter(a => canSeeProject(a.projectId)) : allAssigns;
                const hasData = assigns.length>0 || ev?.tasks;
                const isToday = dateStr === todayStr();
                return (
                  <div key={day} onClick={()=>{ setCalEditDay(dateStr); setCalEditData({assignments: assigns.map(a=>({projectId:a.projectId||"", workers:[...(a.workers||[])]})), tasks: ev?.tasks||""}); }}
                    style={{ background: isToday?"#E8C547": hasData?"#E8F5E9":"#fff", borderRadius:10, padding:"6px 3px", minHeight:56, cursor:"pointer", border: isToday?"2px solid #B26A00":"1.5px solid #EEE", position:"relative" }}>
                    <div style={{ fontSize:13, fontWeight:isToday?800:600, color:isToday?"#1A1A2E":hasData?"#2E7D32":"#333", textAlign:"center" }}>{day}</div>
                    {hasData && (
                      <div style={{ marginTop:2 }}>
                        {assigns.slice(0,2).map((a,ai) => {
                          const pr = projects.find(p=>String(p.id)===String(a.projectId));
                          const label = pr ? pr.name : "ללא פרויקט";
                          return (
                            <div key={ai} style={{ background:"#1A1A2E", color:"#E8C547", borderRadius:4, fontSize:8, padding:"1px 3px", marginBottom:2, textAlign:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {label}{a.workers?.length ? ` (${a.workers.length})` : ""}
                            </div>
                          );
                        })}
                        {assigns.length>2 && <div style={{ fontSize:8, color:"#2E7D32", textAlign:"center" }}>+{assigns.length-2}</div>}
                        {ev?.tasks && <div style={{ fontSize:9, color:"#555", textAlign:"center" }}>📝</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Edit day modal */}
            {calEditDay && (
              <div onClick={()=>setCalEditDay(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:999 }}>
                <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:"18px 18px 0 0", padding:24, width:"100%", maxWidth:520, maxHeight:"80vh", overflowY:"auto", direction:"rtl" }}>
                  <h3 style={{ margin:"0 0 14px", fontWeight:800, fontSize:16 }}>
                    📅 {new Date(calEditDay+"T12:00:00").toLocaleDateString("he-IL",{weekday:"long",day:"numeric",month:"long"})}
                  </h3>

                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <p style={{ margin:0, fontSize:13, fontWeight:700 }}>🏗️ פרויקטים ליום זה</p>
                    <button onClick={()=>setCalEditData(prev=>({...prev, assignments:[...(prev.assignments||[]), {projectId:"", workers:[], assignedBy: isForeman ? (loggedForeman?.name||"מנהל עבודה") : "מנהל ראשי"}]}))}
                      style={{ background:"#1A1A2E", color:"#E8C547", border:"none", borderRadius:7, padding:"4px 12px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>
                      + הוסף פרויקט
                    </button>
                  </div>

                  {(calEditData.assignments||[]).length===0 && (
                    <p style={{ margin:"0 0 12px", fontSize:13, color:"#AAA" }}>לא שובצו פרויקטים — לחץ "הוסף פרויקט"</p>
                  )}

                  {(calEditData.assignments||[]).map((a, ai) => {
                    const updAssign = (changes) => {
                      setCalEditData(prev => ({
                        ...prev,
                        assignments: (prev.assignments||[]).map((x,i)=> i===ai ? {...x, ...changes} : x)
                      }));
                    };
                    // עובדים שכבר משובצים לפרויקט אחר באותו יום — כולל היכן ומי שיבץ
                    const takenMap = {};
                    (calEditData.assignments||[]).forEach((x,i)=>{
                      if (i===ai) return;
                      (x.workers||[]).forEach(wid=>{
                        const pr = projects.find(p=>String(p.id)===String(x.projectId));
                        takenMap[wid] = { projectName: pr?.name || "פרויקט אחר", assignedBy: x.assignedBy || "לא ידוע", idx: i };
                      });
                    });
                    const takenElsewhere = Object.keys(takenMap);
                    return (
                      <div key={ai} style={{ background:"#F9F9F9", borderRadius:12, padding:"12px 14px", marginBottom:10, borderRight:"4px solid #E8C547" }}>
                        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10 }}>
                          <select value={a.projectId} onChange={e=>updAssign({projectId:e.target.value})}
                            style={{ flex:1, border:"1.5px solid #DDD", borderRadius:8, padding:"7px 10px", fontSize:14, fontFamily:"Heebo,sans-serif", outline:"none", background:"#fff" }}>
                            <option value="">— בחר פרויקט —</option>
                            {visibleProjects.filter(p=>p.status!=="הושלם").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <button onClick={()=>setCalEditData(prev=>({...prev, assignments:(prev.assignments||[]).filter((_,i)=>i!==ai)}))}
                            style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:16, padding:0, flexShrink:0 }}>✕</button>
                        </div>
                        <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:600, color:"#666" }}>👷 עובדים ({(a.workers||[]).length})</p>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {workers.map(w => {
                            const wid = String(w.id);
                            const isSelected = (a.workers||[]).includes(wid);
                            const isTaken = takenElsewhere.includes(wid);
                            return (
                              <button key={w.id}
                                onClick={()=>{
                                  if (isTaken && !isSelected) {
                                    const info = takenMap[wid];
                                    const msg = `${w.name} כבר משובץ ליום זה לפרויקט "${info.projectName}" (שובץ ע"י: ${info.assignedBy}).`;
                                    if (isForeman) { alert(msg); return; }
                                    if (!window.confirm(msg + "\n\nלשבץ בכל זאת גם לפרויקט זה?")) return;
                                  }
                                  updAssign({
                                    workers: isSelected
                                      ? (a.workers||[]).filter(id=>id!==wid)
                                      : [...(a.workers||[]), wid]
                                  });
                                }}
                                style={{
                                  background: isSelected?"#1A1A2E": isTaken?"#EEE":"#F0F0EC",
                                  color: isSelected?"#E8C547": isTaken?"#BBB":"#555",
                                  border:"none", borderRadius:8, padding:"6px 11px", fontSize:12,
                                  cursor: "pointer",
                                  fontFamily:"Heebo,sans-serif", fontWeight:isSelected?700:400,
                                  opacity: (isTaken && !isSelected)?0.5:1
                                }}>
                                {w.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <p style={{ margin:"0 0 8px", fontSize:13, fontWeight:700 }}>📝 משימות ולו״ז</p>
                  <textarea value={calEditData.tasks} onChange={e=>setCalEditData(prev=>({...prev,tasks:e.target.value}))}
                    placeholder="לדוגמה: בוקר — יציקת בטון בלול גבעות, צהריים — פגישה עם ספק..." rows={4}
                    style={{ width:"100%", border:"1.5px solid #DDD", borderRadius:10, padding:"10px 12px", fontSize:14, fontFamily:"Heebo,sans-serif", outline:"none", resize:"vertical", boxSizing:"border-box" }}/>

                  <div style={{ display:"flex", gap:10, marginTop:14 }}>
                    <button onClick={()=>saveCalDay(calEditDay, calEditData)} style={{ flex:1, background:"#1A1A2E", color:"#E8C547", border:"none", borderRadius:10, padding:"11px 0", fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>שמור</button>
                    <button onClick={()=>setCalEditDay(null)} style={{ flex:1, background:"#F0F0EC", color:"#555", border:"none", borderRadius:10, padding:"11px 0", fontWeight:600, fontSize:15, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>ביטול</button>
                  </div>
                </div>
              </div>
            )}
          </>
          );
        })()}

        {/* EQUIPMENT TAB */}
        {mgTab==="equipment" && !isForeman && (
          <>
            <div style={{ marginBottom:14 }}>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800 }}>🛒 ציוד לקנייה</h1>
              <p style={{ margin:"3px 0 0", color:"#777", fontSize:13 }}>רשימת קנייה לעסק</p>
            </div>

            {/* Add item */}
            <div style={{ background:"#fff", borderRadius:14, padding:"14px 16px", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input value={equipNew.name} onChange={e=>setEquipNew(p=>({...p,name:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&addEquipItem()}
                  placeholder="שם פריט..." style={{ flex:2, border:"1.5px solid #DDD", borderRadius:10, padding:"9px 12px", fontSize:14, fontFamily:"Heebo,sans-serif", outline:"none" }}/>
                <input type="number" value={equipNew.qty} onChange={e=>setEquipNew(p=>({...p,qty:e.target.value}))}
                  placeholder="כמות" style={{ flex:1, border:"1.5px solid #DDD", borderRadius:10, padding:"9px 12px", fontSize:14, fontFamily:"Heebo,sans-serif", outline:"none" }}/>
                <button onClick={addEquipItem} style={{ background:"#1A1A2E", color:"#E8C547", border:"none", borderRadius:10, padding:"9px 16px", fontSize:15, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>+</button>
              </div>
            </div>

            {/* Summary */}
            {equipList.length>0 && (
              <div style={{ display:"flex", justifyContent:"space-between", background:"#F0F0EC", borderRadius:10, padding:"8px 14px", marginBottom:12, fontSize:13, color:"#555" }}>
                <span>סה"כ: {equipList.length} פריטים</span>
                <span>✅ {equipList.filter(e=>e.done).length} נקנו · ⏳ {equipList.filter(e=>!e.done).length} נשארו</span>
              </div>
            )}

            {/* List */}
            {equipList.length===0 && (
              <div style={{ background:"#fff", borderRadius:14, padding:44, textAlign:"center", border:"1.5px dashed #DDD", color:"#AAA" }}>
                <div style={{ fontSize:34, marginBottom:8 }}>🛒</div>
                <p style={{ margin:0 }}>הרשימה ריקה — הוסף פריטים</p>
              </div>
            )}
            {equipList.filter(e=>!e.done).map(item => (
              <div key={item._dbid} style={{ background:"#fff", borderRadius:12, padding:"12px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:12, boxShadow:"0 1px 5px rgba(0,0,0,0.06)" }}>
                <button onClick={()=>toggleEquipDone(item)} style={{ width:24, height:24, borderRadius:"50%", border:"2px solid #DDD", background:"#fff", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}/>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontWeight:700, fontSize:14 }}>{item.name}</p>
                  <p style={{ margin:0, fontSize:12, color:"#888" }}>כמות: {item.qty}</p>
                </div>
                <button onClick={()=>delEquipItem(item)} style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:16 }}>✕</button>
              </div>
            ))}

            {/* Bought items */}
            {equipList.filter(e=>e.done).length>0 && (
              <>
                <p style={{ margin:"14px 0 8px", fontSize:13, fontWeight:700, color:"#888" }}>✅ נקנו</p>
                {equipList.filter(e=>e.done).map(item => (
                  <div key={item._dbid} style={{ background:"#F9F9F9", borderRadius:12, padding:"10px 16px", marginBottom:7, display:"flex", alignItems:"center", gap:12, opacity:0.7 }}>
                    <button onClick={()=>toggleEquipDone(item)} style={{ width:24, height:24, borderRadius:"50%", border:"2px solid #22C55E", background:"#22C55E", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:14 }}>✓</button>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontWeight:600, fontSize:14, textDecoration:"line-through", color:"#AAA" }}>{item.name}</p>
                      <p style={{ margin:0, fontSize:12, color:"#BBB" }}>כמות: {item.qty}</p>
                    </div>
                    <button onClick={()=>delEquipItem(item)} style={{ background:"none", border:"none", cursor:"pointer", color:"#DDD", fontSize:16 }}>✕</button>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* QUOTES TAB */}
        {mgTab==="quotes" && !isForeman && (() => {
          const openQ = quotes.filter(q => q.status !== "נדחתה");
          const openSum = openQ.reduce((s,q)=>s+quoteTotal(q),0);
          return (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div>
                <h1 style={{ margin:0, fontSize:20, fontWeight:800 }}>📄 הצעות מחיר</h1>
                <p style={{ margin:"3px 0 0", color:"#777", fontSize:13 }}>{quotes.length} הצעות · פתוחות בשווי ₪{fmtNum(openSum)}</p>
              </div>
              <button onClick={()=>{ setEditQuote({ clientName:"", clientPhone:"", title:"", desc:"", amount:"", items:[] }); setQuoteM(true); }} style={btnY}>+ הצעת מחיר</button>
            </div>

            {quotes.length===0 && (
              <div style={{ background:"#fff", borderRadius:14, padding:44, textAlign:"center", border:"1.5px dashed #DDD", color:"#AAA" }}>
                <div style={{ fontSize:34, marginBottom:8 }}>📄</div>
                <p style={{ margin:0 }}>אין הצעות מחיר עדיין</p>
              </div>
            )}

            {[...quotes].reverse().map(q => (
              <div key={q._dbid} style={{ background:"#fff", borderRadius:14, padding:"15px 18px", marginBottom:11, boxShadow:"0 2px 8px rgba(0,0,0,0.07)", borderRight:`4px solid ${q.status==="נדחתה"?"#E53935":"#0EA5E9"}`, opacity:q.status==="נדחתה"?0.6:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                  <div style={{ flex:1, cursor:"pointer" }} onClick={()=>{ setEditQuote({...q}); setQuoteM(true); }}>
                    <p style={{ margin:0, fontWeight:700, fontSize:15 }}>{q.title}</p>
                    <p style={{ margin:"2px 0 0", fontSize:12, color:"#888" }}>
                      👤 {q.clientName||"ללא שם"}{q.clientPhone ? ` · 📞 ${q.clientPhone}` : ""} · 📅 {q.date}
                    </p>
                    {q.desc && <p style={{ margin:"4px 0 0", fontSize:12, color:"#666" }}>{q.desc}</p>}
                    {(q.items||[]).length>0 && (
                      <div style={{ marginTop:7, background:"#F9F9F9", borderRadius:8, padding:"7px 10px" }}>
                        {(q.items||[]).map((it,ii)=>(
                          <div key={ii} style={{ display:"flex", justifyContent:"space-between", padding:"2px 0", fontSize:12 }}>
                            <span style={{ color:"#555" }}>{it.withMaterial!==false?"🧱":"🚫"} {it.desc||"סעיף"}</span>
                            <span style={{ fontWeight:700, color:"#333", whiteSpace:"nowrap" }}>₪{fmtNum(it.amount||0)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign:"left", flexShrink:0, marginRight:8 }}>
                    <p style={{ margin:0, fontSize:17, fontWeight:800, color:"#1A1A2E" }}>₪{fmtNum(quoteTotal(q))}</p>
                    <span style={{ fontSize:11, fontWeight:700, color: q.status==="נדחתה"?"#E53935":"#0EA5E9" }}>{q.status||"נשלחה"}</span>
                  </div>
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", paddingTop:8, borderTop:"1px solid #F0F0F0" }}>
                  <button onClick={()=>convertQuote(q)}
                    style={{ background:"#2E7D32", color:"#fff", border:"none", borderRadius:8, padding:"6px 13px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>
                    ✓ נסגרה — צור פרויקט
                  </button>
                  {q.clientPhone && (
                    <a href={`https://wa.me/972${String(q.clientPhone).replace(/[^0-9]/g,"").replace(/^0/,"")}`} target="_blank" rel="noreferrer"
                      style={{ background:"#25D366", color:"#fff", borderRadius:8, padding:"6px 13px", fontSize:12, textDecoration:"none", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>
                      💬 וואטסאפ
                    </a>
                  )}
                  {q.status!=="נדחתה"
                    ? <button onClick={()=>setQuoteStatus(q,"נדחתה")} style={{ background:"#FCE4EC", color:"#B71C1C", border:"none", borderRadius:8, padding:"6px 13px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>✗ נדחתה</button>
                    : <button onClick={()=>setQuoteStatus(q,"נשלחה")} style={{ background:"#E3F2FD", color:"#1565C0", border:"none", borderRadius:8, padding:"6px 13px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>↩ החזר לפתוחה</button>}
                  <button onClick={()=>delQuote(q)} style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:14, marginRight:"auto" }}>✕</button>
                </div>
              </div>
            ))}
          </>
          );
        })()}

        {/* HELP TAB */}
        {mgTab==="help" && (() => {
          const q = helpSearch.trim();
          const shown = HELP_TOPICS.filter(t => !q || t.title.includes(q) || t.body.includes(q));
          return (
          <>
            <h1 style={{ margin:"0 0 4px", fontSize:20, fontWeight:800 }}>❓ מדריך שימוש</h1>
            <p style={{ margin:"0 0 14px", color:"#777", fontSize:13 }}>לחצו על נושא לפתיחה, או חפשו מילה</p>
            <input value={helpSearch} onChange={e=>setHelpSearch(e.target.value)} placeholder="🔍 חיפוש — למשל: דלק, שיבוץ, קבלן..."
              style={{ width:"100%", boxSizing:"border-box", border:"1.5px solid #DDD", borderRadius:12, padding:"11px 14px", fontSize:14, fontFamily:"Heebo,sans-serif", outline:"none", background:"#fff", marginBottom:14 }}/>
            {shown.length===0 && <p style={{ textAlign:"center", color:"#AAA", fontSize:13 }}>לא נמצא נושא מתאים</p>}
            {shown.map((t,i) => {
              const open = helpOpen === t.title;
              return (
                <div key={t.title} style={{ background:"#fff", borderRadius:13, marginBottom:9, boxShadow:"0 1px 5px rgba(0,0,0,0.06)", overflow:"hidden" }}>
                  <div onClick={()=>setHelpOpen(open ? null : t.title)}
                    style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 17px", cursor:"pointer" }}>
                    <span style={{ fontWeight:700, fontSize:14 }}>{t.icon} {t.title}</span>
                    <span style={{ color:"#BBB", fontSize:14 }}>{open?"▲":"▼"}</span>
                  </div>
                  {open && (
                    <div style={{ padding:"0 17px 14px", borderTop:"1px solid #F2F2EE" }}>
                      {t.body.split("\n").map((line,li) => (
                        <p key={li} style={{ margin:"7px 0 0", fontSize:13, lineHeight:1.65, color:"#444" }}>{line}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
          );
        })()}

        {/* FOREMEN TAB */}
        {mgTab==="foremen" && !isForeman && (() => {
          const foremen = workers.filter(w => w.isForeman);
          const nonForemen = workers.filter(w => !w.isForeman);
          return (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div>
                <h1 style={{ margin:0, fontSize:20, fontWeight:800 }}>🦺 מנהלי עבודה</h1>
                <p style={{ margin:"3px 0 0", color:"#777", fontSize:13 }}>{foremen.length} מנהלי עבודה</p>
              </div>
              <button onClick={()=>setNewForemanM(true)} style={btnY}>+ מנהל עבודה</button>
            </div>

            {/* הפיכת עובד קיים למנהל עבודה */}
            {nonForemen.length>0 && (
              <div style={{ background:"#fff", borderRadius:14, padding:"14px 16px", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
                <p style={{ margin:"0 0 8px", fontSize:13, fontWeight:700 }}>הפוך עובד קיים למנהל עבודה</p>
                <div style={{ display:"flex", gap:8 }}>
                  <select value={promoteId} onChange={e=>setPromoteId(e.target.value)} style={{ flex:1, ...inp, fontSize:14 }}>
                    <option value="">— בחר עובד —</option>
                    {nonForemen.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  <button onClick={promoteToForeman} disabled={!promoteId} style={{ ...btnD, fontSize:13, opacity:promoteId?1:0.4 }}>הפוך</button>
                </div>
              </div>
            )}

            {foremen.length===0 && (
              <div style={{ background:"#fff", borderRadius:14, padding:44, textAlign:"center", border:"1.5px dashed #DDD", color:"#AAA" }}>
                <div style={{ fontSize:34, marginBottom:8 }}>🦺</div>
                <p style={{ margin:0 }}>אין מנהלי עבודה עדיין</p>
              </div>
            )}

            {foremen.map(w => {
              const assigned = (w.foremanProjects||[]).map(String);
              return (
                <div key={w._dbid} style={{ background:"#fff", borderRadius:14, padding:"16px 18px", marginBottom:11, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:38, height:38, borderRadius:"50%", background:"#E8C547", color:"#1A1A2E", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:15, flexShrink:0 }}>{w.name[0]}</div>
                      <div>
                        <p style={{ margin:0, fontWeight:700, fontSize:15 }}>{w.name}</p>
                        <p style={{ margin:0, fontSize:12, color:"#888" }}>{w.role||"מנהל עבודה"}</p>
                      </div>
                    </div>
                    <button onClick={()=>demoteForeman(w)} style={{ background:"#FCE4EC", color:"#B71C1C", border:"none", borderRadius:8, padding:"4px 10px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif" }}>בטל הרשאה</button>
                  </div>

                  <label style={{ display:"block", marginBottom:12 }}>
                    <span style={{ fontSize:12, fontWeight:600, display:"block", marginBottom:4, color:"#555" }}>🔑 קוד מנהל עבודה</span>
                    <input value={w.foremanCode||""} placeholder="לדוגמה: 7788"
                      onChange={e=>updateWorkerFields(w, { foremanCode: e.target.value })}
                      style={{ ...inp, letterSpacing:3, fontSize:16 }}/>
                    {!w.foremanCode && <p style={{ margin:"4px 0 0", fontSize:11, color:"#E53935" }}>ללא קוד לא ניתן להתחבר</p>}
                  </label>

                  <p style={{ margin:"0 0 7px", fontSize:12, fontWeight:700, color:"#555" }}>🏗️ פרויקטים מורשים ({assigned.length})</p>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {projects.filter(p=>p.status!=="הושלם").length===0 && <p style={{ margin:0, fontSize:12, color:"#AAA" }}>אין פרויקטים פעילים</p>}
                    {projects.filter(p=>p.status!=="הושלם").map(p => {
                      const on = assigned.includes(String(p.id));
                      return (
                        <button key={p.id} onClick={()=>toggleForemanProject(w, p.id)}
                          style={{ background:on?"#1A1A2E":"#F0F0EC", color:on?"#E8C547":"#555", border:"none", borderRadius:8, padding:"6px 11px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:on?700:400 }}>
                          {on?"✓ ":""}{p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
          );
        })()}

        {/* SETTINGS */}
        {mgTab==="settings" && !isForeman && (
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

      {/* MODAL: הצעת מחיר */}
      {quoteM && (
        <div onClick={()=>setQuoteM(false)} style={OVL}>
          <div onClick={e=>e.stopPropagation()} style={MOD}>
            <h3 style={{ margin:"0 0 14px", fontWeight:800, fontSize:17 }}>{editQuote._dbid ? "עריכת הצעת מחיר" : "הצעת מחיר חדשה"}</h3>
            {[
              { key:"title", label:"שם העבודה / הפרויקט", ph:"גבס וצבע — דירה ברעננה" },
              { key:"clientName", label:"שם הלקוח", ph:"ישראל ישראלי" },
              { key:"clientPhone", label:"טלפון (אופציונלי)", ph:"050-1234567" },
            ].map(f=>(
              <label key={f.key} style={{ display:"block", marginBottom:11 }}>
                <LBL t={f.label}/>
                <input type={f.type||"text"} value={editQuote[f.key]||""} placeholder={f.ph}
                  onChange={e=>setEditQuote({...editQuote,[f.key]:e.target.value})} style={inp}/>
              </label>
            ))}
            {/* סעיפי ההצעה */}
            <div style={{ background:"#F9F9F9", borderRadius:12, padding:"12px 14px", marginBottom:11 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:700 }}>📋 סעיפי ההצעה</span>
                <button type="button" onClick={()=>setEditQuote(prev=>({...prev, items:[...(prev.items||[]), {id:Date.now(), desc:"", amount:"", withMaterial:true}]}))}
                  style={{ background:"#1A1A2E", color:"#E8C547", border:"none", borderRadius:7, padding:"4px 12px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>+ סעיף</button>
              </div>
              {(editQuote.items||[]).length===0 && (
                <p style={{ margin:0, fontSize:12, color:"#AAA" }}>עבודה קטנה? אפשר בלי סעיפים — רק סכום כולל למטה</p>
              )}
              {(editQuote.items||[]).map((it,ii) => {
                const updIt = (changes) => setEditQuote(prev=>({...prev, items:(prev.items||[]).map((x,i)=>i===ii?{...x,...changes}:x)}));
                return (
                  <div key={it.id} style={{ marginBottom:8 }}>
                    <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:5 }}>
                      <input value={it.desc} placeholder="לדוגמה: עבודות גבס" onChange={e=>updIt({desc:e.target.value})}
                        style={{ flex:2, border:"1.5px solid #DDD", borderRadius:8, padding:"7px 10px", fontSize:13, fontFamily:"Heebo,sans-serif", outline:"none", background:"#fff" }}/>
                      <input type="number" value={it.amount} placeholder="₪" onChange={e=>updIt({amount:e.target.value})}
                        style={{ flex:1, border:"1.5px solid #DDD", borderRadius:8, padding:"7px 10px", fontSize:13, fontFamily:"Heebo,sans-serif", outline:"none", background:"#fff" }}/>
                      <button type="button" onClick={()=>setEditQuote(prev=>({...prev, items:(prev.items||[]).filter((_,i)=>i!==ii)}))}
                        style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", fontSize:14, padding:0, flexShrink:0 }}>✕</button>
                    </div>
                    <div style={{ display:"flex", gap:5 }}>
                      {[{v:true,l:"🧱 כולל חומר"},{v:false,l:"🚫 בלי חומר"}].map(opt=>(
                        <button key={String(opt.v)} type="button" onClick={()=>updIt({withMaterial:opt.v})}
                          style={{ flex:1, background:(it.withMaterial!==false)===opt.v?"#1A1A2E":"#EEE", color:(it.withMaterial!==false)===opt.v?"#E8C547":"#999", border:"none", borderRadius:7, padding:"4px 0", fontSize:11, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:(it.withMaterial!==false)===opt.v?700:400 }}>
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {(editQuote.items||[]).length>0 && (
                <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8, borderTop:"1px solid #E5E5E0", marginTop:4 }}>
                  <span style={{ fontSize:13, fontWeight:700 }}>סה"כ הצעה</span>
                  <span style={{ fontSize:15, fontWeight:800, color:"#1A1A2E" }}>₪{fmtNum(quoteTotal(editQuote))}</span>
                </div>
              )}
            </div>

            {(editQuote.items||[]).length===0 && (
              <label style={{ display:"block", marginBottom:11 }}>
                <LBL t='סכום ההצעה (₪)'/>
                <input type="number" value={editQuote.amount||""} placeholder="45000"
                  onChange={e=>setEditQuote({...editQuote, amount:e.target.value})} style={inp}/>
              </label>
            )}

            <label style={{ display:"block", marginBottom:11 }}>
              <LBL t="תיאור העבודה"/>
              <textarea value={editQuote.desc||""} placeholder="לדוגמה: 200 מטר גבס כולל חומר, צבע 2 שכבות..."
                onChange={e=>setEditQuote({...editQuote, desc:e.target.value})} rows={3}
                style={{ ...inp, resize:"vertical", boxSizing:"border-box" }}/>
            </label>
            <div style={{ display:"flex", gap:10, marginTop:6 }}>
              <button onClick={saveQuote} style={{ ...btnD, flex:1 }}>{editQuote._dbid ? "שמור" : "הוסף"}</button>
              <button onClick={()=>setQuoteM(false)} style={{ ...btnG, flex:1 }}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: אישור תנאי שימוש — חד-פעמי לכל קבלן */}
      {!isForeman && termsAccepted === false && (
        <div style={{ ...OVL }}>
          <div style={{ ...MOD, maxWidth:440 }}>
            <h3 style={{ margin:"0 0 4px", fontWeight:800, fontSize:18 }}>📜 תנאי שימוש</h3>
            <p style={{ margin:"0 0 12px", color:"#777", fontSize:13 }}>לפני תחילת השימוש במערכת, יש לקרוא ולאשר את התנאים הבאים:</p>
            <div style={{ background:"#F9F9F9", border:"1.5px solid #EEE", borderRadius:12, padding:"14px 16px", maxHeight:320, overflowY:"auto", fontSize:12.5, lineHeight:1.7, color:"#444", marginBottom:14, textAlign:"right" }}>
              <p style={{ margin:"0 0 8px" }}><b>1. כללי.</b> מערכת BuildTrack ("המערכת") מסופקת כשירות מקוון לניהול אתרי בנייה, במצבה כפי שהוא (AS-IS).</p>
              <p style={{ margin:"0 0 8px" }}><b>2. מנוי ותשלום.</b> השימוש במערכת מותנה בתשלום דמי הקמה ודמי מנוי כפי שסוכמו. אי-תשלום עלול להוביל להשהיית הגישה לאחר מתן התראה.</p>
              <p style={{ margin:"0 0 8px" }}><b>3. הנתונים שלך.</b> כל הנתונים שמזין הלקוח שייכים ללקוח בלבד. בסיום ההתקשרות יימסר ללקוח, לפי בקשתו, ייצוא מלא של נתוניו.</p>
              <p style={{ margin:"0 0 8px" }}><b>4. אחריות הלקוח.</b> הלקוח אחראי לשמירת סודיות קודי הגישה, לנכונות הנתונים המוזנים, ולעמידה בהוראות כל דין — לרבות דיני עבודה ושכר. המערכת היא כלי עזר ניהולי ואינה תחליף לייעוץ משפטי, חשבונאי או אחר.</p>
              <p style={{ margin:"0 0 8px" }}><b>5. זמינות וגיבוי.</b> הספק פועל לזמינות גבוהה ולגיבוי שוטף של הנתונים, אך אינו מתחייב לפעילות רציפה וללא תקלות.</p>
              <p style={{ margin:"0 0 8px" }}><b>6. הגבלת אחריות.</b> אחריות הספק בכל עילה שהיא מוגבלת לסכום דמי המנוי ששולמו בפועל בשלושת החודשים שקדמו לאירוע. הספק לא יישא בכל נזק עקיף, אובדן רווח, אובדן מידע או נזק תוצאתי.</p>
              <p style={{ margin:"0 0 8px" }}><b>7. פרטיות ואבטחה.</b> הנתונים נשמרים בשרתים מאובטחים בבידוד מלא בין לקוחות. הספק לא יעשה שימוש בנתוני הלקוח אלא לצורך תפעול השירות ושיפורו.</p>
              <p style={{ margin:"0 0 8px" }}><b>8. שינויים.</b> הספק רשאי לעדכן את המערכת ואת תנאים אלה מעת לעת; שינוי מהותי בתנאים יחייב אישור מחודש.</p>
              <p style={{ margin:0 }}><b>9. דין.</b> על תנאים אלה יחול הדין הישראלי.</p>
            </div>
            <button onClick={acceptTerms} style={{ ...btnD, width:"100%", fontSize:15 }}>✓ קראתי ואני מאשר/ת את תנאי השימוש</button>
          </div>
        </div>
      )}

      {/* MODAL: New Foreman */}
      {newForemanM && (
        <div onClick={()=>setNewForemanM(false)} style={OVL}>
          <div onClick={e=>e.stopPropagation()} style={MOD}>
            <h3 style={{ margin:"0 0 6px", fontWeight:800, fontSize:17 }}>מנהל עבודה חדש</h3>
            <p style={{ margin:"0 0 14px", color:"#777", fontSize:13 }}>קוד מנהל עבודה משמש לכניסה למסך הניהול</p>
            {[
              { key:"name", label:"שם מלא", ph:"ישראל ישראלי", extra:{} },
              { key:"foremanCode", label:"קוד מנהל עבודה", ph:"7788", extra:{ letterSpacing:3, fontSize:17 } },
              { key:"role", label:"תפקיד (אופציונלי)", ph:"מנהל עבודה", extra:{} },
              { key:"code", label:"קוד עובד (אופציונלי — לדיווח שעות)", ph:"1234", extra:{ letterSpacing:3, fontSize:17 } },
              { key:"dailyRate", label:"שכר יומי ₪ (אופציונלי)", ph:"600", extra:{ type:"number" } },
            ].map(f=>(
              <label key={f.key} style={{ display:"block", marginBottom:11 }}>
                <LBL t={f.label}/>
                <input type={f.extra.type||"text"} value={newForeman[f.key]||""} placeholder={f.ph}
                  onChange={e=>setNewForeman({...newForeman,[f.key]:e.target.value})} style={{ ...inp, ...f.extra }}/>
              </label>
            ))}
            <div style={{ display:"flex", gap:10, marginTop:6 }}>
              <button onClick={addNewForeman} style={{ ...btnD, flex:1 }}>הוסף</button>
              <button onClick={()=>setNewForemanM(false)} style={{ ...btnG, flex:1 }}>ביטול</button>
            </div>
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
            ].map(f => (
              <label key={f.key} style={{ display:"block", marginBottom:12 }}>
                <LBL t={f.label}/>
                <input type={f.extra.type||"text"} value={editWorker[f.key]||""} placeholder={f.ph}
                  onChange={e=>setEditWorker({...editWorker,[f.key]:e.target.value})} style={{ ...inp, ...f.extra }}/>
              </label>
            ))}
            <PayTypeFields obj={editWorker} setObj={setEditWorker}/>
            {/* הרשאת מנהל עבודה */}
            <div style={{ background:"#FFFBF0", border:"1.5px solid #FFE082", borderRadius:12, padding:"12px 14px", marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:13, fontWeight:700 }}>🦺 מנהל עבודה</span>
                <button onClick={()=>setEditWorker({...editWorker, isForeman: !editWorker.isForeman, foremanProjects: editWorker.foremanProjects||[]})}
                  style={{ background: editWorker.isForeman?"#1A1A2E":"#F0F0EC", color: editWorker.isForeman?"#E8C547":"#888", border:"none", borderRadius:8, padding:"5px 14px", fontSize:12, cursor:"pointer", fontFamily:"Heebo,sans-serif", fontWeight:700 }}>
                  {editWorker.isForeman ? "✓ כן" : "לא"}
                </button>
              </div>
              {editWorker.isForeman && (
                <>
                  <label style={{ display:"block", marginTop:10 }}>
                    <span style={{ fontSize:12, fontWeight:600, display:"block", marginBottom:4, color:"#555" }}>קוד מנהל עבודה</span>
                    <input value={editWorker.foremanCode||""} placeholder="7788"
                      onChange={e=>setEditWorker({...editWorker, foremanCode: e.target.value})}
                      style={{ ...inp, letterSpacing:3, fontSize:16 }}/>
                  </label>
                  <p style={{ margin:"8px 0 0", fontSize:11, color:"#B26A00" }}>שיוך פרויקטים מתבצע בטאב "מנהלי עבודה"</p>
                </>
              )}
            </div>
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
            ].map(f=>(
              <label key={f.key} style={{ display:"block", marginBottom:11 }}>
                <LBL t={f.label}/>
                <input type={f.extra.type||"text"} value={newWorker[f.key]||""} placeholder={f.ph}
                  onChange={e=>setNewWorker({...newWorker,[f.key]:e.target.value})} style={{ ...inp, ...f.extra }}/>
              </label>
            ))}
            <PayTypeFields obj={newWorker} setObj={setNewWorker}/>
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
