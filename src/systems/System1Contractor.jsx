import { useState } from "react";

const PRICES = {
  gypsumBoard:     45,   // ₪ per board 120×60
  studC48:         28,   // ₪ per linear meter
  trackU48:        24,   // ₪ per linear meter
  screws35:        0.12, // ₪ per screw
  plaster25kg:     65,   // ₪ per bag
  compound7kg:     42,   // ₪ per bucket (finish coat 1)
  finishComp5kg:   38,   // ₪ per bucket (finish coat 2)
  paint1L:         35,   // ₪ per liter
  cornerBead:      18,   // ₪ per piece
  meshTape50m:     32,   // ₪ per roll
  outlet1:         22,   // ₪ single outlet
  outlet2:         35,   // ₪ double outlet
  switchBox:       15,   // ₪ junction box
  nh5wire100m:     280,  // ₪ per 100m roll
  lightSwitch:     28,   // ₪ per switch
  pvcPipe20:       18,   // ₪ per meter
  waterValve:      85,   // ₪ per valve
  tile60x60:       38,   // ₪ per tile
  tileAdhesive25kg:62,   // ₪ per bag
  tileGrout5kg:    35,   // ₪ per bag
};

function calcMaterials({ length, width, height, doors, windows, hasTiles, hasPlumbing }) {
  const l = parseFloat(length) || 0;
  const w = parseFloat(width) || 0;
  const h = parseFloat(height) || 2.7;
  const d = parseInt(doors) || 0;
  const win = parseInt(windows) || 0;
  const floorArea = l * w;
  const perimeter = 2 * (l + w);

  const doorArea = d * (0.9 * 2.1);
  const windowArea = win * (1.2 * 1.2);
  const totalWallArea = perimeter * h;
  const netWallArea = Math.max(0, totalWallArea - doorArea - windowArea);

  // ── Gypsum ─────────────────────────────────────────────────────────────────
  const boardCount = Math.ceil(netWallArea / 0.72 * 1.1);
  const studMeters = Math.ceil(netWallArea * 2.5);
  const trackMeters = Math.ceil(perimeter * 2);
  const screwCount = Math.ceil(netWallArea * 20);
  const plasterBags = Math.ceil(netWallArea * 1.2 / 25);
  const compound1Buckets = Math.ceil(netWallArea * 0.5 / 7);
  const compound2Buckets = Math.ceil(netWallArea * 0.3 / 5);
  const paintLiters = Math.ceil(netWallArea * 0.2);
  const cornerBeads = (d + win) * 2 + 4;
  const meshRolls = Math.ceil(netWallArea * 0.15);

  const gypsumCost =
    boardCount * PRICES.gypsumBoard +
    studMeters * PRICES.studC48 +
    trackMeters * PRICES.trackU48 +
    screwCount * PRICES.screws35 +
    plasterBags * PRICES.plaster25kg +
    compound1Buckets * PRICES.compound7kg +
    compound2Buckets * PRICES.finishComp5kg +
    paintLiters * PRICES.paint1L +
    cornerBeads * PRICES.cornerBead +
    meshRolls * PRICES.meshTape50m;

  // ── Electrical ─────────────────────────────────────────────────────────────
  const singleOutlets = Math.max(2, Math.floor(floorArea / 4));
  const doubleOutlets = Math.max(1, Math.floor(floorArea / 6));
  const junctionBoxes = 1;
  const lightSwitches = Math.max(1, d);
  const wireMeters = Math.ceil(perimeter * 2 + h * (singleOutlets + doubleOutlets));
  const wireRolls = Math.ceil(wireMeters / 100);

  const elecCost =
    singleOutlets * PRICES.outlet1 +
    doubleOutlets * PRICES.outlet2 +
    junctionBoxes * PRICES.switchBox +
    lightSwitches * PRICES.lightSwitch +
    wireRolls * PRICES.nh5wire100m;

  // ── Tiles (optional) ───────────────────────────────────────────────────────
  let tiles = [], tilesCost = 0;
  if (hasTiles) {
    const tileCount = Math.ceil(floorArea / 0.36 * 1.1);
    const adhesiveBags = Math.ceil(floorArea * 5 / 25);
    const groutBags = Math.ceil(floorArea * 0.3 / 5);
    tiles = [
      { name: `ריצוף 60×60`, qty: tileCount, unit: "יח'", unitPrice: PRICES.tile60x60 },
      { name: "דבק פלייסטר 25 ק\"ג", qty: adhesiveBags, unit: "שקית", unitPrice: PRICES.tileAdhesive25kg },
      { name: "פוגה 5 ק\"ג", qty: groutBags, unit: "דלי", unitPrice: PRICES.tileGrout5kg },
    ];
    tilesCost = tileCount * PRICES.tile60x60 + adhesiveBags * PRICES.tileAdhesive25kg + groutBags * PRICES.tileGrout5kg;
  }

  // ── Plumbing (optional) ────────────────────────────────────────────────────
  let plumbing = [], plumbingCost = 0;
  if (hasPlumbing) {
    const pipeMeters = Math.ceil(perimeter * 0.5 + h);
    plumbing = [
      { name: "צנרת PVC 20mm", qty: pipeMeters, unit: "מ'", unitPrice: PRICES.pvcPipe20 },
      { name: "שסתום כדורי", qty: 1, unit: "יח'", unitPrice: PRICES.waterValve },
    ];
    plumbingCost = pipeMeters * PRICES.pvcPipe20 + PRICES.waterValve;
  }

  return {
    gypsum: [
      { name: "לוח גבס 120×60", qty: boardCount, unit: "יח'", unitPrice: PRICES.gypsumBoard },
      { name: "מסגרת C 48mm", qty: studMeters, unit: "מ'", unitPrice: PRICES.studC48 },
      { name: "פסולת U 48mm", qty: trackMeters, unit: "מ'", unitPrice: PRICES.trackU48 },
      { name: "בורגי TN 35mm", qty: screwCount, unit: "יח'", unitPrice: PRICES.screws35 },
      { name: "טיח 25 ק\"ג", qty: plasterBags, unit: "שקית", unitPrice: PRICES.plaster25kg },
      { name: "שפכטל עץ (שכבה 1) 7 ק\"ג", qty: compound1Buckets, unit: "דלי", unitPrice: PRICES.compound7kg },
      { name: "שפכטל סיום 5 ק\"ג", qty: compound2Buckets, unit: "דלי", unitPrice: PRICES.finishComp5kg },
      { name: "צבע פנים", qty: paintLiters, unit: "ליטר", unitPrice: PRICES.paint1L },
      { name: "פינות פח", qty: cornerBeads, unit: "יח'", unitPrice: PRICES.cornerBead },
      { name: "רשת חיזוק 50 מ'", qty: meshRolls, unit: "גליל", unitPrice: PRICES.meshTape50m },
    ],
    electrical: [
      { name: "שקע בודד", qty: singleOutlets, unit: "יח'", unitPrice: PRICES.outlet1 },
      { name: "שקע כפול", qty: doubleOutlets, unit: "יח'", unitPrice: PRICES.outlet2 },
      { name: "קופסת הסתעפות", qty: junctionBoxes, unit: "יח'", unitPrice: PRICES.switchBox },
      { name: "מתג תאורה", qty: lightSwitches, unit: "יח'", unitPrice: PRICES.lightSwitch },
      { name: "חוט NH-5 (100 מ')", qty: wireRolls, unit: "גליל", unitPrice: PRICES.nh5wire100m },
    ],
    tiles,
    plumbing,
    gypsumCost,
    elecCost,
    tilesCost,
    plumbingCost,
    totalCost: gypsumCost + elecCost + tilesCost + plumbingCost,
    netWallArea: netWallArea.toFixed(1),
    floorArea: floorArea.toFixed(1),
  };
}

async function parseDescriptionWithAI(text, apiKey) {
  if (!apiKey) return null;
  const prompt = `אתה מנתח תיאורי חדרי בנייה. נתח את התיאור הבא והחזר JSON בלבד (ללא הסברים, ללא markdown):

תיאור: "${text}"

החזר בדיוק את הפורמט הזה:
{"length": 4, "width": 5, "height": 2.7, "doors": 1, "windows": 1, "hasTiles": false, "hasPlumbing": false}

- length ו-width: מימדי החדר במטרים
- height: גובה בין 2.4-3.2 מטר (ברירת מחדל 2.7)
- doors: מספר דלתות
- windows: מספר חלונות
- hasTiles: האם יש ריצוף
- hasPlumbing: האם יש אינסטלציה (אמבטיה / שירותים / מטבח)`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const raw = data.content?.[0]?.text || "";
  const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0];
  return jsonStr ? JSON.parse(jsonStr) : null;
}

const T = {
  gypsum: { label: "גבס", emoji: "🧱", color: "#3b82f6", bg: "#eff6ff" },
  electrical: { label: "חשמל", emoji: "⚡", color: "#f59e0b", bg: "#fffbeb" },
  tiles: { label: "ריצוף", emoji: "🟫", color: "#8b5cf6", bg: "#f5f3ff" },
  plumbing: { label: "אינסטלציה", emoji: "🔧", color: "#10b981", bg: "#ecfdf5" },
};

function TradeSection({ trade, items, cost }) {
  const { label, emoji, color, bg } = T[trade];
  const [open, setOpen] = useState(true);
  if (!items.length) return null;
  return (
    <div style={{ border: `1px solid ${color}33`, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", background: bg, border: "none", padding: "12px 16px", cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span style={{ fontWeight: 700, color, fontSize: 16 }}>{emoji} {label}</span>
        <span style={{ fontWeight: 700, color }}>₪{cost.toLocaleString()} {open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", fontSize: 12, color: "#64748b" }}>
              <th style={{ padding: "6px 12px", textAlign: "right" }}>חומר</th>
              <th style={{ padding: "6px 8px", textAlign: "center" }}>כמות</th>
              <th style={{ padding: "6px 8px", textAlign: "center" }}>יחידה</th>
              <th style={{ padding: "6px 12px", textAlign: "left" }}>מחיר</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderTop: "1px solid #f1f5f9", fontSize: 14 }}>
                <td style={{ padding: "8px 12px" }}>{item.name}</td>
                <td style={{ padding: "8px", textAlign: "center", fontWeight: 600 }}>{item.qty}</td>
                <td style={{ padding: "8px", textAlign: "center", color: "#64748b" }}>{item.unit}</td>
                <td style={{ padding: "8px 12px", textAlign: "left", color: "#374151" }}>
                  ₪{(item.qty * item.unitPrice).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function System1Contractor({ apiKey }) {
  const [tab, setTab] = useState("form");
  const [desc, setDesc] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [form, setForm] = useState({
    length: "", width: "", height: "2.7", doors: "1", windows: "1",
    hasTiles: false, hasPlumbing: false,
  });
  const [result, setResult] = useState(null);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleParseAI = async () => {
    if (!desc.trim()) return;
    if (!apiKey) { setParseError("יש להגדיר מפתח Claude API בהגדרות"); return; }
    setParsing(true);
    setParseError("");
    try {
      const parsed = await parseDescriptionWithAI(desc, apiKey);
      if (parsed) {
        setForm({
          length: String(parsed.length || ""),
          width: String(parsed.width || ""),
          height: String(parsed.height || "2.7"),
          doors: String(parsed.doors || "0"),
          windows: String(parsed.windows || "0"),
          hasTiles: !!parsed.hasTiles,
          hasPlumbing: !!parsed.hasPlumbing,
        });
        setTab("form");
      } else {
        setParseError("לא הצלחתי לנתח את התיאור, נסה לכתוב בצורה ברורה יותר");
      }
    } catch {
      setParseError("שגיאה בחיבור ל-AI");
    }
    setParsing(false);
  };

  const handleCalc = () => {
    if (!form.length || !form.width) return;
    setResult(calcMaterials(form));
  };

  const s = {
    wrap: { maxWidth: 720, margin: "0 auto", padding: 16 },
    header: { marginBottom: 20 },
    title: { fontSize: 22, fontWeight: 800, color: "#1e40af", margin: 0 },
    sub: { fontSize: 14, color: "#64748b", marginTop: 4 },
    tabs: { display: "flex", gap: 8, marginBottom: 16 },
    tab: (active) => ({
      padding: "8px 20px", borderRadius: 8, border: "2px solid",
      borderColor: active ? "#3b82f6" : "#e2e8f0",
      background: active ? "#3b82f6" : "white",
      color: active ? "white" : "#64748b",
      fontWeight: 600, cursor: "pointer", fontSize: 14,
    }),
    card: { background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px #0001", marginBottom: 16 },
    label: { fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" },
    input: {
      width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8,
      border: "1px solid #e2e8f0", fontSize: 15, outline: "none",
    },
    row: { display: "flex", gap: 12, flexWrap: "wrap" },
    col: { flex: 1, minWidth: 120 },
    btn: {
      padding: "12px 24px", borderRadius: 10, border: "none", cursor: "pointer",
      fontWeight: 700, fontSize: 15, color: "white", background: "#3b82f6",
    },
    btnGreen: { background: "#10b981" },
    toggle: (active) => ({
      display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
      padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0",
      background: active ? "#eff6ff" : "white", color: active ? "#3b82f6" : "#64748b",
      fontWeight: 600, fontSize: 14, userSelect: "none",
    }),
    err: { color: "#ef4444", fontSize: 13, marginTop: 6 },
    summaryBox: {
      background: "linear-gradient(135deg, #1e40af, #3b82f6)",
      borderRadius: 12, padding: "16px 20px", color: "white", marginBottom: 16,
    },
  };

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <h2 style={s.title}>🏗️ מחשבון חומרים לקבלן</h2>
        <p style={s.sub}>הזן מידות חדר או תיאור חופשי — המערכת מחשבת רשימת חומרים מלאה לפי בעל מקצוע</p>
      </div>

      <div style={s.tabs}>
        <button style={s.tab(tab === "form")} onClick={() => setTab("form")}>📐 טופס מידות</button>
        <button style={s.tab(tab === "text")} onClick={() => setTab("text")}>✍️ תיאור חופשי</button>
      </div>

      {tab === "text" && (
        <div style={s.card}>
          <label style={s.label}>תאר את העבודה בעברית</label>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="לדוגמה: קיר גבס בחדר 4×5 מטר, גובה 2.7, דלת אחת, חלון אחד"
            rows={4}
            style={{ ...s.input, resize: "vertical" }}
          />
          {parseError && <p style={s.err}>{parseError}</p>}
          {!apiKey && (
            <p style={{ ...s.err, color: "#f59e0b" }}>
              💡 להפעלת ניתוח AI — הגדר מפתח Claude API בהגדרות
            </p>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              onClick={handleParseAI}
              disabled={parsing || !apiKey}
              style={{ ...s.btn, opacity: (!apiKey || parsing) ? 0.5 : 1 }}
            >
              {parsing ? "⏳ מנתח..." : "🤖 נתח עם AI"}
            </button>
          </div>
        </div>
      )}

      {tab === "form" && (
        <div style={s.card}>
          <div style={{ ...s.row, marginBottom: 14 }}>
            <div style={s.col}>
              <label style={s.label}>אורך חדר (מ')</label>
              <input style={s.input} type="number" value={form.length} onChange={e => setF("length", e.target.value)} placeholder="4" />
            </div>
            <div style={s.col}>
              <label style={s.label}>רוחב חדר (מ')</label>
              <input style={s.input} type="number" value={form.width} onChange={e => setF("width", e.target.value)} placeholder="5" />
            </div>
            <div style={s.col}>
              <label style={s.label}>גובה (מ')</label>
              <input style={s.input} type="number" value={form.height} onChange={e => setF("height", e.target.value)} placeholder="2.7" />
            </div>
          </div>
          <div style={{ ...s.row, marginBottom: 14 }}>
            <div style={s.col}>
              <label style={s.label}>מספר דלתות</label>
              <input style={s.input} type="number" value={form.doors} onChange={e => setF("doors", e.target.value)} placeholder="1" min="0" />
            </div>
            <div style={s.col}>
              <label style={s.label}>מספר חלונות</label>
              <input style={s.input} type="number" value={form.windows} onChange={e => setF("windows", e.target.value)} placeholder="1" min="0" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <label style={s.toggle(form.hasTiles)} onClick={() => setF("hasTiles", !form.hasTiles)}>
              <input type="checkbox" checked={form.hasTiles} onChange={() => {}} style={{ display: "none" }} />
              {form.hasTiles ? "✅" : "⬜"} כולל ריצוף
            </label>
            <label style={s.toggle(form.hasPlumbing)} onClick={() => setF("hasPlumbing", !form.hasPlumbing)}>
              <input type="checkbox" checked={form.hasPlumbing} onChange={() => {}} style={{ display: "none" }} />
              {form.hasPlumbing ? "✅" : "⬜"} כולל אינסטלציה
            </label>
          </div>
          <button onClick={handleCalc} disabled={!form.length || !form.width} style={{ ...s.btn, ...(!form.length || !form.width ? { opacity: 0.5 } : {}) }}>
            📋 חשב רשימת חומרים
          </button>
        </div>
      )}

      {result && (
        <div>
          <div style={s.summaryBox}>
            <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 8 }}>
              שטח קירות נטו: {result.netWallArea} מ"ר &nbsp;|&nbsp; שטח רצפה: {result.floorArea} מ"ר
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>סה"כ עלות חומרים משוערת</div>
                <div style={{ fontSize: 32, fontWeight: 800 }}>₪{result.totalCost.toLocaleString()}</div>
              </div>
              <div style={{ textAlign: "left", fontSize: 13, opacity: 0.85 }}>
                <div>🧱 גבס: ₪{result.gypsumCost.toLocaleString()}</div>
                <div>⚡ חשמל: ₪{result.elecCost.toLocaleString()}</div>
                {result.tilesCost > 0 && <div>🟫 ריצוף: ₪{result.tilesCost.toLocaleString()}</div>}
                {result.plumbingCost > 0 && <div>🔧 אינסטלציה: ₪{result.plumbingCost.toLocaleString()}</div>}
              </div>
            </div>
          </div>

          <TradeSection trade="gypsum" items={result.gypsum} cost={result.gypsumCost} />
          <TradeSection trade="electrical" items={result.electrical} cost={result.elecCost} />
          {result.tiles.length > 0 && <TradeSection trade="tiles" items={result.tiles} cost={result.tilesCost} />}
          {result.plumbing.length > 0 && <TradeSection trade="plumbing" items={result.plumbing} cost={result.plumbingCost} />}

          <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 8 }}>
            * מחירים ממוצעים — עלולים להשתנות לפי ספק ואזור. אינם כוללים עבודה.
          </p>
        </div>
      )}
    </div>
  );
}
