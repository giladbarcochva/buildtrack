// BuildTrack — Service Worker: האפליקציה נפתחת ועובדת גם בלי קליטה
// מיקום בגיטהאב: public/sw.js
const VERSION = "bt-v1";
const SHELL = VERSION + "-shell";   // האפליקציה עצמה (index + קבצי JS/CSS)
const DATA = VERSION + "-data";     // הנתונים האחרונים שנטענו (פרויקטים, עובדים, דיווחים...)
const FONTS = VERSION + "-fonts";
const SUPA = "rkjcrhywhoixdkqlfnko.supabase.co";

// התקנה: שמירת הדף הראשי וכל קבצי האפליקציה שהוא טוען
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    try {
      const res = await fetch("/index.html", { cache: "no-store" });
      if (res.ok) {
        const html = await res.clone().text();
        await cache.put("/index.html", res);
        const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
        await Promise.all(assets.map((a) => cache.add(a).catch(() => {})));
      }
      await cache.add("/apple-touch-icon.png").catch(() => {});
    } catch (e) {}
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// רשת קודם עם מגבלת זמן: כשהקליטה חלשה — אחרי כמה שניות מציגים את מה שנשמר,
// והתשובה מהרשת (אם תגיע) מעדכנת את השמור ברקע. אם אין שמור — מחכים לרשת.
async function networkFirst(req, cacheName, key, ms, cacheable) {
  const cache = await caches.open(cacheName);
  const netP = fetch(req).then((res) => {
    if (res.ok && cacheable) cache.put(key, res.clone());
    return res;
  });
  netP.catch(() => {});
  try {
    return await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout")), ms);
      netP.then((r) => { clearTimeout(t); resolve(r); }, (e) => { clearTimeout(t); reject(e); });
    });
  } catch (e) {
    const hit = await cache.match(key);
    if (hit) return hit;
    return netP; // אין שום דבר שמור — ממשיכים לחכות לרשת (או שגיאה)
  }
}

// האם הבקשה נשלחה עם טוקן של משתמש מחובר (ולא מפתח אנונימי) — רק אז שומרים נתונים
function hasUserToken(req) {
  try {
    const auth = req.headers.get("authorization") || "";
    const payload = JSON.parse(atob((auth.split(" ")[1] || "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return !!payload.app_role;
  } catch (e) { return false; }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // שליחות (כניסה/יציאה בשעון וכו') — מטופלות בתור האופליין של האפליקציה
  const url = new URL(req.url);

  // 1. פתיחת האפליקציה (כל כתובת: /gne, /admin...) — רשת קודם, ובלי קליטה מהמכשיר
  if (req.mode === "navigate") {
    event.respondWith(
      networkFirst(req, SHELL, "/index.html", 4000, true).catch(() =>
        new Response("<p dir='rtl' style='font-family:sans-serif;padding:24px'>אין קליטה — יש לפתוח את האפליקציה פעם אחת עם אינטרנט</p>",
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }))
    );
    return;
  }

  // 2. קבצי האפליקציה (JS/CSS/תמונות מהאתר) — מהמכשיר קודם (שמם משתנה בכל עדכון)
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  // 3. פונטים של גוגל — מהמכשיר קודם
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith((async () => {
      const cache = await caches.open(FONTS);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  // 4. נתונים מ-Supabase — רשת קודם, ובלי קליטה הנתונים האחרונים שנשמרו
  if (url.hostname === SUPA && url.pathname.startsWith("/rest/v1/")) {
    const isOrgs = url.pathname.startsWith("/rest/v1/organizations");
    const cacheable = isOrgs || hasUserToken(req);
    event.respondWith(networkFirst(req, DATA, req.url, 7000, cacheable));
  }
});

// יציאה מהמערכת / מחיקת נתונים — ניקוי הנתונים השמורים
self.addEventListener("message", (event) => {
  if (event.data === "bt_clear_data") caches.delete(DATA);
});
