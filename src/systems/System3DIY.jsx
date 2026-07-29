import { useState } from "react";

const PROJECT_TYPES = [
  { id: "pergola", label: "פרגולה", emoji: "🏡", desc: "פרגולה לחצר / מרפסת" },
  { id: "fence",   label: "גדר",    emoji: "🚧", desc: "גדר פרופיל / רשת" },
  { id: "deck",    label: "דק",     emoji: "🪵", desc: "פלטפורמת עץ / קומפוזיט" },
  { id: "shed",    label: "מחסן",   emoji: "🏠", desc: "מחסן קל עצמאי" },
];

const MATERIALS = {
  pergola: [
    { id: "aluminum", label: "אלומיניום", emoji: "⚙️", priceMulti: 1.0 },
    { id: "wood",     label: "עץ טיק",   emoji: "🪵", priceMulti: 1.6 },
    { id: "steel",    label: "פלדה",     emoji: "🔩", priceMulti: 1.2 },
  ],
  fence: [
    { id: "aluminum", label: "אלומיניום", emoji: "⚙️", priceMulti: 1.0 },
    { id: "mesh",     label: "רשת פלדה", emoji: "🪤", priceMulti: 0.7 },
  ],
  deck: [
    { id: "composite", label: "קומפוזיט", emoji: "🟫", priceMulti: 1.0 },
    { id: "wood",      label: "עץ טיק",  emoji: "🪵", priceMulti: 1.3 },
  ],
  shed: [
    { id: "metal",  label: "מתכת",   emoji: "🏗️", priceMulti: 1.0 },
    { id: "wood",   label: "עץ",     emoji: "🪵", priceMulti: 0.8 },
  ],
};

const EXTRAS = {
  pergola: [
    { id: "roof_poly",  label: "גג פוליקרבונט",    price: 1200, emoji: "☀️" },
    { id: "roof_shade", label: "בד צל/רשת",        price:  600, emoji: "🌿" },
    { id: "lights",     label: "תאורת LED",         price:  450, emoji: "💡" },
    { id: "color_spec", label: "צבע מיוחד (שחור/אדום)", price: 150, emoji: "🎨" },
  ],
  fence: [
    { id: "gate",    label: "שער כניסה", price: 800, emoji: "🚪" },
    { id: "privacy", label: "פאנל פרטיות", price: 400, emoji: "🔏" },
  ],
  deck: [
    { id: "railing",  label: "מעקה בטיחות", price: 600,  emoji: "🛡️" },
    { id: "lighting", label: "תאורת רצפה",  price: 350,  emoji: "💡" },
  ],
  shed: [
    { id: "window", label: "חלון",    price: 300, emoji: "🪟" },
    { id: "shelf",  label: "מדפים",   price: 200, emoji: "📚" },
  ],
};

const LOCATIONS = [
  { id: "ground",   label: "קרקע רגילה",  emoji: "🌱", note: "דורש עיגון בטון" },
  { id: "concrete", label: "בטון קיים",   emoji: "🏗️", note: "עיגון עם עוגנים כימיים" },
  { id: "roof",     label: "גג / מרפסת", emoji: "🏢", note: "חיזוק קונסטרוקציה נדרש" },
];

// ── Calculation engines ───────────────────────────────────────────────────────

function calcPergola({ length: lStr, width: wStr, height: hStr, material, extras, location }) {
  const L = parseFloat(lStr) || 4;
  const W = parseFloat(wStr) || 6;
  const H = parseFloat(hStr) || 2.5;
  const multi = MATERIALS.pergola.find(m => m.id === material)?.priceMulti || 1;
  const basePrice = material === "aluminum" ? 95 : material === "wood" ? 152 : 114;

  const postMeters = 4 * (H + (location === "ground" ? 0.6 : 0.2));
  const perimeterBeams = 2 * (L + W) * 1.1;
  const crossCount = Math.floor((L - 0.5) / 0.6);
  const crossBeams = crossCount * W;
  const totalMainProfile = Math.ceil(postMeters + perimeterBeams);
  const totalCrossProfile = Math.ceil(crossBeams * 1.05);

  const anchorBolts = location === "concrete" ? 4 * 4 : 0;
  const concreteBags = location === "ground" ? 4 * 2 : 0;
  const postBases = 4;
  const cornerBrackets = 4 * 4;
  const endCaps = Math.ceil((L + W) * 2 * 2);
  const screwsM8 = Math.ceil((L + W) * 10 + postMeters * 4);
  const chemAnchors = location === "concrete" ? 16 : 0;

  const mainProfileCost = totalMainProfile * basePrice * multi;
  const crossProfileCost = totalCrossProfile * Math.round(basePrice * 0.78) * multi;
  const hardwareCost = cornerBrackets * 18 + endCaps * 5 + screwsM8 * 4 + (chemAnchors * 25) + (anchorBolts * 8) + (postBases * 45);
  const concreteCost = concreteBags * 35;
  const paintCost = Math.ceil(totalMainProfile * 0.05) * 35;

  const extrasCost = (extras || []).reduce((s, id) => {
    const ex = EXTRAS.pergola.find(e => e.id === id);
    return s + (ex?.price || 0);
  }, 0);

  const totalCost = mainProfileCost + crossProfileCost + hardwareCost + concreteCost + paintCost + extrasCost;
  const laborEstimate = Math.ceil(totalCost * 0.4 / 100) * 100;

  const items = [
    {
      category: "🏗️ מבנה ראשי",
      color: "#3b82f6", bg: "#eff6ff",
      rows: [
        { name: `פרופיל 50×50 ${material === "aluminum" ? "אלומיניום" : material === "wood" ? "עץ" : "פלדה"} (עמודים + קורות)`, qty: totalMainProfile, unit: "מ'", price: basePrice * multi },
        { name: `פרופיל 30×50 (קורות צלע)`, qty: totalCrossProfile, unit: "מ'", price: Math.round(basePrice * 0.78) * multi },
      ],
      total: mainProfileCost + crossProfileCost,
    },
    {
      category: "🔩 חומרה וחיבורים",
      color: "#f59e0b", bg: "#fffbeb",
      rows: [
        { name: "פינות זווית (L brackets)", qty: cornerBrackets, unit: "יח'", price: 18 },
        { name: "פקק קצה פרופיל", qty: endCaps, unit: "יח'", price: 5 },
        { name: "בסיס עמוד אנקר", qty: postBases, unit: "יח'", price: 45 },
        { name: "בורגי M8×60", qty: screwsM8, unit: "יח'", price: 4 },
        ...(chemAnchors > 0 ? [{ name: "עוגן כימי", qty: chemAnchors, unit: "יח'", price: 25 }] : []),
        ...(anchorBolts > 0 ? [{ name: "בורג עיגון בטון", qty: anchorBolts, unit: "יח'", price: 8 }] : []),
      ],
      total: hardwareCost,
    },
    ...(concreteBags > 0 ? [{
      category: "🏔️ עיגון קרקע",
      color: "#8b5cf6", bg: "#f5f3ff",
      rows: [{ name: "שקית בטון 40 ק\"ג", qty: concreteBags, unit: "שקית", price: 35 }],
      total: concreteCost,
    }] : []),
    {
      category: "🎨 גימור וצבע",
      color: "#10b981", bg: "#ecfdf5",
      rows: [{ name: `צבע / אנטי-קורוזיה`, qty: Math.ceil(totalMainProfile * 0.05), unit: "ליטר", price: 35 }],
      total: paintCost,
    },
    ...(extrasCost > 0 ? [{
      category: "✨ תוספות",
      color: "#ec4899", bg: "#fdf2f8",
      rows: (extras || []).map(id => {
        const ex = EXTRAS.pergola.find(e => e.id === id);
        return { name: ex?.label || id, qty: 1, unit: "סט", price: ex?.price || 0 };
      }),
      total: extrasCost,
    }] : []),
  ];

  return {
    items,
    materialCost: Math.round(totalCost),
    laborEstimate,
    grandTotal: Math.round(totalCost + laborEstimate),
    timeEstimate: "1-2 סופי שבוע",
    difficulty: "בינוני",
    tools: ["מקדחה + מטה", "מברג חשמלי", "סרגל מידות 5 מ'", "פלס מים", "מסור זווית (לחיתוך פרופיל)"],
    dimensions: { L, W, H, postMeters, totalMainProfile, totalCrossProfile, crossCount },
  };
}

function calcGeneric(type) {
  return {
    items: [{ category: "📦 חומרים", color: "#3b82f6", bg: "#eff6ff",
      rows: [{ name: "חישוב מלא יהיה זמין בקרוב", qty: 1, unit: "-", price: 0 }], total: 0 }],
    materialCost: 0, laborEstimate: 0, grandTotal: 0,
    timeEstimate: "—", difficulty: "—", tools: [], dimensions: {},
  };
}

function calcProject(config) {
  if (config.projectType === "pergola") return calcPergola(config);
  return calcGeneric(config.projectType);
}

// ── UI Components ─────────────────────────────────────────────────────────────

function StepHeader({ step, total, title }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{ height: 4, flex: 1, borderRadius: 2,
            background: i < step ? "#3b82f6" : i === step ? "#93c5fd" : "#e2e8f0" }} />
        ))}
      </div>
      <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>שלב {step + 1} מתוך {total}</p>
      <h3 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{title}</h3>
    </div>
  );
}

function Card({ children, selected, onClick, color = "#3b82f6" }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "right", padding: "14px 16px", borderRadius: 12, cursor: "pointer",
      border: `2px solid ${selected ? color : "#e2e8f0"}`,
      background: selected ? color + "10" : "white",
      transition: "all 0.15s",
    }}>
      {children}
    </button>
  );
}

function ResultSection({ section }) {
  const [open, setOpen] = useState(true);
  const lineTotal = section.rows.reduce((s, r) => s + r.qty * r.price, 0);
  return (
    <div style={{ border: `1px solid ${section.color}33`, borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", background: section.bg, border: "none", padding: "11px 14px",
          cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, color: section.color, fontSize: 15 }}>{section.category}</span>
        <span style={{ fontWeight: 700, color: section.color }}>₪{lineTotal.toLocaleString()} {open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {section.rows.map((row, i) => (
              <tr key={i} style={{ borderTop: "1px solid #f1f5f9", fontSize: 14 }}>
                <td style={{ padding: "8px 14px" }}>{row.name}</td>
                <td style={{ padding: "8px", textAlign: "center", fontWeight: 600, color: section.color }}>{row.qty}</td>
                <td style={{ padding: "8px", color: "#64748b" }}>{row.unit}</td>
                <td style={{ padding: "8px 14px", textAlign: "left" }}>₪{(row.qty * row.price).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;

export default function System3DIY() {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    projectType: "",
    length: "", width: "", height: "2.5",
    location: "",
    material: "",
    extras: [],
    budget: "",
  });
  const [result, setResult] = useState(null);

  const setC = (k, v) => setConfig(c => ({ ...c, [k]: v }));
  const toggleExtra = id => setConfig(c => ({
    ...c, extras: c.extras.includes(id) ? c.extras.filter(e => e !== id) : [...c.extras, id],
  }));

  const canNext = () => {
    if (step === 0) return !!config.projectType;
    if (step === 1) return !!config.length && !!config.width;
    if (step === 2) return !!config.location;
    if (step === 3) return !!config.material;
    return true;
  };

  const next = () => {
    if (step === TOTAL_STEPS - 2) {
      setResult(calcProject(config));
    }
    setStep(s => s + 1);
  };

  const back = () => {
    setStep(s => s - 1);
    setResult(null);
  };

  const reset = () => { setStep(0); setConfig({ projectType: "", length: "", width: "", height: "2.5", location: "", material: "", extras: [], budget: "" }); setResult(null); };

  const s = {
    wrap: { maxWidth: 600, margin: "0 auto", padding: 16 },
    card: { background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px #0001", marginBottom: 12 },
    input: { width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 10,
      border: "1px solid #e2e8f0", fontSize: 15, outline: "none" },
    row: { display: "flex", gap: 12 },
    navBtn: (enabled, secondary) => ({
      flex: 1, padding: "13px 0", borderRadius: 10, border: "none", cursor: enabled ? "pointer" : "default",
      fontWeight: 700, fontSize: 15, color: secondary ? "#3b82f6" : "white",
      background: secondary ? "#eff6ff" : (enabled ? "#3b82f6" : "#cbd5e1"),
    }),
    summaryBox: {
      background: "linear-gradient(135deg, #1e40af, #7c3aed)",
      borderRadius: 14, padding: "18px 20px", color: "white", marginBottom: 14,
    },
  };

  const materialList = MATERIALS[config.projectType] || [];
  const extraList = EXTRAS[config.projectType] || [];

  return (
    <div style={s.wrap}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1e40af", margin: 0 }}>🔨 אשף פרויקט DIY</h2>
        <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>ענה על כמה שאלות — נחשב לך רשימת קנייה מלאה</p>
      </div>

      {step < TOTAL_STEPS - 1 && (
        <div style={s.card}>
          {/* Step 0: Project type */}
          {step === 0 && (
            <>
              <StepHeader step={0} total={TOTAL_STEPS} title="מה אתה רוצה לבנות?" />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {PROJECT_TYPES.map(pt => (
                  <Card key={pt.id} selected={config.projectType === pt.id} onClick={() => setC("projectType", pt.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 28 }}>{pt.emoji}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{pt.label}</div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>{pt.desc}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Step 1: Dimensions */}
          {step === 1 && (
            <>
              <StepHeader step={1} total={TOTAL_STEPS} title="מה המידות?" />
              <div style={{ ...s.row, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>אורך (מ')</label>
                  <input style={s.input} type="number" value={config.length} onChange={e => setC("length", e.target.value)} placeholder="4" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>רוחב (מ')</label>
                  <input style={s.input} type="number" value={config.width} onChange={e => setC("width", e.target.value)} placeholder="6" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>גובה (מ')</label>
                  <input style={s.input} type="number" value={config.height} onChange={e => setC("height", e.target.value)} placeholder="2.5" />
                </div>
              </div>
              {config.length && config.width && (
                <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#166534" }}>
                  📐 שטח: {(parseFloat(config.length) * parseFloat(config.width)).toFixed(1)} מ"ר |
                  היקף: {(2 * (parseFloat(config.length) + parseFloat(config.width))).toFixed(1)} מ'
                </div>
              )}
            </>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <>
              <StepHeader step={2} total={TOTAL_STEPS} title="איפה זה נמצא?" />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {LOCATIONS.map(loc => (
                  <Card key={loc.id} selected={config.location === loc.id} onClick={() => setC("location", loc.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 28 }}>{loc.emoji}</span>
                      <div>
                        <div style={{ fontWeight: 700 }}>{loc.label}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{loc.note}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Step 3: Material */}
          {step === 3 && (
            <>
              <StepHeader step={3} total={TOTAL_STEPS} title="איזה חומר?" />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {materialList.map(mat => (
                  <Card key={mat.id} selected={config.material === mat.id} onClick={() => setC("material", mat.id)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 24 }}>{mat.emoji}</span>
                        <span style={{ fontWeight: 700 }}>{mat.label}</span>
                      </div>
                      <span style={{ fontSize: 12, color: mat.priceMulti > 1 ? "#ef4444" : "#10b981", fontWeight: 600 }}>
                        {mat.priceMulti === 1 ? "מחיר בסיס" : mat.priceMulti > 1 ? `×${mat.priceMulti} יותר יקר` : `×${mat.priceMulti} חסכוני`}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Step 4: Extras */}
          {step === 4 && (
            <>
              <StepHeader step={4} total={TOTAL_STEPS} title="תוספות (אופציונלי)" />
              {extraList.length === 0 ? (
                <p style={{ color: "#64748b" }}>אין תוספות זמינות לפרויקט זה</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {extraList.map(ex => (
                    <Card key={ex.id} selected={config.extras.includes(ex.id)} onClick={() => toggleExtra(ex.id)} color="#8b5cf6">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 22 }}>{ex.emoji}</span>
                          <span style={{ fontWeight: 600 }}>{ex.label}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: "#8b5cf6" }}>+₪{ex.price.toLocaleString()}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Step 5 — confirm (triggers calc) */}
          {step === 5 && !result && (
            <>
              <StepHeader step={5} total={TOTAL_STEPS} title="סיכום לפני חישוב" />
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14, fontSize: 14 }}>
                <div style={{ marginBottom: 6 }}>🏗️ <strong>סוג:</strong> {PROJECT_TYPES.find(p => p.id === config.projectType)?.label}</div>
                <div style={{ marginBottom: 6 }}>📐 <strong>מידות:</strong> {config.length}×{config.width} מ', גובה {config.height} מ'</div>
                <div style={{ marginBottom: 6 }}>📍 <strong>מיקום:</strong> {LOCATIONS.find(l => l.id === config.location)?.label}</div>
                <div style={{ marginBottom: 6 }}>🔧 <strong>חומר:</strong> {materialList.find(m => m.id === config.material)?.label}</div>
                {config.extras.length > 0 && (
                  <div>✨ <strong>תוספות:</strong> {config.extras.map(id => extraList.find(e => e.id === id)?.label).join(", ")}</div>
                )}
              </div>
            </>
          )}

          <div style={{ ...s.row, marginTop: 16 }}>
            {step > 0 && <button onClick={back} style={s.navBtn(true, true)}>← חזור</button>}
            <button onClick={next} disabled={!canNext()} style={s.navBtn(canNext(), false)}>
              {step === TOTAL_STEPS - 2 ? "🧮 חשב רשימת קנייה" : "הבא →"}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && step === TOTAL_STEPS - 1 && (
        <div>
          <div style={s.summaryBox}>
            <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 8 }}>
              {config.projectType === "pergola" && result.dimensions &&
                `פרגולה ${result.dimensions.L}×${result.dimensions.W} מ' | ${result.dimensions.totalMainProfile} מ' פרופיל ראשי | ${result.dimensions.crossCount} קורות צלע`}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>עלות חומרים</div>
                <div style={{ fontSize: 30, fontWeight: 800 }}>₪{result.materialCost.toLocaleString()}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>+ שכ"ע משוער: ₪{result.laborEstimate.toLocaleString()}</div>
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 13, opacity: 0.85 }}>סה"כ עם עבודה</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>₪{result.grandTotal.toLocaleString()}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>⏱️ {result.timeEstimate} | רמת קושי: {result.difficulty}</div>
              </div>
            </div>
          </div>

          {result.items.map((sec, i) => <ResultSection key={i} section={sec} />)}

          {result.tools.length > 0 && (
            <div style={{ background: "#fff7ed", borderRadius: 12, padding: 14, marginBottom: 10, border: "1px solid #fed7aa" }}>
              <div style={{ fontWeight: 700, color: "#c2410c", marginBottom: 8 }}>🛠️ כלים שתצטרך</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.tools.map((t, i) => (
                  <span key={i} style={{ background: "white", border: "1px solid #fed7aa", borderRadius: 6,
                    padding: "4px 10px", fontSize: 13, color: "#c2410c" }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 14, marginBottom: 10, border: "1px solid #bbf7d0" }}>
            <div style={{ fontWeight: 700, color: "#166534", marginBottom: 8 }}>🎥 הדרכה ומשאבים</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {["📹 סרטון יוטיוב: פרגולה אלומיניום שלב אחר שלב",
                "📄 מדריך PDF מפורט להתקנה",
                "💬 פורום בעלי בתים — שאל שאלות"].map((link, i) => (
                <div key={i} style={{ fontSize: 14, color: "#166534", cursor: "pointer",
                  textDecoration: "underline" }}>{link}</div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
            * מחירים ממוצעים — עלולים להשתנות. אינם כוללים שכ"ע ואינם מהווים הצעת מחיר רשמית.
          </p>

          <button onClick={reset}
            style={{ width: "100%", padding: "13px", borderRadius: 10, border: "2px solid #e2e8f0",
              background: "white", color: "#374151", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 4 }}>
            🔄 פרויקט חדש
          </button>
        </div>
      )}
    </div>
  );
}
