// BuildTrack — שליחת סיכום תוספות לעבודה במייל בשם הקבלן (כמו send-quote)
// מיקום: Supabase → Edge Functions → send-change-orders  (Verify JWT: כבוי)
//
// המייל יוצא מ-"<שם העסק>" <slug@buildtrackil.com>
// תשובות הלקוח (Reply-To) והעתק מוסתר (BCC) — למייל העסק שהקבלן הגדיר בהגדרות
// תוכן המייל והסיכום נבנים כאן מנתוני הפרויקטים השמורים. רק הודעה חופשית וה-PDF מגיעים מהדפדפן.
// Secrets (קיימים כבר, משותפים עם send-quote): RESEND_API_KEY, JWT_SECRET. אופציונלי: EMAIL_DOMAIN

import * as jose from "npm:jose@5";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JWT_SECRET = Deno.env.get("JWT_SECRET") || "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
const DOMAIN = Deno.env.get("EMAIL_DOMAIN") || "buildtrackil.com";
const DAILY_LIMIT = 40;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-token",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });

const H = { "apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY, "Content-Type": "application/json" };
const db = async (path: string) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H });
  if (!r.ok) throw new Error(`db ${r.status}`);
  return r.json();
};
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const nis = (n: number) => "₪" + Math.round(n).toLocaleString("he-IL");
const dmy = (s: unknown) => (s ? String(s).split("-").reverse().join(".") : "");
const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i;
const STATUS: Record<string, string> = { approved: "✅ אושרה", rejected: "✖ נדחתה" };

// סיכום לפרויקט — אותו חישוב כמו בדפדפן
function summarize(data: any) {
  const cos: any[] = data.changeOrders || [];
  const sum = (list: any[]) => list.reduce((t, c) => t + Number(c.amount || 0), 0);
  const appr = sum(cos.filter((c) => c.status === "approved"));
  const pend = sum(cos.filter((c) => c.status !== "approved" && c.status !== "rejected" && !c.unpriced));
  const unpriced = cos.filter((c) => c.unpriced && c.status !== "approved" && c.status !== "rejected").length;
  const base = Number(data.totalCost || 0);
  return { cos, appr, pend, unpriced, base, contract: base + appr };
}

function changeOrdersHtml(orgName: string, projects: any[], message: string, hasPdf: boolean) {
  const blocks = projects.map((p) => {
    const s = summarize(p.data);
    const rows = s.cos.map((c) => `<tr>
      <td style="padding:8px;border-bottom:1px solid #EEE;font-weight:700">${esc(c.desc || "תוספת")}
        ${c.note ? `<div style="color:#888;font-size:12px;font-weight:400">${esc(c.note)}</div>` : ""}</td>
      <td style="padding:8px;border-bottom:1px solid #EEE;color:#555;font-size:13px">${STATUS[c.status] || (c.unpriced ? "💭 ללא מחיר" : "⏳ ממתינה")}</td>
      <td style="padding:8px;border-bottom:1px solid #EEE;color:#777;font-size:13px">${dmy(c.date)}</td>
      <td style="padding:8px;border-bottom:1px solid #EEE;font-weight:700;text-align:left;white-space:nowrap">${c.unpriced && c.status !== "approved" ? "ייקבע" : nis(Number(c.amount || 0))}</td>
    </tr>`).join("");
    return `<div style="margin-bottom:22px">
      <div style="font-size:17px;font-weight:800;border-bottom:2px solid #E8C547;padding-bottom:5px;margin-bottom:8px">${esc(p.data.name || "")}</div>
      ${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:8px">${rows}</table>` : `<div style="color:#999;font-size:13px">אין תוספות</div>`}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#555">
        <tr><td style="padding:3px 0">עלות מקורית</td><td align="left">${nis(s.base)}</td></tr>
        <tr><td style="padding:3px 0">תוספות שאושרו</td><td align="left">${nis(s.appr)}</td></tr>
        <tr><td style="padding:3px 0">ממתין לאישור</td><td align="left">${nis(s.pend)}</td></tr>
        <tr><td style="padding:3px 0;font-weight:700;color:#1A1A2E">סכום העסקה</td><td align="left" style="font-weight:700;color:#1A1A2E">${nis(s.contract)}</td></tr>
      </table>
      ${s.unpriced ? `<div style="color:#3949AB;font-size:12px;margin-top:4px">* ${s.unpriced} תוספות ללא מחיר — ייקבעו בהמשך</div>` : ""}
    </div>`;
  }).join("");
  return `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:Arial,Helvetica,sans-serif;color:#1A1A2E">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:20px 10px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;padding:26px 24px" dir="rtl">
  <tr><td style="border-bottom:3px solid #E8C547;padding-bottom:14px;font-size:22px;font-weight:800">${esc(orgName)}</td></tr>
  <tr><td style="padding-top:18px">
    ${message ? `<div style="font-size:14px;color:#333;white-space:pre-wrap;margin-bottom:16px">${esc(message)}</div>` : `<div style="font-size:14px;color:#555;margin-bottom:16px">${hasPdf ? "מצורף סיכום התוספות לעבודה." : "סיכום התוספות לעבודה:"}</div>`}
    ${blocks}
    <div style="font-size:12px;color:#888;margin-top:8px">${hasPdf ? "הקובץ המלא מצורף כ-PDF. " : ""}לשאלות — השב/י למייל הזה.</div>
  </td></tr>
  <tr><td style="text-align:center;color:#AAA;font-size:11px;padding-top:22px">נשלח באמצעות BuildTrack</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  try {
    if (!RESEND_KEY) return json({ error: "חסר RESEND_API_KEY" }, 500);

    // זיהוי: טוקן האפליקציה (נחתם ע"י app-login) — רק מנהל של הקבלן
    const tok = req.headers.get("x-app-token") || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    let payload: any;
    try { payload = (await jose.jwtVerify(tok, new TextEncoder().encode(JWT_SECRET))).payload; }
    catch { return json({ error: "התחברות פגה — היכנס שוב" }, 401); }
    if (payload.app_role !== "manager" || !payload.org_id) return json({ error: "רק מנהל יכול לשלוח סיכום תוספות" }, 403);
    const orgId = String(payload.org_id);

    const b = await req.json();
    const to = String(b.to || "").trim();
    if (!EMAIL_RE.test(to)) return json({ error: "כתובת מייל לא תקינה" }, 400);
    // PDF אופציונלי: בלי קובץ הסיכום המלא כבר נמצא בגוף המייל
    const hasPdf = !!b.pdf && typeof b.pdf === "string";
    if (hasPdf) {
      const pdfOk = b.pdf.length < 11_000_000 && atob(b.pdf.slice(0, 8)).startsWith("%PDF");
      if (!pdfOk) return json({ error: "קובץ ה-PDF לא תקין" }, 400);
    }
    const message = String(b.message || "").slice(0, 2000);

    const [org] = await db(`organizations?id=eq.${encodeURIComponent(orgId)}&select=id,slug,name,active,settings`);
    if (!org || org.active === false) return json({ error: "הקבלן לא פעיל" }, 403);

    // מייל העסק נלקח מההגדרות בשרת, לא מהדפדפן
    const workers = await db(`workers?org_id=eq.${encodeURIComponent(orgId)}&select=data`);
    const cfg = workers.map((w: any) => w.data || {}).find((d: any) => d._isConfig) || {};
    const bizEmail = String(cfg._email || "").trim();
    if (!EMAIL_RE.test(bizEmail)) return json({ error: "הגדר קודם את מייל העסק בטאב הגדרות" }, 400);

    // מגבלה יומית משותפת עם שליחת הצעות המחיר
    const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
    const usage = org.settings?.emailUsage?.day === day ? org.settings.emailUsage : { day, count: 0 };
    if (usage.count >= DAILY_LIMIT) return json({ error: `הגעת למגבלה של ${DAILY_LIMIT} מיילים ביום` }, 429);

    // הפרויקטים: הפרויקט שנבחר, או כל הפרויקטים של הקבלן שיש להם תוספות
    const all = await db(`projects?org_id=eq.${encodeURIComponent(orgId)}&select=id,data`);
    const projects = all
      .filter((p: any) => p.data && !p.data._quote && (p.data.changeOrders || []).length > 0)
      .filter((p: any) => !b.projectDbid || String(p.id) === String(b.projectDbid));
    if (!projects.length) return json({ error: "אין תוספות לשלוח" }, 404);

    const name = String(org.name || org.slug).replace(/["<>]/g, "").trim();
    const subjectTarget = projects.length === 1 ? projects[0].data.name : name;
    const subject = `סיכום תוספות לעבודה — ${String(subjectTarget || "").slice(0, 80)}`;
    const pdfName = String(b.pdfName || "סיכום-תוספות.pdf").replace(/[\\/:*?"<>|]/g, "").slice(0, 80) || "סיכום-תוספות.pdf";

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${name} <${org.slug}@${DOMAIN}>`,
        to: [to],
        bcc: [bizEmail],
        reply_to: bizEmail,
        subject,
        html: changeOrdersHtml(name, projects, message, hasPdf),
        attachments: hasPdf ? [{ filename: pdfName, content: b.pdf }] : [],
      }),
    });
    const res = await r.text();
    if (!r.ok) return json({ error: "שליחת המייל נכשלה: " + res.slice(0, 200) }, 502);

    await fetch(`${SUPABASE_URL}/rest/v1/organizations?id=eq.${encodeURIComponent(orgId)}`, {
      method: "PATCH", headers: H,
      body: JSON.stringify({ settings: { ...(org.settings || {}), emailUsage: { day, count: usage.count + 1 } } }),
    });
    return json({ ok: true, to, left: DAILY_LIMIT - usage.count - 1 });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
