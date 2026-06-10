import { useState } from "react";

const COLORS = {
  bg: "#0F1117",
  surface: "#1A1D27",
  card: "#22263A",
  accent: "#4FFFB0",
  accentDim: "#1A4A35",
  orange: "#FF6B35",
  orangeDim: "#3A2215",
  text: "#E8ECF4",
  muted: "#7A8099",
  border: "#2E3350",
};

const FOOD_CATEGORIES = [
  {
    label: "🥩 חלבונים",
    items: [
      { name: "חזה עוף (100g)", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
      { name: "שוק עוף (100g)", calories: 209, protein: 26, carbs: 0, fat: 11 },
      { name: "סטייק בקר רזה (100g)", calories: 158, protein: 26, carbs: 0, fat: 5.5 },
      { name: "טחון בקר 90% (100g)", calories: 176, protein: 20, carbs: 0, fat: 10 },
      { name: "סלמון (100g)", calories: 208, protein: 20, carbs: 0, fat: 13 },
      { name: "טונה בקופסה (100g)", calories: 116, protein: 26, carbs: 0, fat: 1 },
      { name: "דג דניס (100g)", calories: 128, protein: 24, carbs: 0, fat: 3.5 },
      { name: "ביצה שלמה", calories: 78, protein: 6, carbs: 0.6, fat: 5 },
      { name: "חלבון ביצה", calories: 17, protein: 3.6, carbs: 0.2, fat: 0 },
      { name: "קוטג׳ 5% (100g)", calories: 88, protein: 11, carbs: 3.5, fat: 3.5 },
      { name: "גבינה לבנה 5% (100g)", calories: 95, protein: 10, carbs: 4, fat: 4 },
      { name: "טופו (100g)", calories: 76, protein: 8, carbs: 1.9, fat: 4.2 },
      { name: "עדשים מבושלות (100g)", calories: 116, protein: 9, carbs: 20, fat: 0.4 },
      { name: "חומוס מבושל (100g)", calories: 164, protein: 9, carbs: 27, fat: 2.6 },
      { name: "שייק חלבון (מנה)", calories: 120, protein: 25, carbs: 3, fat: 1.5 },
    ],
  },
  {
    label: "🍚 פחמימות",
    items: [
      { name: "אורז לבן מבושל (100g)", calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
      { name: "אורז מלא מבושל (100g)", calories: 112, protein: 2.6, carbs: 24, fat: 0.9 },
      { name: "פסטה מבושלת (100g)", calories: 131, protein: 5, carbs: 25, fat: 1.1 },
      { name: "קינואה מבושלת (100g)", calories: 120, protein: 4.4, carbs: 21, fat: 1.9 },
      { name: "שיבולת שועל (100g)", calories: 389, protein: 17, carbs: 66, fat: 7 },
      { name: "לחם לבן (פרוסה)", calories: 75, protein: 2.6, carbs: 14, fat: 1 },
      { name: "לחם מלא (פרוסה)", calories: 80, protein: 4, carbs: 15, fat: 1 },
      { name: "פיתה (יחידה)", calories: 165, protein: 5.5, carbs: 33, fat: 1.2 },
      { name: "תפוח אדמה (100g)", calories: 77, protein: 2, carbs: 17, fat: 0.1 },
      { name: "בטטה (100g)", calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
      { name: "תירס (100g)", calories: 86, protein: 3.2, carbs: 19, fat: 1.2 },
      { name: "גרנולה (30g)", calories: 140, protein: 3, carbs: 20, fat: 5 },
    ],
  },
  {
    label: "🥑 שומנים",
    items: [
      { name: "אבוקדו (חצי)", calories: 120, protein: 1.5, carbs: 6, fat: 11 },
      { name: "שמן זית (כף)", calories: 119, protein: 0, carbs: 0, fat: 13.5 },
      { name: "חמאת בוטנים (כף)", calories: 94, protein: 4, carbs: 3, fat: 8 },
      { name: "שקדים (30g)", calories: 174, protein: 6, carbs: 6, fat: 15 },
      { name: "אגוזי מלך (30g)", calories: 196, protein: 4.6, carbs: 4, fat: 19.6 },
      { name: "גרעיני חמניות (30g)", calories: 175, protein: 5.8, carbs: 5.8, fat: 15 },
      { name: "טחינה גולמית (כף)", calories: 89, protein: 2.6, carbs: 3.2, fat: 8 },
      { name: "גבינה צהובה (30g)", calories: 113, protein: 7, carbs: 0.4, fat: 9 },
    ],
  },
  {
    label: "🥛 חלב ומוצריו",
    items: [
      { name: "חלב 3% (כוס 240מל)", calories: 149, protein: 8, carbs: 12, fat: 8 },
      { name: "חלב 1% (כוס 240מל)", calories: 102, protein: 8, carbs: 12, fat: 2.4 },
      { name: "יוגורט יווני 0% (100g)", calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
      { name: "יוגורט יווני 5% (100g)", calories: 97, protein: 9, carbs: 3.6, fat: 5 },
      { name: "שמנת חמוצה 15% (כף)", calories: 29, protein: 0.5, carbs: 0.6, fat: 2.8 },
      { name: "גבינת ריקוטה (100g)", calories: 174, protein: 11, carbs: 3, fat: 13 },
    ],
  },
  {
    label: "🍎 פירות",
    items: [
      { name: "בננה", calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
      { name: "תפוח", calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
      { name: "תפוז", calories: 47, protein: 0.9, carbs: 12, fat: 0.1 },
      { name: "תות שדה (100g)", calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
      { name: "אוכמניות (100g)", calories: 57, protein: 0.7, carbs: 14, fat: 0.3 },
      { name: "אבטיח (100g)", calories: 30, protein: 0.6, carbs: 7.6, fat: 0.2 },
      { name: "ענבים (100g)", calories: 67, protein: 0.6, carbs: 17, fat: 0.4 },
      { name: "מנגו (100g)", calories: 60, protein: 0.8, carbs: 15, fat: 0.4 },
      { name: "אגס", calories: 57, protein: 0.4, carbs: 15, fat: 0.1 },
    ],
  },
  {
    label: "🥦 ירקות",
    items: [
      { name: "ברוקולי (100g)", calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
      { name: "תרד (100g)", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
      { name: "עגבנייה", calories: 22, protein: 1.1, carbs: 4.8, fat: 0.2 },
      { name: "מלפפון", calories: 16, protein: 0.7, carbs: 3.6, fat: 0.1 },
      { name: "גזר (100g)", calories: 41, protein: 0.9, carbs: 10, fat: 0.2 },
      { name: "פלפל אדום (100g)", calories: 31, protein: 1, carbs: 6, fat: 0.3 },
      { name: "כרובית (100g)", calories: 25, protein: 1.9, carbs: 5, fat: 0.3 },
      { name: "חסה (100g)", calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
      { name: "בצל (100g)", calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
    ],
  },
  {
    label: "🫓 פיתת כוסמין",
    items: [
      { name: "פיתה כוסמין אנג׳ל (55g)", calories: 119, protein: 5.3, carbs: 20.9, fat: 0.9 },
      { name: "פיתה כוסמין מיני טאוברד (47g)", calories: 90, protein: 4.9, carbs: 14.1, fat: 0.4 },
    ],
  },
  {
    label: "🌾 מעדני חלבון תנעמי",
    items: [
      { name: "פיתה כוסמין תנעמי (70g)", calories: 144, protein: 7.5, carbs: 23, fat: 0.9 },
    ],
  },
  {
    label: "🥛 משקאות חלבון PRO יטבתה",
    items: [
      { name: "PRO יטבתה שוקו ללא סוכר (350מל)", calories: 140, protein: 25, carbs: 7.4, fat: 0 },
      { name: "PRO יטבתה קפה ללא סוכר (350מל)", calories: 140, protein: 25, carbs: 7, fat: 0 },
      { name: "PRO יטבתה וניל (350מל)", calories: 224, protein: 25, carbs: 18.6, fat: 5.3 },
      { name: "PRO יטבתה קפה (350מל)", calories: 217, protein: 25, carbs: 17.5, fat: 5.3 },
      { name: "PRO יטבתה ארוחת בוקר בננה (350מל)", calories: 252, protein: 20, carbs: 27.3, fat: 6 },
    ],
  },
  {
    label: "🍫 Protein TODAY חטיפים",
    items: [
      { name: "Protein TODAY קרמל מלוח (63g)", calories: 200, protein: 22, carbs: 16, fat: 7 },
      { name: "Protein TODAY קרם עוגיות (63g)", calories: 200, protein: 22, carbs: 16, fat: 7 },
      { name: "Protein TODAY פאי קינמון (63g)", calories: 200, protein: 22, carbs: 16, fat: 6.5 },
      { name: "Protein TODAY שוקולד צ'יפס (51g)", calories: 190, protein: 18, carbs: 14, fat: 7 },
      { name: "Protein TODAY בננה שוקולד צ'יפס (51g)", calories: 190, protein: 18, carbs: 14, fat: 7 },
    ],
  },
  {
    label: "🍫 חטיפים ומתוקים",
    items: [
      { name: "שוקולד מריר 70% (30g)", calories: 170, protein: 2.5, carbs: 13, fat: 12 },
      { name: "אורז פריך (יחידה)", calories: 35, protein: 0.7, carbs: 7.3, fat: 0.3 },
      { name: "דבש (כף)", calories: 64, protein: 0.1, carbs: 17, fat: 0 },
      { name: "ריבה (כף)", calories: 56, protein: 0.1, carbs: 14, fat: 0 },
    ],
  },
  {
    label: "☕ שתייה",
    items: [
      { name: "קפה שחור", calories: 2, protein: 0.3, carbs: 0, fat: 0 },
      { name: "לאטה (כוס)", calories: 120, protein: 6, carbs: 10, fat: 5 },
      { name: "מיץ תפוזים (כוס)", calories: 110, protein: 1.7, carbs: 26, fat: 0.5 },
      { name: "חלב שקדים לא ממותק (כוס)", calories: 30, protein: 1, carbs: 1, fat: 2.5 },
    ],
  },
];

const FOOD_PRESETS = FOOD_CATEGORIES.flatMap(c => c.items);

const WORKOUT_PRESETS = [
  { name: "ריצה", unit: 'ק"מ', icon: "🏃" },
  { name: "כוח עליון", unit: "סטים", icon: "💪" },
  { name: "כוח תחתון", unit: "סטים", icon: "🦵" },
  { name: "כוח גב", unit: "סטים", icon: "🔙" },
  { name: "אופניים", unit: 'ק"מ', icon: "🚴" },
  { name: "שחייה", unit: "בריכות", icon: "🏊" },
  { name: "פילאטיס", unit: "דק'", icon: "🧘" },
  { name: "HIIT", unit: "דק'", icon: "⚡" },
];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function calcGoals(profile) {
  const { age, weight, height, gender, activity, goal } = profile;
  let bmr = gender === "male"
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;

  const activityMap = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  const tdee = bmr * (activityMap[activity] || 1.55);

  let calories = Math.round(goal === "lose" ? tdee - 500 : goal === "gain" ? tdee + 300 : tdee);
  const protein = Math.round(goal === "gain" ? weight * 2.2 : weight * 1.8);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  return { calories, protein, carbs: Math.max(carbs, 50), fat };
}

const STEPS = [
  { key: "gender", title: "מה המין שלך?", type: "choice", options: [{ v: "male", label: "זכר 👨" }, { v: "female", label: "נקבה 👩" }] },
  { key: "age", title: "מה הגיל שלך?", type: "number", placeholder: "לדוגמה: 28", unit: "שנים", min: 10, max: 100 },
  { key: "weight", title: "מה המשקל שלך?", type: "number", placeholder: "לדוגמה: 75", unit: "ק״ג", min: 30, max: 300 },
  { key: "height", title: "מה הגובה שלך?", type: "number", placeholder: "לדוגמה: 175", unit: "ס״מ", min: 100, max: 250 },
  {
    key: "activity", title: "כמה פעיל אתה?", type: "choice", options: [
      { v: "sedentary", label: "לא פעיל 🛋️", sub: "עבודה ישיבה, ללא ספורט" },
      { v: "light", label: "קצת פעיל 🚶", sub: "1-2 אימונים בשבוע" },
      { v: "moderate", label: "בינוני 🏃", sub: "3-4 אימונים בשבוע" },
      { v: "active", label: "פעיל 💪", sub: "5-6 אימונים בשבוע" },
      { v: "very_active", label: "מאוד פעיל 🔥", sub: "ספורטאי / עבודה פיזית" },
    ]
  },
  {
    key: "goal", title: "מה המטרה שלך?", type: "choice", options: [
      { v: "lose", label: "ירידה במשקל 📉" },
      { v: "maintain", label: "שמירה על משקל ⚖️" },
      { v: "gain", label: "עלייה במסה 📈" },
    ]
  },
];

function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({});
  const [inputVal, setInputVal] = useState("");
  const [error, setError] = useState("");

  const current = STEPS[step];
  const progress = ((step) / STEPS.length) * 100;

  function handleChoice(v) {
    const next = { ...profile, [current.key]: v };
    setProfile(next);
    if (step < STEPS.length - 1) { setStep(step + 1); setInputVal(""); setError(""); }
    else { onDone(calcGoals(next), next); }
  }

  function handleNumber() {
    const val = parseFloat(inputVal);
    if (!inputVal || isNaN(val) || val < current.min || val > current.max) {
      setError(`נא להזין מספר בין ${current.min} ל-${current.max}`);
      return;
    }
    const next = { ...profile, [current.key]: val };
    setProfile(next);
    if (step < STEPS.length - 1) { setStep(step + 1); setInputVal(""); setError(""); }
    else { onDone(calcGoals(next), next); }
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", direction: "rtl", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>💪</div>
        <h1 style={{ margin: "8px 0 0", color: COLORS.accent, fontSize: 26, fontWeight: 800 }}>FitTrack</h1>
        <p style={{ color: COLORS.muted, fontSize: 13, margin: "4px 0 0" }}>נחשב את היעדים האישיים שלך</p>
      </div>

      <div style={{ width: "100%", maxWidth: 420, marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: COLORS.muted, fontSize: 12 }}>שלב {step + 1} מתוך {STEPS.length}</span>
          <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 600 }}>{Math.round(progress)}%</span>
        </div>
        <div style={{ background: COLORS.border, borderRadius: 8, height: 6 }}>
          <div style={{ width: `${progress}%`, height: "100%", background: COLORS.accent, borderRadius: 8, transition: "width 0.4s ease" }} />
        </div>
      </div>

      <div style={{ background: COLORS.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 420, border: `1px solid ${COLORS.border}` }}>
        <h2 style={{ margin: "0 0 22px", fontSize: 20, fontWeight: 700, color: COLORS.text, textAlign: "center" }}>{current.title}</h2>

        {current.type === "choice" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {current.options.map(opt => (
              <button key={opt.v} onClick={() => handleChoice(opt.v)}
                style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "14px 18px", cursor: "pointer", color: COLORS.text, textAlign: "right", transition: "border-color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{opt.label}</div>
                {opt.sub && <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>{opt.sub}</div>}
              </button>
            ))}
          </div>
        )}

        {current.type === "number" && (
          <div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <input
                type="number"
                value={inputVal}
                onChange={e => { setInputVal(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleNumber()}
                placeholder={current.placeholder}
                style={{ flex: 1, background: COLORS.surface, border: `1px solid ${error ? COLORS.orange : COLORS.border}`, borderRadius: 10, color: COLORS.text, padding: "14px 16px", fontSize: 18, outline: "none", textAlign: "center" }}
                autoFocus
              />
              <span style={{ color: COLORS.muted, fontSize: 14, whiteSpace: "nowrap" }}>{current.unit}</span>
            </div>
            {error && <p style={{ color: COLORS.orange, fontSize: 12, margin: "0 0 10px", textAlign: "center" }}>{error}</p>}
            <button onClick={handleNumber}
              style={{ width: "100%", background: COLORS.accent, color: "#0F1117", border: "none", borderRadius: 12, padding: "14px", fontWeight: 700, fontSize: 16, cursor: "pointer", marginTop: 4 }}>
              המשך ←
            </button>
          </div>
        )}
      </div>

      {step > 0 && (
        <button onClick={() => { setStep(step - 1); setInputVal(""); setError(""); }}
          style={{ marginTop: 16, background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 13 }}>
          ← חזור
        </button>
      )}
    </div>
  );
}

function GoalsSummary({ goals, profile, onStart }) {
  const goalLabel = { lose: "ירידה במשקל", maintain: "שמירה על משקל", gain: "עלייה במסה" };
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", direction: "rtl", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>🎯</div>
      <h2 style={{ color: COLORS.accent, fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>היעדים שלך מוכנים!</h2>
      <p style={{ color: COLORS.muted, fontSize: 13, margin: "0 0 28px" }}>מטרה: {goalLabel[profile.goal]}</p>

      <div style={{ background: COLORS.card, borderRadius: 20, padding: 24, width: "100%", maxWidth: 420, border: `1px solid ${COLORS.border}`, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "קלוריות", val: goals.calories, unit: "קל׳", color: COLORS.accent },
            { label: "חלבון", val: goals.protein, unit: "g", color: "#6BFFB0" },
            { label: "פחמימות", val: goals.carbs, unit: "g", color: "#6B8CFF" },
            { label: "שומן", val: goals.fat, unit: "g", color: COLORS.orange },
          ].map(({ label, val, unit, color }) => (
            <div key={label} style={{ background: COLORS.surface, borderRadius: 12, padding: "16px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{label} / יום ({unit})</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, padding: "12px 14px", background: COLORS.surface, borderRadius: 10, fontSize: 12, color: COLORS.muted, lineHeight: 1.7 }}>
          <div>⚖️ משקל: <span style={{ color: COLORS.text }}>{profile.weight} ק״ג</span> | גובה: <span style={{ color: COLORS.text }}>{profile.height} ס״מ</span></div>
          <div>🎂 גיל: <span style={{ color: COLORS.text }}>{profile.age}</span> | BMR מחושב לפי Mifflin-St Jeor</div>
        </div>
      </div>

      <button onClick={onStart}
        style={{ width: "100%", maxWidth: 420, background: COLORS.accent, color: "#0F1117", border: "none", borderRadius: 14, padding: "16px", fontWeight: 800, fontSize: 17, cursor: "pointer" }}>
        יאללה, מתחילים! 🚀
      </button>
    </div>
  );
}

function MacroBar({ label, value, max, color }) {
  const pct = Math.min((value / (max || 1)) * 100, 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: COLORS.muted, fontSize: 13 }}>{label}</span>
        <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 600 }}>{Math.round(value)} / {max}</span>
      </div>
      <div style={{ background: COLORS.border, borderRadius: 6, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 6, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function CalorieRing({ calories, goal }) {
  const pct = Math.min(calories / (goal || 1), 1);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto 12px" }}>
      <svg width={140} height={140} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={70} cy={70} r={r} fill="none" stroke={COLORS.border} strokeWidth={10} />
        <circle cx={70} cy={70} r={r} fill="none"
          stroke={calories > goal ? COLORS.orange : COLORS.accent}
          strokeWidth={10} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: calories > goal ? COLORS.orange : COLORS.accent, fontSize: 26, fontWeight: 700 }}>{Math.round(calories)}</span>
        <span style={{ color: COLORS.muted, fontSize: 12 }}>מתוך {goal}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("onboarding");
  const [goals, setGoals] = useState({ calories: 2200, protein: 150, carbs: 250, fat: 70 });
  const [profile, setProfile] = useState({});

  const [tab, setTab] = useState("today");
  const [showGoals, setShowGoals] = useState(false);

  const todayKey = getTodayKey();
  const [allData, setAllData] = useState({ [todayKey]: { meals: [], workouts: [] } });

  const todayData = allData[todayKey] || { meals: [], workouts: [] };

  function updateToday(fn) {
    setAllData(prev => {
      const td = prev[todayKey] || { meals: [], workouts: [] };
      return { ...prev, [todayKey]: fn(td) };
    });
  }

  const totalNutrition = todayData.meals.reduce(
    (acc, meal) => ({ calories: acc.calories + (meal.calories||0), protein: acc.protein + (meal.protein||0), carbs: acc.carbs + (meal.carbs||0), fat: acc.fat + (meal.fat||0) }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const [foodSearch, setFoodSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [foodName, setFoodName] = useState("");
  const [foodCal, setFoodCal] = useState("");
  const [foodProtein, setFoodProtein] = useState("");
  const [foodCarbs, setFoodCarbs] = useState("");
  const [foodFat, setFoodFat] = useState("");
  const [showFoodForm, setShowFoodForm] = useState(false);

  function addFood(preset) {
    updateToday(td => ({ ...td, meals: [...td.meals, { ...preset, id: Date.now() + Math.random() }] }));
  }
  function addCustomFood() {
    if (!foodName || !foodCal) return;
    addFood({ name: foodName, calories: parseFloat(foodCal)||0, protein: parseFloat(foodProtein)||0, carbs: parseFloat(foodCarbs)||0, fat: parseFloat(foodFat)||0 });
    setFoodName(""); setFoodCal(""); setFoodProtein(""); setFoodCarbs(""); setFoodFat(""); setShowFoodForm(false);
  }
  function removeFood(id) { updateToday(td => ({ ...td, meals: td.meals.filter(m => m.id !== id) })); }

  const [workoutName, setWorkoutName] = useState("");
  const [workoutValue, setWorkoutValue] = useState("");
  const [workoutUnit, setWorkoutUnit] = useState("סטים");
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);

  function addWorkout(preset) {
    updateToday(td => ({ ...td, workouts: [...td.workouts, { ...preset, value: 1, notes: "", id: Date.now() + Math.random() }] }));
  }
  function addCustomWorkout() {
    if (!workoutName) return;
    updateToday(td => ({ ...td, workouts: [...td.workouts, { name: workoutName, icon: "🏋️", unit: workoutUnit, value: parseFloat(workoutValue)||0, notes: workoutNotes, id: Date.now() + Math.random() }] }));
    setWorkoutName(""); setWorkoutValue(""); setWorkoutUnit("סטים"); setWorkoutNotes(""); setShowWorkoutForm(false);
  }
  function removeWorkout(id) { updateToday(td => ({ ...td, workouts: td.workouts.filter(w => w.id !== id) })); }

  const historyDays = Object.keys(allData).filter(k => k !== todayKey).sort((a,b) => b.localeCompare(a)).slice(0,14);

  const inputStyle = { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, padding: "10px 14px", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", direction: "rtl" };
  const btnPrimary = { background: COLORS.accent, color: "#0F1117", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer", flex: 1 };
  const btnSecondary = { background: COLORS.border, color: COLORS.muted, border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 600, fontSize: 14, cursor: "pointer", flex: 1 };

  if (screen === "onboarding") {
    return <Onboarding onDone={(g, p) => { setGoals(g); setProfile(p); setScreen("summary"); }} />;
  }
  if (screen === "summary") {
    return <GoalsSummary goals={goals} profile={profile} onStart={() => setScreen("main")} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'Segoe UI', Arial, sans-serif", direction: "rtl", maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 12px", background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: COLORS.accent }}>💪 FitTrack</h1>
            <p style={{ margin: 0, color: COLORS.muted, fontSize: 12 }}>
              {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <button onClick={() => setShowGoals(!showGoals)}
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13 }}>
            ⚙️ יעדים
          </button>
        </div>
      </div>

      {showGoals && (
        <div style={{ background: COLORS.card, margin: 16, borderRadius: 14, padding: 18, border: `1px solid ${COLORS.border}` }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 16, color: COLORS.accent }}>עריכת יעדים</h3>
          {[{ key:"calories",label:"קלוריות" },{ key:"protein",label:"חלבון (g)" },{ key:"carbs",label:"פחמימות (g)" },{ key:"fat",label:"שומן (g)" }].map(({ key, label }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <label style={{ color: COLORS.muted, fontSize: 13, minWidth: 90 }}>{label}</label>
              <input type="number" value={goals[key]} onChange={e => setGoals(g => ({ ...g, [key]: parseInt(e.target.value)||0 }))} style={{ ...inputStyle, width: 90 }} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={() => setShowGoals(false)} style={btnPrimary}>שמור</button>
            <button onClick={() => { setScreen("onboarding"); setShowGoals(false); }} style={btnSecondary}>חשב מחדש</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", margin: "16px 16px 0", borderRadius: 10, overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
        {[{ id:"today",label:"היום" },{ id:"nutrition",label:"תזונה" },{ id:"workout",label:"אימון" },{ id:"history",label:"היסטוריה" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex:1, padding:"10px 0", background: tab===t.id ? COLORS.accent : COLORS.surface, color: tab===t.id ? "#0F1117" : COLORS.muted, border:"none", fontWeight: tab===t.id ? 700 : 500, fontSize:13, cursor:"pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TODAY */}
      {tab === "today" && (
        <div style={{ padding: "16px 16px 0" }}>
          <div style={{ background: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 14, border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, color: COLORS.muted, textAlign: "center" }}>קלוריות יומיות</h3>
            <CalorieRing calories={totalNutrition.calories} goal={goals.calories} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[{ label:"נצרך", val:Math.round(totalNutrition.calories), color:COLORS.accent },{ label:"נותר", val:Math.max(0,goals.calories-Math.round(totalNutrition.calories)), color:COLORS.orange }].map(({ label,val,color }) => (
                <div key={label} style={{ background: COLORS.surface, borderRadius: 10, padding: "10px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color }}>{val}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 14, border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, color: COLORS.muted }}>מאקרו</h3>
            <MacroBar label="חלבון (g)" value={totalNutrition.protein} max={goals.protein} color={COLORS.accent} />
            <MacroBar label="פחמימות (g)" value={totalNutrition.carbs} max={goals.carbs} color="#6B8CFF" />
            <MacroBar label="שומן (g)" value={totalNutrition.fat} max={goals.fat} color={COLORS.orange} />
          </div>
          <div style={{ background: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 14, border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, color: COLORS.muted }}>אימונים היום</h3>
            {todayData.workouts.length === 0
              ? <p style={{ color: COLORS.muted, fontSize: 13, textAlign: "center", margin: 0 }}>לא נרשמו אימונים עדיין</p>
              : todayData.workouts.map(w => (
                <div key={w.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                  <span style={{ fontSize: 20 }}>{w.icon}</span>
                  <span style={{ color: COLORS.text, fontSize: 14, flex: 1, marginRight: 10 }}>{w.name}</span>
                  <span style={{ color: COLORS.accent, fontSize: 13, fontWeight: 600 }}>{w.value} {w.unit}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* NUTRITION */}
      {tab === "nutrition" && (
        <div style={{ padding: "16px 16px 0" }}>
          <div style={{ background: COLORS.card, borderRadius: 16, padding: 18, marginBottom: 14, border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15, color: COLORS.muted }}>הוסף מזון</h3>
            <input
              placeholder="🔍  חפש מזון... (עוף, בננה, Pro יטבתה...)"
              value={foodSearch}
              onChange={e => { setFoodSearch(e.target.value); setActiveCategory(null); }}
              style={{ ...inputStyle, marginBottom: 10 }}
              autoComplete="off"
            />
            {!foodSearch && (
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6 }}>
                {FOOD_CATEGORIES.map(cat => (
                  <button key={cat.label} onClick={() => setActiveCategory(activeCategory === cat.label ? null : cat.label)}
                    style={{ background: activeCategory === cat.label ? COLORS.accent : COLORS.surface, color: activeCategory === cat.label ? "#0F1117" : COLORS.muted, border: `1px solid ${activeCategory === cat.label ? COLORS.accent : COLORS.border}`, borderRadius: 20, padding: "5px 12px", fontSize: 12, whiteSpace: "nowrap", cursor: "pointer", fontWeight: activeCategory === cat.label ? 700 : 400 }}>
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
            {(foodSearch || activeCategory) && (
              <div style={{ maxHeight: 300, overflowY: "auto", marginTop: 10 }}>
                {(() => {
                  const q = foodSearch.trim().toLowerCase();
                  let items = activeCategory && !foodSearch
                    ? FOOD_CATEGORIES.find(c => c.label === activeCategory)?.items || []
                    : FOOD_PRESETS.filter(p => p.name.toLowerCase().includes(q));
                  if (items.length === 0) return <p style={{ color: COLORS.muted, fontSize: 13, textAlign: "center", margin: "12px 0" }}>לא נמצאו תוצאות עבור "{foodSearch}"</p>;
                  return items.map(p => (
                    <button key={p.name + p.calories} onClick={() => { addFood(p); setFoodSearch(""); setActiveCategory(null); }}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, padding: "10px 12px", cursor: "pointer", marginBottom: 6, textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, flex: 1, paddingLeft: 8 }}>{p.name}</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                        <span style={{ color: COLORS.muted, fontSize: 11 }}>ח׳ {p.protein}g</span>
                        <span style={{ color: COLORS.accent, fontSize: 13, fontWeight: 700 }}>{p.calories} קל׳</span>
                        <span style={{ background: COLORS.accentDim, color: COLORS.accent, borderRadius: 6, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>+</span>
                      </div>
                    </button>
                  ));
                })()}
              </div>
            )}
            {!foodSearch && !activeCategory && (
              <p style={{ color: COLORS.muted, fontSize: 13, textAlign: "center", margin: "14px 0 4px" }}>
                בחר קטגוריה או הקלד שם מזון לחיפוש
              </p>
            )}
            <button onClick={() => setShowFoodForm(!showFoodForm)} style={{ ...btnPrimary, width: "100%", marginTop: 12 }}>+ הוסף מזון ידנית</button>
          </div>
          {showFoodForm && (
            <div style={{ background: COLORS.card, borderRadius: 16, padding: 18, marginBottom: 14, border: `1px solid ${COLORS.accent}` }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 15, color: COLORS.accent }}>מזון מותאם</h3>
              <input placeholder="שם המזון" value={foodName} onChange={e => setFoodName(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <input placeholder="קלוריות" type="number" value={foodCal} onChange={e => setFoodCal(e.target.value)} style={inputStyle} />
                <input placeholder="חלבון (g)" type="number" value={foodProtein} onChange={e => setFoodProtein(e.target.value)} style={inputStyle} />
                <input placeholder="פחמימות (g)" type="number" value={foodCarbs} onChange={e => setFoodCarbs(e.target.value)} style={inputStyle} />
                <input placeholder="שומן (g)" type="number" value={foodFat} onChange={e => setFoodFat(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addCustomFood} style={btnPrimary}>הוסף</button>
                <button onClick={() => setShowFoodForm(false)} style={btnSecondary}>ביטול</button>
              </div>
            </div>
          )}
          <div style={{ background: COLORS.card, borderRadius: 16, padding: 18, border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, color: COLORS.muted }}>ארוחות היום</h3>
            {todayData.meals.length === 0
              ? <p style={{ color: COLORS.muted, fontSize: 13, textAlign: "center", margin: 0 }}>לא נרשמו ארוחות עדיין</p>
              : <>
                {todayData.meals.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>חלבון: {m.protein}g | פחמימות: {m.carbs}g | שומן: {m.fat}g</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: COLORS.accent, fontWeight: 700, fontSize: 14 }}>{m.calories} קל׳</span>
                      <button onClick={() => removeFood(m.id)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 20, padding: 0 }}>×</button>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, fontWeight: 700 }}>
                  <span style={{ color: COLORS.muted }}>סה״כ</span>
                  <span style={{ color: COLORS.accent }}>{Math.round(totalNutrition.calories)} קל׳</span>
                </div>
              </>}
          </div>
        </div>
      )}

      {/* WORKOUT */}
      {tab === "workout" && (
        <div style={{ padding: "16px 16px 0" }}>
          <div style={{ background: COLORS.card, borderRadius: 16, padding: 18, marginBottom: 14, border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, color: COLORS.muted }}>בחר אימון</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {WORKOUT_PRESETS.map(p => (
                <button key={p.name} onClick={() => addWorkout(p)}
                  style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, padding: "10px", cursor: "pointer", fontSize: 13, textAlign: "center" }}>
                  <div style={{ fontSize: 22 }}>{p.icon}</div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{p.name}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowWorkoutForm(!showWorkoutForm)} style={{ ...btnPrimary, width: "100%" }}>+ אימון מותאם</button>
          </div>
          {showWorkoutForm && (
            <div style={{ background: COLORS.card, borderRadius: 16, padding: 18, marginBottom: 14, border: `1px solid ${COLORS.orange}` }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 15, color: COLORS.orange }}>אימון מותאם</h3>
              <input placeholder="שם האימון" value={workoutName} onChange={e => setWorkoutName(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <input placeholder="כמות" type="number" value={workoutValue} onChange={e => setWorkoutValue(e.target.value)} style={inputStyle} />
                <input placeholder='יחידות (ק"מ, סטים...)' value={workoutUnit} onChange={e => setWorkoutUnit(e.target.value)} style={inputStyle} />
              </div>
              <input placeholder="הערות (אופציונלי)" value={workoutNotes} onChange={e => setWorkoutNotes(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addCustomWorkout} style={{ ...btnPrimary, background: COLORS.orange }}>הוסף</button>
                <button onClick={() => setShowWorkoutForm(false)} style={btnSecondary}>ביטול</button>
              </div>
            </div>
          )}
          <div style={{ background: COLORS.card, borderRadius: 16, padding: 18, border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, color: COLORS.muted }}>אימונים היום</h3>
            {todayData.workouts.length === 0
              ? <p style={{ color: COLORS.muted, fontSize: 13, textAlign: "center", margin: 0 }}>לא נרשמו אימונים עדיין</p>
              : todayData.workouts.map(w => (
                <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                  <span style={{ fontSize: 22 }}>{w.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{w.name}</div>
                    {w.notes && <div style={{ fontSize: 11, color: COLORS.muted }}>{w.notes}</div>}
                  </div>
                  <span style={{ color: COLORS.orange, fontWeight: 700, fontSize: 14 }}>{w.value} {w.unit}</span>
                  <button onClick={() => removeWorkout(w.id)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 20, padding: 0 }}>×</button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* HISTORY */}
      {tab === "history" && (
        <div style={{ padding: "16px 16px 0" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, color: COLORS.muted }}>14 ימים אחרונים</h3>
          {historyDays.length === 0
            ? <div style={{ background: COLORS.card, borderRadius: 16, padding: 30, textAlign: "center", border: `1px solid ${COLORS.border}` }}>
                <p style={{ color: COLORS.muted, fontSize: 14, margin: 0 }}>אין נתונים היסטוריים עדיין</p>
                <p style={{ color: COLORS.muted, fontSize: 12, marginTop: 8 }}>המשך לרשום ארוחות ואימונים כדי לראות את ההתקדמות שלך</p>
              </div>
            : historyDays.map(day => {
                const d = allData[day];
                const totalCal = d.meals.reduce((s,m) => s+m.calories, 0);
                return (
                  <div key={day} style={{ background: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 10, border: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{new Date(day).toLocaleDateString("he-IL", { weekday:"long", day:"numeric", month:"short" })}</div>
                      <div style={{ color: COLORS.accent, fontWeight: 700, fontSize: 15 }}>{Math.round(totalCal)} קל׳</div>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ background: COLORS.accentDim, color: COLORS.accent, borderRadius: 6, padding: "3px 8px", fontSize: 12 }}>🍽 {d.meals.length} ארוחות</span>
                      <span style={{ background: COLORS.orangeDim, color: COLORS.orange, borderRadius: 6, padding: "3px 8px", fontSize: 12 }}>💪 {d.workouts.length} אימונים</span>
                    </div>
                  </div>
                );
              })}
        </div>
      )}

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-around", padding: "10px 0 16px" }}>
        {[{ id:"today",icon:"🏠",label:"היום" },{ id:"nutrition",icon:"🥗",label:"תזונה" },{ id:"workout",icon:"🏋️",label:"אימון" },{ id:"history",icon:"📊",label:"היסטוריה" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
            <span style={{ fontSize: 22 }}>{t.icon}</span>
            <span style={{ fontSize: 11, color: tab===t.id ? COLORS.accent : COLORS.muted, fontWeight: tab===t.id ? 700 : 400 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
