import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './construction-manager.jsx'

// אם משהו נשבר בזמן הצגת המסך — במקום דף לבן מוצגת הודעה עם פרטי השגיאה וכפתור תיקון
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { try { console.error("BuildTrack crash:", err, info && info.componentStack); } catch (e) {} }
  render() {
    if (!this.state.err) return this.props.children;
    const msg = String((this.state.err && (this.state.err.message || this.state.err)) || "").slice(0, 300);
    return (
      <div style={{ minHeight:"100vh", background:"#1A1A2E", color:"#fff", direction:"rtl", fontFamily:"Heebo,Arial,sans-serif", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, textAlign:"center", boxSizing:"border-box" }}>
        <div style={{ fontSize:40, marginBottom:10 }}>⚠️</div>
        <h2 style={{ margin:"0 0 8px", color:"#E8C547" }}>משהו השתבש</h2>
        <p style={{ margin:"0 0 14px", color:"#ccc", fontSize:14 }}>צלם את המסך ושלח למנהל, ואז לחץ על הכפתור</p>
        <p style={{ margin:"0 0 18px", color:"#888", fontSize:12, direction:"ltr", wordBreak:"break-word", maxWidth:340 }}>{msg}</p>
        <button onClick={() => (window.btHardReload ? window.btHardReload() : location.reload())}
          style={{ background:"#E8C547", color:"#1A1A2E", border:"none", borderRadius:10, padding:"11px 20px", fontSize:15, fontWeight:700 }}>🔄 נקה ורענן</button>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
