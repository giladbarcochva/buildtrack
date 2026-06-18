import { useState, useRef, useEffect } from "react";

const INVENTORY = [
  { sku: "GYP-120-60",   name: "לוח גבס 120×60",          price: 45,   unit: "יח'",  stock: 150, alt: ["גבס","לוח גבס"], location: "B3-4",  branch: "ראשי",   discount: true },
  { sku: "STUD-C48",     name: "מסגרת C 48mm",            price: 28,   unit: "מ'",   stock: 200, alt: ["מסגרת","סטאד"], location: "B2-1",  branch: "ראשי",   discount: true },
  { sku: "TRACK-U48",    name: "פסולת U 48mm",            price: 24,   unit: "מ'",   stock: 180, alt: ["פסולת","טרק"],  location: "B2-2",  branch: "ראשי",   discount: true },
  { sku: "SCR-TN35",     name: "בורגי TN 35mm (x100)",    price: 12,   unit: "קופ'", stock: 500, alt: ["בורגים","ברגים","תן"], location: "B5-3", branch: "ראשי", discount: false },
  { sku: "PLAS-25KG",    name: "טיח 25 ק\"ג",              price: 65,   unit: "שקית", stock: 80,  alt: ["טיח","plaster"], location: "C1-2", branch: "ראשי",   discount: false },
  { sku: "COMP-7KG",     name: "שפכטל 7 ק\"ג",             price: 42,   unit: "דלי",  stock: 60,  alt: ["שפכטל","שפכטל ראשון"], location: "C1-3", branch: "ראשי", discount: false },
  { sku: "PAINT-5L",     name: "צבע פנים 5 ליטר",         price: 95,   unit: "דלי",  stock: 45,  alt: ["צבע","paint"],  location: "D4-1",  branch: "ראשי",   discount: false },
  { sku: "ALU-50x50",    name: "פרופיל אלומיניום 50×50",  price: 95,   unit: "מ'",   stock: 300, alt: ["פרופיל","אלומיניום","50x50"], location: "F1-1", branch: "ראשי", discount: true },
  { sku: "ALU-30x50",    name: "פרופיל אלומיניום 30×50",  price: 75,   unit: "מ'",   stock: 200, alt: ["פרופיל 30","30x50"], location: "F1-2", branch: "ראשי", discount: true },
  { sku: "ANCHOR-CHEM",  name: "עוגן כימי",               price: 25,   unit: "יח'",  stock: 120, alt: ["עוגן","אנקר"],  location: "G2-3",  branch: "ראשי",   discount: false },
  { sku: "BOLT-M8",      name: "בורג M8×60",              price: 4,    unit: "יח'",  stock: 800, alt: ["בורג m8","m8"], location: "G3-1",  branch: "ראשי",   discount: false },
  { sku: "CONCRETE-40",  name: "בטון שקית 40 ק\"ג",        price: 35,   unit: "שקית", stock: 200, alt: ["בטון","concrete"], location: "H1-1", branch: "ראשי",   discount: false },
  { sku: "OUTLET-1",     name: "שקע חשמל בודד",           price: 22,   unit: "יח'",  stock: 250, alt: ["שקע","שקעים"],  location: "E2-1",  branch: "ראשי",   discount: false },
  { sku: "WIRE-NH5",     name: "חוט NH-5 (100 מ')",       price: 280,  unit: "גליל", stock: 30,  alt: ["חוט","nh5","כבל"], location: "E3-2", branch: "ראשי",  discount: false },
  { sku: "TILE-60x60",   name: "אריח 60×60 (גרניט)",      price: 38,   unit: "יח'",  stock: 400, alt: ["אריח","ריצוף","פלטה"], location: "J1-1", branch: "ראשי", discount: true },
  { sku: "TILE-ADH",     name: "דבק פלייסטר 25 ק\"ג",      price: 62,   unit: "שקית", stock: 120, alt: ["דבק","פלייסטר"], location: "J2-1", branch: "ראשי", discount: false },
  { sku: "PIPE-PVC20",   name: "צנרת PVC 20mm",           price: 18,   unit: "מ'",   stock: 150, alt: ["צנרת","pvc","צינור"], location: "K1-3", branch: "ראשי", discount: false },
];

const CUSTOMERS = {
  "050-1234567": { name: "יוסי כהן", tier: "gold",   discount: 0.15, orders: 47 },
  "052-9876543": { name: "רחמים לוי", tier: "silver", discount: 0.08, orders: 18 },
  "054-5551234": { name: "מוטי אבי",  tier: "bronze", discount: 0.05, orders: 7  },
};

const TIER_LABELS = { gold: "זהב", silver: "כסף", bronze: "ברונזה" };
const TIER_COLORS = { gold: "#f59e0b", silver: "#94a3b8", bronze: "#a16207" };

function findItems(text) {
  const lc = text.toLowerCase();
  const found = [];
  for (const item of INVENTORY) {
    const triggers = [item.name.toLowerCase(), ...item.alt.map(a => a.toLowerCase())];
    if (triggers.some(t => lc.includes(t))) {
      const qtyMatch = lc.match(/(\d+(?:\.\d+)?)\s*(?:מטר|מ'|יח|יחידות|לוח|קופ|שקית|דלי|גליל)?/g);
      let qty = 1;
      const rawNums = text.match(/\d+(?:\.\d+)?/g);
      if (rawNums?.length) qty = parseFloat(rawNums[0]);
      found.push({ ...item, requestedQty: qty });
    }
  }
  return found;
}

function buildQuote(items, customer) {
  const disc = customer?.discount || 0;
  return items.map(item => {
    const base = item.price * item.requestedQty;
    const save = item.discount && disc > 0 ? base * disc : 0;
    return { ...item, baseTotal: base, discount: save, finalTotal: base - save };
  });
}

function formatQuoteMessage(lineItems, customer) {
  let msg = customer ? `שלום ${customer.name}! 👋\n` : "";
  const tierBadge = customer ? `(לקוח ${TIER_LABELS[customer.tier]})` : "";
  if (tierBadge) msg += `${tierBadge}\n\n`;
  msg += "📦 הצעת מחיר:\n";
  msg += "─────────────────────\n";
  let total = 0, totalSaved = 0;
  for (const li of lineItems) {
    msg += `✓ ${li.name}\n`;
    msg += `  ${li.requestedQty} ${li.unit} × ₪${li.price} = ₪${li.baseTotal.toLocaleString()}`;
    if (li.discount > 0) {
      msg += ` (חסכת ₪${li.discount.toLocaleString()})`;
    }
    msg += `\n  📍 מיקום: ${li.location}\n`;
    total += li.finalTotal;
    totalSaved += li.discount;
  }
  msg += "─────────────────────\n";
  msg += `💰 סה"כ: ₪${total.toLocaleString()}`;
  if (totalSaved > 0) msg += ` (חסכת ₪${totalSaved.toLocaleString()} עם הנחת ${TIER_LABELS[customer.tier]})`;
  msg += "\n\n🏪 הנמצאות בחנות הראשית";
  return msg;
}

function OutOfStockMessage(item) {
  return `⚠️ ${item.name} — יש רק ${item.stock} ${item.unit} במלאי. אם צריך יותר, ניתן להזמין מהספק (3-5 ימי עסקים).`;
}

function generateResponse(text, customer) {
  const items = findItems(text);
  if (!items.length) {
    return { type: "info", content: "לא זיהיתי מוצרים ספציפיים בהודעה. ניתן לשלוח רשימה כמו:\n'צריך 25 לוחות גבס 120×60 ו-500 בורגים 35mm'" };
  }
  const warnings = items.filter(i => i.stock < i.requestedQty).map(OutOfStockMessage);
  const quote = buildQuote(items, customer);
  const msg = formatQuoteMessage(quote, customer);
  return { type: "quote", content: msg, warnings, items: quote };
}

function Bubble({ msg }) {
  const isAgent = msg.role === "agent";
  return (
    <div style={{ display: "flex", justifyContent: isAgent ? "flex-start" : "flex-end", marginBottom: 10 }}>
      <div style={{
        maxWidth: "80%", padding: "10px 14px", borderRadius: isAgent ? "0 14px 14px 14px" : "14px 0 14px 14px",
        background: isAgent ? "white" : "#25D366", color: isAgent ? "#111" : "white",
        boxShadow: "0 1px 2px #0002", fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.6,
      }}>
        {msg.text}
        <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6, textAlign: "left" }}>{msg.time}</div>
      </div>
    </div>
  );
}

export default function System2WhatsApp() {
  const [phone, setPhone] = useState("050-1234567");
  const [messages, setMessages] = useState([
    {
      role: "agent", time: "09:00",
      text: "שלום! אני הסוכן החכם של חנות הבנייה 🏪\nשלח לי רשימת חומרים או שאל מחיר — אענה תוך שניות."
    }
  ]);
  const [input, setInput] = useState("");
  const [searching, setSearching] = useState(false);
  const bottomRef = useRef(null);
  const customer = CUSTOMERS[phone] || null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const now = () => new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input.trim(), time: now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSearching(true);
    await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
    const resp = generateResponse(userMsg.text, customer);
    setMessages(prev => [...prev,
      { role: "agent", text: resp.content, time: now() },
      ...(resp.warnings?.map(w => ({ role: "agent", text: w, time: now() })) || [])
    ]);
    setSearching(false);
  };

  const handleKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  const sampleMessages = [
    "צריך: 25 לוחות גבס 120×60, 500 בורגים 35mm, 30 ק\"ג טייח",
    "כמה עולה פרופיל אלומיניום 50×50?",
    "יש לכם אריחים 60×60 ובמה המחיר לקבלן?",
  ];

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "#075E54", color: "white", padding: "12px 16px", borderRadius: "12px 12px 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#25D366",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏪</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>חנות בנייה — סוכן חכם</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>מענה מיידי לשאלות מחיר ומלאי</div>
          </div>
          {customer && (
            <div style={{ background: TIER_COLORS[customer.tier] + "33", border: `1px solid ${TIER_COLORS[customer.tier]}`,
              borderRadius: 8, padding: "3px 8px", fontSize: 12, fontWeight: 700, color: "white" }}>
              {customer.name} · {TIER_LABELS[customer.tier]}
            </div>
          )}
        </div>
      </div>

      {/* Customer selector */}
      <div style={{ background: "#e5ddd5", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <span style={{ color: "#666" }}>הזדהה כ:</span>
        <select value={phone} onChange={e => setPhone(e.target.value)}
          style={{ borderRadius: 6, border: "1px solid #ccc", padding: "3px 8px", fontSize: 13, background: "white" }}>
          <option value="050-1234567">יוסי כהן (לקוח זהב — 15%)</option>
          <option value="052-9876543">רחמים לוי (לקוח כסף — 8%)</option>
          <option value="054-5551234">מוטי אבי (לקוח ברונזה — 5%)</option>
          <option value="">לקוח חדש (ללא הנחה)</option>
        </select>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px", background: "#e5ddd5" }}>
        {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
        {searching && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ background: "white", borderRadius: "0 14px 14px 14px", padding: "10px 16px",
              fontSize: 14, color: "#888", boxShadow: "0 1px 2px #0002" }}>⏳ בודק מלאי ומחיר...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div style={{ background: "#f0f0f0", padding: "6px 12px", borderTop: "1px solid #ddd" }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
          {sampleMessages.map((m, i) => (
            <button key={i} onClick={() => setInput(m)}
              style={{ whiteSpace: "nowrap", padding: "5px 10px", borderRadius: 12, border: "1px solid #25D366",
                background: "white", color: "#075E54", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              {m.length > 30 ? m.slice(0, 30) + "…" : m}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ background: "#f0f0f0", padding: "8px 12px", display: "flex", gap: 8, alignItems: "flex-end",
        borderRadius: "0 0 12px 12px" }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="שלח הודעה..."
          rows={1}
          style={{ flex: 1, borderRadius: 20, border: "none", padding: "10px 16px", resize: "none",
            fontSize: 15, outline: "none", maxHeight: 100, overflowY: "auto" }}
        />
        <button onClick={send} disabled={!input.trim()}
          style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: "#25D366",
            color: "white", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0, opacity: input.trim() ? 1 : 0.5 }}>
          ▶
        </button>
      </div>

      {/* Inventory panel */}
      <details style={{ background: "white", borderRadius: 12, marginTop: 12, overflow: "hidden" }}>
        <summary style={{ padding: "12px 16px", cursor: "pointer", fontWeight: 700, fontSize: 14, color: "#374151" }}>
          📦 מלאי חנות ({INVENTORY.length} פריטים)
        </summary>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#64748b" }}>
                <th style={{ padding: "6px 10px", textAlign: "right" }}>שם פריט</th>
                <th style={{ padding: "6px 8px", textAlign: "center" }}>מחיר</th>
                <th style={{ padding: "6px 8px", textAlign: "center" }}>מלאי</th>
                <th style={{ padding: "6px 10px", textAlign: "right" }}>מיקום</th>
              </tr>
            </thead>
            <tbody>
              {INVENTORY.map((item, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "6px 10px" }}>{item.name}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>₪{item.price}/{item.unit}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center",
                    color: item.stock < 20 ? "#ef4444" : "#10b981" }}>{item.stock}</td>
                  <td style={{ padding: "6px 10px", color: "#64748b" }}>{item.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
