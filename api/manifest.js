// קובץ התקנה (manifest) אמיתי לכל קבלן — כתובת אמיתית ולא data:, כי באנדרואיד (Chrome/סמסונג)
// ההתקנה כאפליקציה עובדת רק עם manifest שיש לו כתובת באינטרנט.
// /api/manifest?s=<slug>&n=<שם>&i=<כתובת אייקון>   או   /api/manifest?admin=1
const SUPA_HOST = "rkjcrhywhoixdkqlfnko.supabase.co";

export default function handler(req, res) {
  const q = req.query || {};
  const origin = "https://" + (req.headers["x-forwarded-host"] || req.headers.host);
  const one = (v) => (Array.isArray(v) ? v[0] : v) || "";
  const fallbackIcons = [
    { src: origin + "/apple-touch-icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: origin + "/apple-touch-icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
  ];
  let m;
  if (one(q.admin)) {
    m = {
      name: "BuildTrack ניהול ראשי", short_name: "ניהול ראשי",
      description: "ניהול קבלנים, גיבויים ושיתוף",
      id: "/admin", start_url: origin + "/admin", scope: origin + "/admin",
      display: "standalone", background_color: "#1A1A2E", theme_color: "#1A1A2E",
      lang: "he", dir: "rtl", icons: fallbackIcons,
    };
  } else {
    const s = one(q.s).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
    if (!s) { res.statusCode = 302; res.setHeader("Location", "/manifest.json"); return res.end(); }
    const name = one(q.n).replace(/[<>"]/g, "").trim().slice(0, 45) || "BuildTrack";
    let icon = one(q.i);
    try {
      const u = new URL(icon);
      if (u.protocol !== "https:" || (u.hostname !== SUPA_HOST && u.origin !== origin)) icon = "";
    } catch (e) { icon = ""; }
    m = {
      name, short_name: name.length > 12 ? name.slice(0, 12) : name,
      description: "מערכת ניהול בנייה",
      id: "/" + s, start_url: origin + "/" + s, scope: origin + "/",
      display: "standalone", background_color: "#F5F5F0", theme_color: "#1A1A2E",
      lang: "he", dir: "rtl",
      icons: icon
        ? [{ src: icon, sizes: "512x512", type: "image/png", purpose: "any" },
           { src: icon, sizes: "192x192", type: "image/png", purpose: "any" }]
        : fallbackIcons,
    };
  }
  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.statusCode = 200;
  res.end(JSON.stringify(m));
}
