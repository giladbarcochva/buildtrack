// Supabase Edge Function: שליחת סיכום תוספות לעבודה במייל (עם PDF מצורף)
// Deploy: supabase functions deploy send-change-orders --no-verify-jwt
// Secrets: RESEND_API_KEY, MAIL_FROM (למשל "BuildTrack <noreply@buildtrackil.com>")
// הערה: ודא שהאימות (Authorization/apikey) תואם לפונקציית send-quote הקיימת.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nis = (n: number) => "₪" + Math.round(n).toLocaleString("he-IL");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return json({ ok: false, error: "חסר RESEND_API_KEY" }, 500);

  let b: any;
  try { b = await req.json(); } catch { return json({ ok: false, error: "בקשה לא תקינה" }, 400); }
  const to = String(b.to || "").trim();
  const copyTo = String(b.copyTo || "").trim();
  if (!EMAIL.test(to)) return json({ ok: false, error: "כתובת מייל לא תקינה" }, 400);
  if (!b.pdf || typeof b.pdf !== "string") return json({ ok: false, error: "חסר קובץ PDF" }, 400);

  const lines: Array<{ name: string; approved: number; pending: number; contract: number; count: number }> = Array.isArray(b.lines) ? b.lines : [];
  const summaryHtml = lines.length
    ? `<table style="border-collapse:collapse;width:100%;margin:12px 0">${lines.map((l) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #EEE;font-weight:700">${esc(l.name)}</td>
         <td style="padding:6px 8px;border-bottom:1px solid #EEE">תוספות שאושרו: ${nis(l.approved)}</td>
         <td style="padding:6px 8px;border-bottom:1px solid #EEE">ממתין: ${nis(l.pending)}</td>
         <td style="padding:6px 8px;border-bottom:1px solid #EEE;text-align:left">סכום העסקה: ${nis(l.contract)}</td></tr>`).join("")}</table>`
    : "";
  const html = `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;color:#1A1A2E;font-size:15px;line-height:1.6">
    ${b.message ? `<p style="white-space:pre-wrap">${esc(b.message)}</p>` : `<p>מצורף סיכום התוספות לעבודה.</p>`}
    ${summaryHtml}
    <p style="color:#888;font-size:12px">${esc(b.businessName || "")}</p></div>`;

  const payload: Record<string, unknown> = {
    from: Deno.env.get("MAIL_FROM") || "BuildTrack <noreply@buildtrackil.com>",
    to: [to],
    subject: String(b.subject || "סיכום תוספות לעבודה").slice(0, 200),
    html,
    attachments: [{ filename: String(b.pdfName || "change-orders.pdf"), content: b.pdf }],
  };
  if (copyTo && EMAIL.test(copyTo) && copyTo !== to) payload.cc = [copyTo];

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const res = await r.json().catch(() => ({}));
  if (!r.ok) return json({ ok: false, error: res?.message || `Resend ${r.status}` }, 502);
  return json({ ok: true, to });
});
