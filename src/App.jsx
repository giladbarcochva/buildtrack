import { useState } from "react";
import ConstructionManager from "./construction-manager.jsx";
import System1Contractor from "./systems/System1Contractor.jsx";
import System2WhatsApp from "./systems/System2WhatsApp.jsx";
import System3DIY from "./systems/System3DIY.jsx";

const SYSTEMS = [
  {
    id: "contractor",
    label: "מערכת קבלנים",
    sublabel: "B2B — חישוב חומרים",
    emoji: "🏗️",
    color: "#1e40af",
    gradient: "linear-gradient(135deg, #1e40af, #3b82f6)",
    desc: "הזן תיאור חדר או מידות — קבל רשימת חומרים מלאה לפי גבס, חשמל, אינסטלציה וריצוף",
    features: ["חישוב לפי סטנדרט בנייה", "פירוט לפי בעל מקצוע", "הערכת עלות שוק"],
  },
  {
    id: "whatsapp",
    label: "סוכן WhatsApp",
    sublabel: "B2B — חנות בנייה",
    emoji: "💬",
    color: "#075E54",
    gradient: "linear-gradient(135deg, #075E54, #25D366)",
    desc: "סוכן חכם לחנות בנייה: מחפש מלאי, מוציא הצעת מחיר ומפעיל הנחות לקוח תוך שניות",
    features: ["חיפוש מלאי בזמן אמת", "הנחות לקוח אוטומטיות", "מיקום פריט בחנות"],
  },
  {
    id: "diy",
    label: "פרויקט DIY",
    sublabel: "B2C — לבעל הבית",
    emoji: "🔨",
    color: "#c2410c",
    gradient: "linear-gradient(135deg, #c2410c, #f97316)",
    desc: "אשף אינטראקטיבי לבניית פרגולה, גדר, דק ועוד — כולל רשימת קניות מלאה",
    features: ["אשף שלב אחר שלב", "חישוב חומרים מדויק", "הערכת עלות + זמן"],
  },
];

export default function App() {
  const [screen, setScreen] = useState("home");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("claude_api_key") || "");
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(apiKey);

  const saveApiKey = () => {
    localStorage.setItem("claude_api_key", apiKeyInput);
    setApiKey(apiKeyInput);
    setShowSettings(false);
  };

  if (screen === "manager") return (
    <div>
      <button onClick={() => setScreen("home")} style={{
        position: "fixed", top: 12, right: 12, zIndex: 100,
        padding: "8px 16px", borderRadius: 8, border: "none",
        background: "#1e40af", color: "white", fontWeight: 700, cursor: "pointer", fontSize: 14,
      }}>
        ← BuildAI
      </button>
      <ConstructionManager />
    </div>
  );

  const activeSystem = SYSTEMS.find(s => s.id === screen);

  if (activeSystem) return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Top nav */}
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "0 16px",
        display: "flex", alignItems: "center", gap: 12, height: 52, position: "sticky", top: 0, zIndex: 50 }}>
        <button onClick={() => setScreen("home")} style={{
          padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
          background: "white", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#374151",
        }}>← חזור</button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <span style={{ fontSize: 20 }}>{activeSystem.emoji}</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{activeSystem.label}</span>
          <span style={{ fontSize: 12, color: "#94a3b8", background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>
            {activeSystem.sublabel}
          </span>
        </div>
        {screen === "contractor" && (
          <button onClick={() => setShowSettings(true)} style={{
            padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
            background: apiKey ? "#f0fdf4" : "white", cursor: "pointer", fontSize: 13,
            color: apiKey ? "#166534" : "#64748b",
          }}>
            {apiKey ? "✅ AI" : "⚙️ AI"}
          </button>
        )}
      </div>

      <div style={{ padding: "0 0 40px" }}>
        {screen === "contractor" && <System1Contractor apiKey={apiKey} />}
        {screen === "whatsapp" && <System2WhatsApp />}
        {screen === "diy" && <System3DIY />}
      </div>

      {showSettings && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 24, width: "100%", maxWidth: 420 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>⚙️ הגדרות AI</h3>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
              מפתח Claude API נדרש לניתוח תיאורים חופשיים בעברית.
              ניתן לקבל מפתח ב-console.anthropic.com
            </p>
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="sk-ant-api03-..."
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8,
                border: "1px solid #e2e8f0", fontSize: 14, outline: "none", marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowSettings(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e2e8f0",
                  background: "white", cursor: "pointer", fontWeight: 600 }}>ביטול</button>
              <button onClick={saveApiKey}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none",
                  background: "#3b82f6", color: "white", cursor: "pointer", fontWeight: 700 }}>שמור</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Home screen
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "0 0 40px" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #0f172a, #1e40af)", color: "white", padding: "32px 20px 40px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏗️</div>
        <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>BuildAI</h1>
        <p style={{ margin: 0, fontSize: 15, opacity: 0.8, maxWidth: 380, marginInline: "auto" }}>
          3 מערכות חכמות לתעשיית הבנייה — מהכנת אומדן ועד רשימת קנייה
        </p>
      </div>

      {/* System cards */}
      <div style={{ maxWidth: 640, margin: "-20px auto 0", padding: "0 16px" }}>
        {SYSTEMS.map(sys => (
          <button
            key={sys.id}
            onClick={() => setScreen(sys.id)}
            style={{ width: "100%", textAlign: "right", background: "white", border: "none",
              borderRadius: 16, padding: 0, marginBottom: 14, cursor: "pointer",
              boxShadow: "0 2px 8px #0001", overflow: "hidden", display: "block" }}
          >
            {/* Colored header strip */}
            <div style={{ background: sys.gradient, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 30 }}>{sys.emoji}</span>
              <div style={{ flex: 1, textAlign: "right" }}>
                <div style={{ color: "white", fontWeight: 800, fontSize: 17 }}>{sys.label}</div>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>{sys.sublabel}</div>
              </div>
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 20 }}>←</span>
            </div>
            {/* Body */}
            <div style={{ padding: "14px 18px" }}>
              <p style={{ margin: "0 0 10px", fontSize: 14, color: "#374151", lineHeight: 1.5 }}>{sys.desc}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {sys.features.map((f, i) => (
                  <span key={i} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12,
                    background: sys.color + "12", color: sys.color, fontWeight: 600 }}>{f}</span>
                ))}
              </div>
            </div>
          </button>
        ))}

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0 14px" }}>
          <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
          <span style={{ fontSize: 12, color: "#94a3b8" }}>כלים נוספים</span>
          <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
        </div>

        {/* Manager card */}
        <button onClick={() => setScreen("manager")}
          style={{ width: "100%", textAlign: "right", background: "white", border: "1px solid #e2e8f0",
            borderRadius: 14, padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 26 }}>📊</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>מנהל פרויקטים</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>ניהול עובדים, שכר ודיווחים יומיים</div>
          </div>
          <span style={{ color: "#94a3b8", fontSize: 18 }}>←</span>
        </button>
      </div>
    </div>
  );
}
