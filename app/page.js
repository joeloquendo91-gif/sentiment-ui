"use client";
import { useState, useEffect } from "react";

const sentimentColor = {
  positive: "#16a34a",
  negative: "#dc2626",
  mixed: "#d97706",
  neutral: "#6b7280",
};

const sentimentEmoji = {
  positive: "🟢",
  negative: "🔴",
  mixed: "🟡",
  neutral: "⚪",
};

const C = {
  bg: "#fafaf9",
  bgCard: "#ffffff",
  bgMuted: "#f4f4f2",
  border: "#e8e8e5",
  borderStrong: "#d0d0cb",
  accent: "#1a1a1a",
  blue: "#2563eb",
  textPrimary: "#111110",
  textSecondary: "#6b6b63",
  textDim: "#a8a89e",
};

const MOCK_RESULT = {
  url: "yelp.com/biz/regional-medical-center",
  source_type: "yelp",
  overall_sentiment: "mixed",
  sentiment_score: 4,
  confidence: "high",
  summary: "Regional Medical Center receives strong praise for its surgical and cardiac care teams, but patient experience is consistently undermined by long ER wait times, billing confusion, and difficulty reaching providers after discharge. Clinical excellence is the clear strength — operational experience is the gap.",
  key_quote: "The surgical team saved my father's life and we couldn't be more grateful — but the billing process afterward was an absolute nightmare.",
  themes: ["staff communication", "wait times", "billing & insurance", "clinical quality", "follow-up care"],
  sentiment_per_theme: { "staff communication": "negative", "wait times": "negative", "billing & insurance": "negative", "clinical quality": "positive", "follow-up care": "negative" },
  pain_points: ["ER wait times averaging 4–6 hours", "Billing statements hard to understand", "Difficult to reach doctor after discharge"],
  praise_points: ["Highly skilled cardiac surgeons", "Compassionate nursing staff", "Advanced diagnostic capabilities"],
  competitor_mentions: ["St. Mary's Medical", "Northside Hospital", "Metro Health System"],
  feature_requests: ["Real-time ER wait time visibility", "Clearer billing communication", "Better after-hours nurse line"],
};

function Tag({ children, color = C.blue }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px",
      background: color === C.blue ? "#eff6ff" : "transparent",
      border: `1px solid ${color === C.blue ? "#bfdbfe" : C.border}`,
      borderRadius: 20, fontSize: 12, color, margin: 2,
    }}>{children}</span>
  );
}

function ResultCard({ result }) {
  const [expanded, setExpanded] = useState(false);
  if (result.error) {
    return (
      <div style={{ padding: 16, background: "#fef2f2", border: `1px solid #fecaca`, borderRadius: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 600, color: "#dc2626", marginBottom: 4 }}>Failed</div>
        <div style={{ fontSize: 13, color: C.textDim, marginBottom: 4 }}>{result.url}</div>
        <div style={{ fontSize: 13, color: "#ef4444" }}>{result.error}</div>
      </div>
    );
  }
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 12, overflow: "hidden", background: C.bgCard, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div onClick={() => setExpanded(!expanded)} style={{ padding: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 18 }}>{sentimentEmoji[result.overall_sentiment]}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: sentimentColor[result.overall_sentiment], textTransform: "capitalize", fontSize: 14 }}>
            {result.overall_sentiment} — {result.sentiment_score}/10
          </div>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 2, fontFamily: "monospace" }}>{result.url.replace("https://", "").slice(0, 60)}</div>
        </div>
        <span style={{ color: C.textDim, fontSize: 11 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 12, paddingTop: 16 }}>
          <p style={{ margin: 0, color: C.textSecondary, lineHeight: 1.75, fontSize: 14 }}>{result.summary}</p>
          <div style={{ padding: 14, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 11, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Key Quote</div>
            <p style={{ margin: 0, fontStyle: "italic", color: "#78350f", fontSize: 13 }}>"{result.key_quote}"</p>
          </div>
          {result.themes && result.themes.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Themes</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {result.themes.map((theme) => (
                  <span key={theme} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, background: C.bgMuted, color: C.textSecondary, border: `1px solid ${C.border}` }}>
                    {sentimentEmoji[result.sentiment_per_theme?.[theme]]} {theme}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {result.pain_points?.length > 0 && (
              <div style={{ padding: 14, background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 11, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pain Points</div>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                  {result.pain_points.map((p, i) => <li key={i} style={{ color: "#b91c1c", fontSize: 13 }}>{p}</li>)}
                </ul>
              </div>
            )}
            {result.praise_points?.length > 0 && (
              <div style={{ padding: 14, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 11, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.06em" }}>Praise</div>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                  {result.praise_points.map((p, i) => <li key={i} style={{ color: "#15803d", fontSize: 13 }}>{p}</li>)}
                </ul>
              </div>
            )}
          </div>
          {result.competitor_mentions?.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Competitors</div>
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {result.competitor_mentions.map((c, i) => <Tag key={i}>{c}</Tag>)}
              </div>
            </div>
          )}
          {result.feature_requests?.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Feature Requests</div>
              <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                {result.feature_requests.map((f, i) => <li key={i} style={{ color: C.textSecondary, fontSize: 13 }}>{f}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BatchSummary({ results }) {
  const successful = results.filter((r) => !r.error);
  if (!successful.length) return null;
  const avgScore = (successful.reduce((sum, r) => sum + (r.sentiment_score || 0), 0) / successful.length).toFixed(1);
  const sentimentCounts = successful.reduce((acc, r) => { acc[r.overall_sentiment] = (acc[r.overall_sentiment] || 0) + 1; return acc; }, {});
  const allCompetitors = [...new Set(successful.flatMap((r) => r.competitor_mentions || []))];
  const allPainPoints = successful.flatMap((r) => r.pain_points || []).slice(0, 6);
  return (
    <div style={{ padding: 24, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: C.textPrimary }}>Batch Summary — {successful.length} sources analyzed</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <div style={{ padding: 16, background: "#eff6ff", borderRadius: 10, textAlign: "center", border: "1px solid #bfdbfe" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: C.blue }}>{avgScore}</div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Avg Score</div>
        </div>
        {Object.entries(sentimentCounts).map(([sentiment, count]) => (
          <div key={sentiment} style={{ padding: 16, background: C.bgMuted, borderRadius: 10, textAlign: "center", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: sentimentColor[sentiment] }}>{count}</div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 4, textTransform: "capitalize" }}>{sentiment}</div>
          </div>
        ))}
      </div>
      {allCompetitors.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 8, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>Competitors Surfaced</div>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {allCompetitors.map((c, i) => <Tag key={i}>{c}</Tag>)}
          </div>
        </div>
      )}
      {allPainPoints.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 8, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>Top Pain Points</div>
          <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
            {allPainPoints.map((p, i) => <li key={i} style={{ fontSize: 13, color: C.textSecondary }}>{p}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState("single");
  const [projectName, setProjectName] = useState("");
  const [url, setUrl] = useState("");
  const [batchUrls, setBatchUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  useEffect(() => { setMounted(true); fetchClients(); }, []);

  async function fetchClients() {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch(e) {}
  }

  async function createClient() {
    if (!newClientName.trim()) return;
    setCreatingClient(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClientName.trim() }),
      });
      const data = await res.json();
      setClients(prev => [data, ...prev]);
      setSelectedClientId(data.id);
      setNewClientName("");
      setShowNewClient(false);
    } catch(e) {}
    setCreatingClient(false);
  }

  async function analyzeSingle() {
    if (!url) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, project_name: projectName || "default", client_id: selectedClientId || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function analyzeBatch() {
    const urls = batchUrls.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!urls.length) return;
    setLoading(true); setError(null); setBatchResults(null);
    setProgress("Analyzing " + urls.length + " sources...");
    try {
      const res = await fetch("/api/analyze", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls, project_name: projectName || "default", client_id: selectedClientId || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBatchResults(data.results);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setProgress(""); }
  }

  const hasResults = result || batchResults;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #fafaf9; }
        .input-field:focus { outline: none; border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.08) !important; }
        .analyze-btn:hover:not(:disabled) { background: #333 !important; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; }
        .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .analyze-btn, .mode-btn, .nav-btn, .cta-btn { transition: all 0.15s ease; }
        .nav-link:hover { border-color: #d0d0cb !important; color: #111110 !important; }
        .step-card:hover { background: #f8f8f6 !important; }
        .buyer-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.08) !important; transform: translateY(-2px); }
        .pill:hover { border-color: #d0d0cb !important; color: #6b6b63 !important; }
        .arrow-anim { animation: bounce 1.8s ease-in-out infinite; }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
        .fade-up { opacity: 0; transform: translateY(18px); animation: fadeUp 0.6s ease forwards; }
        .d1{animation-delay:0.05s} .d2{animation-delay:0.16s} .d3{animation-delay:0.27s} .d4{animation-delay:0.38s} .d5{animation-delay:0.49s}
        @keyframes fadeUp { to { opacity:1; transform:translateY(0); } }
        .cta-btn:hover { background: #f0f0ee !important; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,0,0,0.2) !important; }
      `}</style>

      <div style={{ fontFamily: "'Geist', system-ui, sans-serif", color: "#111110", minHeight: "100vh", background: "#fafaf9" }}>

        {/* NAV */}
        <nav style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 48px", borderBottom: "1px solid #e8e8e5",
          background: "rgba(250,250,249,0.95)", position: "sticky", top: 0, zIndex: 100,
          backdropFilter: "blur(8px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, background: "#1a1a1a", borderRadius: 7,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: 13, fontWeight: 700,
              fontFamily: "'Libre Baskerville', serif",
            }}>P</div>
            <span style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>Pulse</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {[["Analyze", "/"], ["Clients", "/clients"], ["CSV Upload", "/upload"], ["Dashboard", "/dashboard"]].map(([label, href]) => (
              <a key={href} href={href} className="nav-link" style={{
                padding: "7px 16px", border: "1px solid #e8e8e5", borderRadius: 8,
                color: href === "/" ? "#111110" : "#6b6b63",
                fontWeight: href === "/" ? 600 : 500,
                background: href === "/" ? "white" : "transparent",
                fontSize: 13, textDecoration: "none",
              }}>{label}</a>
            ))}
          </div>
        </nav>

        {/* HERO — only show when no results */}
        {!hasResults && !loading && (
          <>
            <div style={{ maxWidth: 760, margin: "0 auto", padding: "96px 24px 0", textAlign: "center" }}>

              <div className="fade-up d1" style={{ marginBottom: 28 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 12px", background: "#eff6ff",
                  border: "1px solid #bfdbfe", borderRadius: 20,
                  fontSize: 12, color: "#2563eb", fontFamily: "'Geist Mono', monospace",
                }}>
                  <span style={{ width: 5, height: 5, background: "#2563eb", borderRadius: "50%" }} />
                  AI-powered review intelligence
                </span>
              </div>

              <h1 className="fade-up d2" style={{
                fontFamily: "'Libre Baskerville', serif",
                fontSize: "clamp(38px, 5.5vw, 60px)",
                fontWeight: 700, lineHeight: 1.1,
                letterSpacing: "-0.02em", color: "#111110", marginBottom: 20,
              }}>
                Turn reviews into<br /><em style={{ fontStyle: "italic", color: "#2563eb" }}>structured intelligence</em>
              </h1>

              <p className="fade-up d3" style={{
                fontSize: 17, color: "#6b6b63", lineHeight: 1.75,
                maxWidth: 520, margin: "0 auto 32px",
              }}>
                Paste URLs from review sites. Get back competitor mentions, sentiment by theme, pain points, and a brief-ready summary — in seconds.
              </p>

              {/* Pills */}
              <div className="fade-up d4" style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                {["G2", "Trustpilot", "Capterra", "Product Hunt", "App Store"].map((s) => (
                  <span key={s} className="pill" style={{
                    padding: "4px 12px", background: "#f4f4f2",
                    border: "1px solid #e8e8e5", borderRadius: 20,
                    fontSize: 12, color: "#a8a89e",
                    fontFamily: "'Geist Mono', monospace",
                  }}>{s}</span>
                ))}
              </div>

              {/* Arrow */}
              <div className="fade-up d5" style={{ marginBottom: 16 }}>
                <svg className="arrow-anim" width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto", display: "block", opacity: 0.3 }}>
                  <path d="M12 5v14M5 12l7 7 7-7" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Analyzer card */}
            <div className="fade-up d5" style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 0" }}>
              <div style={{
                background: "white", border: "1px solid #e8e8e5", borderRadius: 16, padding: 20,
                boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 2, background: "#f4f4f2", padding: 3, borderRadius: 8, width: "fit-content", border: "1px solid #e8e8e5" }}>
                    {["single", "batch"].map((m) => (
                      <button key={m} className="mode-btn" onClick={() => setMode(m)} style={{
                        padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                        background: mode === m ? "white" : "transparent",
                        color: mode === m ? "#111110" : "#a8a89e",
                        fontWeight: 500, fontSize: 12, fontFamily: "'Geist', sans-serif",
                        boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      }}>
                        {m === "single" ? "Single URL" : "Batch"}
                      </button>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    {!showNewClient ? (
                      <select
                        value={selectedClientId}
                        onChange={(e) => {
                          if (e.target.value === "__new__") { setShowNewClient(true); setSelectedClientId(""); }
                          else setSelectedClientId(e.target.value);
                        }}
                        style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #e8e8e5", background:"#fafaf9", color: selectedClientId ? "#111110" : "#a8a89e", fontSize:12, fontFamily:"'Geist', sans-serif", outline:"none", cursor:"pointer" }}
                      >
                        <option value="">Tag to client (optional)</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        <option value="__new__">＋ Create new client</option>
                      </select>
                    ) : (
                      <div style={{ display:"flex", gap:4 }}>
                        <input
                          autoFocus
                          value={newClientName}
                          onChange={e => setNewClientName(e.target.value)}
                          onKeyDown={e => { if(e.key==="Enter") createClient(); if(e.key==="Escape") { setShowNewClient(false); setNewClientName(""); } }}
                          placeholder="Client name..."
                          style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #2563eb", background:"white", color:"#111110", fontSize:12, fontFamily:"'Geist', sans-serif", outline:"none", width:160 }}
                        />
                        <button onClick={createClient} disabled={creatingClient||!newClientName.trim()} style={{ padding:"5px 10px", borderRadius:6, background:"#2563eb", color:"white", border:"none", fontSize:12, cursor:"pointer", fontFamily:"'Geist', sans-serif" }}>
                          {creatingClient ? "..." : "Save"}
                        </button>
                        <button onClick={() => { setShowNewClient(false); setNewClientName(""); }} style={{ padding:"5px 8px", borderRadius:6, background:"transparent", color:"#a8a89e", border:"1px solid #e8e8e5", fontSize:12, cursor:"pointer" }}>✕</button>
                      </div>
                    )}
                  </div>
                </div>

                {mode === "single" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="https://www.g2.com/products/..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && analyzeSingle()}
                      style={{
                        flex: 1, padding: "11px 14px", borderRadius: 8,
                        border: "1px solid #e8e8e5", background: "#fafaf9",
                        color: "#111110", fontSize: 13,
                        fontFamily: "'Geist Mono', monospace",
                      }}
                    />
                    <button className="analyze-btn" onClick={analyzeSingle} disabled={loading} style={{
                      padding: "11px 22px", borderRadius: 8, border: "none",
                      background: "#1a1a1a", color: "white", fontSize: 13, fontWeight: 600,
                      cursor: "pointer", fontFamily: "'Geist', sans-serif", whiteSpace: "nowrap",
                    }}>
                      Analyze →
                    </button>
                  </div>
                )}

                {mode === "batch" && (
                  <div>
                    <textarea
                      className="input-field"
                      placeholder={"https://www.trustpilot.com/review/notion.so\nhttps://www.g2.com/products/notion/reviews\nhttps://www.capterra.com/p/notion/reviews/"}
                      value={batchUrls}
                      onChange={(e) => setBatchUrls(e.target.value)}
                      rows={5}
                      style={{
                        width: "100%", padding: "11px 14px", borderRadius: 8,
                        border: "1px solid #e8e8e5", background: "#fafaf9",
                        color: "#111110", fontSize: 13,
                        fontFamily: "'Geist Mono', monospace", resize: "vertical", lineHeight: 1.7,
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: "#a8a89e", fontFamily: "'Geist Mono', monospace" }}>
                        {batchUrls.split("\n").filter((u) => u.trim()).length} URLs
                      </span>
                      <button className="analyze-btn" onClick={analyzeBatch} disabled={loading} style={{
                        padding: "9px 18px", borderRadius: 8, border: "none",
                        background: "#1a1a1a", color: "white", fontSize: 13, fontWeight: 600,
                        cursor: "pointer", fontFamily: "'Geist', sans-serif",
                      }}>
                        Analyze All →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats bar */}
            <div style={{
              display: "flex", justifyContent: "center", gap: 64,
              padding: "28px 48px", marginTop: 64,
              background: "#f4f4f2", borderTop: "1px solid #e8e8e5", borderBottom: "1px solid #e8e8e5",
            }}>
              {[["10+", "Sources supported"], ["<30s", "Per analysis"], ["8", "Intelligence signals"], ["100%", "Brief-ready output"]].map(([num, label]) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 24, fontWeight: 700, color: "#111110" }}>{num}</div>
                  <div style={{ fontSize: 12, color: "#a8a89e", marginTop: 2, fontFamily: "'Geist Mono', monospace" }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "1px solid #e8e8e5" }} />

            {/* How it works */}
            <div style={{ maxWidth: 960, margin: "0 auto", padding: "88px 24px" }}>
              <div style={{ textAlign: "center", marginBottom: 48 }}>
                <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>How it works</div>
                <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 700, color: "#111110", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                  From raw URLs to a client brief<br />in three steps
                </h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1px", background: "#e8e8e5", borderRadius: 12, overflow: "hidden", border: "1px solid #e8e8e5" }}>
                {[
                  { num: "01", icon: "⌘", title: "Paste your URLs", desc: "Drop in links from G2, Trustpilot, Capterra, or any review platform. Single URL or batch up to 10 at once." },
                  { num: "02", icon: "◈", title: "AI reads everything", desc: "Claude extracts and classifies every review — themes, sentiment per theme, pain points, praise, and competitor mentions." },
                  { num: "03", icon: "◎", title: "Get structured intelligence", desc: "A brief-ready summary, key quotes, and a dashboard your stakeholders can actually act on." },
                ].map((item) => (
                  <div key={item.num} className="step-card" style={{ background: "white", padding: "32px 28px" }}>
                    <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#a8a89e", marginBottom: 16 }}>{item.num}</div>
                    <div style={{ fontSize: 22, marginBottom: 14 }}>{item.icon}</div>
                    <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 16, fontWeight: 700, color: "#111110", marginBottom: 8 }}>{item.title}</div>
                    <p style={{ fontSize: 14, color: "#6b6b63", lineHeight: 1.7 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e8e8e5" }} />

            {/* Sample output */}
            <div style={{ maxWidth: 960, margin: "0 auto", padding: "88px 24px" }}>
              <div style={{ textAlign: "center", marginBottom: 48 }}>
                <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Sample output</div>
                <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 700, color: "#111110", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                  This is what you get back
                </h2>
              </div>
              <div style={{ background: "white", border: "1px solid #e8e8e5", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05)" }}>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid #e8e8e5", background: "#f4f4f2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: "#a8a89e" }}>yelp.com/biz/regional-medical-center</span>
                  <span style={{ padding: "2px 8px", background: "#eff6ff", borderRadius: 4, fontFamily: "'Geist Mono', monospace", fontSize: 10, color: "#2563eb", letterSpacing: "0.05em", textTransform: "uppercase" }}>Example</span>
                </div>
                <div style={{ padding: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 26 }}>🟡</span>
                    <div>
                      <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 18, fontWeight: 700, color: "#d97706" }}>Mixed — 4/10</div>
                      <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#a8a89e", marginTop: 2 }}>yelp · confidence: high</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: "#6b6b63", lineHeight: 1.75, marginBottom: 20 }}>{MOCK_RESULT.summary}</p>
                  <div style={{ padding: 16, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, marginBottom: 20 }}>
                    <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Key Quote</div>
                    <p style={{ margin: 0, fontStyle: "italic", color: "#78350f", fontSize: 14 }}>"{MOCK_RESULT.key_quote}"</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
                    <div>
                      <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Pain Points</div>
                      {MOCK_RESULT.pain_points.map((p, i) => <div key={i} style={{ fontSize: 13, color: "#6b6b63", lineHeight: 1.75, paddingLeft: 12, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "#a8a89e" }}>–</span>{p}</div>)}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Praise</div>
                      {MOCK_RESULT.praise_points.map((p, i) => <div key={i} style={{ fontSize: 13, color: "#6b6b63", lineHeight: 1.75, paddingLeft: 12, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "#a8a89e" }}>–</span>{p}</div>)}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Competitors</div>
                      <div>{MOCK_RESULT.competitor_mentions.map((c, i) => <Tag key={i}>{c}</Tag>)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e8e8e5" }} />

            {/* Who it's for */}
            <div style={{ maxWidth: 960, margin: "0 auto", padding: "88px 24px" }}>
              <div style={{ textAlign: "center", marginBottom: 48 }}>
                <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Who it's for</div>
                <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 700, color: "#111110", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                  Built for people who turn<br />data into decisions
                </h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {[
                  {
                    icon: "🏢", title: "Agency Consultants",
                    desc: "Deliver competitive intelligence briefs to clients in hours, not days. Replace manual review reading with structured AI output you can brand and present.",
                    points: ["Run reports across multiple clients", "Brief-ready summaries out of the box", "Surface competitor mentions automatically", "Organize by project per client"],
                  },
                  {
                    icon: "⚙️", title: "Product Teams",
                    desc: "Stop guessing what users want. Mine review sites for feature requests, pain points, and competitor comparisons — automatically structured for your next sprint.",
                    points: ["Extract feature requests from hundreds of reviews", "Track sentiment shifts over time", "Know which competitors are mentioned and why", "Per-theme sentiment breakdowns"],
                  },
                ].map((buyer) => (
                  <div key={buyer.title} className="buyer-card" style={{ background: "white", border: "1px solid #e8e8e5", borderRadius: 16, padding: 36, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize: 26, marginBottom: 16 }}>{buyer.icon}</div>
                    <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 20, fontWeight: 700, color: "#111110", marginBottom: 10 }}>{buyer.title}</div>
                    <p style={{ fontSize: 14, color: "#6b6b63", lineHeight: 1.75, marginBottom: 20 }}>{buyer.desc}</p>
                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                      {buyer.points.map((point, i) => (
                        <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14, color: "#6b6b63" }}>
                          <span style={{ color: "#2563eb", marginTop: 1, flexShrink: 0, fontWeight: 600 }}>✓</span>{point}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e8e8e5" }} />

            {/* CTA */}
            <div style={{ maxWidth: 680, margin: "0 auto", padding: "88px 24px 100px" }}>
              <div style={{ background: "#1a1a1a", borderRadius: 20, padding: "64px 48px", textAlign: "center" }}>
                <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: "clamp(26px, 3vw, 36px)", fontWeight: 700, color: "white", marginBottom: 14, letterSpacing: "-0.02em" }}>
                  Ready to try it?
                </h2>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", marginBottom: 28, lineHeight: 1.7 }}>
                  Paste your first URL and see structured intelligence in under 30 seconds. No setup required.
                </p>
                <button className="cta-btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{
                  padding: "13px 32px", background: "white", color: "#1a1a1a",
                  border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'Geist', sans-serif",
                }}>
                  Analyze a URL →
                </button>
              </div>
            </div>
          </>
        )}

        {/* Results view */}
        {(hasResults || loading) && (
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>

            <div style={{ display: "flex", gap: 2, marginBottom: 16, background: "#f4f4f2", padding: 3, borderRadius: 8, border: "1px solid #e8e8e5", width: "fit-content" }}>
              {["single", "batch"].map((m) => (
                <button key={m} className="mode-btn" onClick={() => setMode(m)} style={{
                  padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                  background: mode === m ? "white" : "transparent",
                  color: mode === m ? "#111110" : "#a8a89e",
                  fontWeight: 500, fontSize: 12, fontFamily: "'Geist', sans-serif",
                  boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}>
                  {m === "single" ? "Single URL" : "Batch"}
                </button>
              ))}
            </div>

            {mode === "single" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                <input className="input-field" type="text" placeholder="https://www.g2.com/products/..." value={url}
                  onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyzeSingle()}
                  style={{ flex: 1, padding: "11px 14px", borderRadius: 8, border: "1px solid #e8e8e5", background: "#fafaf9", color: "#111110", fontSize: 13, fontFamily: "'Geist Mono', monospace" }}
                />
                <button className="analyze-btn" onClick={analyzeSingle} disabled={loading} style={{ padding: "11px 22px", borderRadius: 8, border: "none", background: "#1a1a1a", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Geist', sans-serif" }}>
                  Analyze →
                </button>
              </div>
            )}

            {mode === "batch" && (
              <div style={{ marginBottom: 24 }}>
                <textarea className="input-field" placeholder="One URL per line..." value={batchUrls} onChange={(e) => setBatchUrls(e.target.value)} rows={4}
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid #e8e8e5", background: "#fafaf9", color: "#111110", fontSize: 13, fontFamily: "'Geist Mono', monospace", resize: "vertical", lineHeight: 1.7 }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button className="analyze-btn" onClick={analyzeBatch} disabled={loading} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#1a1a1a", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Geist', sans-serif" }}>
                    Analyze All →
                  </button>
                </div>
              </div>
            )}

            {error && <div style={{ padding: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#b91c1c", marginBottom: 24, fontSize: 14 }}>{error}</div>}

            {loading && (
              <div style={{ textAlign: "center", padding: 64 }}>
                <div style={{ fontSize: 13, fontFamily: "'Geist Mono', monospace", color: "#2563eb", marginBottom: 8 }}>analyzing...</div>
                <p style={{ color: "#a8a89e", fontSize: 14 }}>{progress || "Scraping and analyzing — about 15 seconds"}</p>
              </div>
            )}

            {batchResults && (
              <div>
                <BatchSummary results={batchResults} />
                <a href={`/dashboard${selectedClientId ? `?client_id=${selectedClientId}` : ""}`} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", background:"#1a1a1a", borderRadius:10, textDecoration:"none", marginBottom:16 }}>
                  <div>
                    <div style={{ color:"white", fontWeight:600, fontSize:14, fontFamily:"'Geist', sans-serif" }}>View in Dashboard →</div>
                    <div style={{ color:"rgba(255,255,255,0.45)", fontSize:12, fontFamily:"'Geist Mono', monospace", marginTop:2 }}>See all {batchResults.length} analyses alongside your data</div>
                  </div>
                  <span style={{ color:"rgba(255,255,255,0.3)", fontSize:20 }}>↗</span>
                </a>
                <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 12, color: "#a8a89e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Individual Results</div>
                {batchResults.map((r, i) => <ResultCard key={i} result={r} />)}
              </div>
            )}

            {result && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <a href={`/dashboard${selectedClientId ? `?client_id=${selectedClientId}` : ""}`} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", background:"#1a1a1a", borderRadius:10, textDecoration:"none", marginBottom:4 }}>
                  <div>
                    <div style={{ color:"white", fontWeight:600, fontSize:14, fontFamily:"'Geist', sans-serif" }}>View in Dashboard →</div>
                    <div style={{ color:"rgba(255,255,255,0.45)", fontSize:12, fontFamily:"'Geist Mono', monospace", marginTop:2 }}>See this analysis alongside all your data</div>
                  </div>
                  <span style={{ color:"rgba(255,255,255,0.3)", fontSize:20 }}>↗</span>
                </a>
                <div style={{ padding: 24, background: "white", borderRadius: 16, border: "1px solid #e8e8e5", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 26 }}>{sentimentEmoji[result.overall_sentiment]}</span>
                    <div>
                      <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 18, fontWeight: 700, textTransform: "capitalize", color: sentimentColor[result.overall_sentiment] }}>
                        {result.overall_sentiment} — {result.sentiment_score}/10
                      </div>
                      <div style={{ fontFamily: "'Geist Mono', monospace", color: "#a8a89e", fontSize: 11, marginTop: 2 }}>{result.source_type} · confidence: {result.confidence}</div>
                    </div>
                  </div>
                  <p style={{ color: "#6b6b63", lineHeight: 1.75, margin: 0, fontSize: 14 }}>{result.summary}</p>
                </div>
                <div style={{ padding: 18, background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a" }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 11, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Key Quote</div>
                  <p style={{ margin: 0, fontStyle: "italic", color: "#78350f", fontSize: 14 }}>"{result.key_quote}"</p>
                </div>
                {result.themes?.length > 0 && (
                  <div style={{ padding: 18, background: "white", borderRadius: 10, border: "1px solid #e8e8e5" }}>
                    <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 11, color: "#a8a89e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Themes</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {result.themes.map((theme) => (
                        <span key={theme} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, background: "#f4f4f2", color: "#6b6b63", border: "1px solid #e8e8e5" }}>
                          {sentimentEmoji[result.sentiment_per_theme?.[theme]]} {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {result.pain_points?.length > 0 && (
                    <div style={{ padding: 18, background: "#fef2f2", borderRadius: 10, border: "1px solid #fecaca" }}>
                      <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 11, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pain Points</div>
                      <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 5 }}>
                        {result.pain_points.map((p, i) => <li key={i} style={{ color: "#b91c1c", fontSize: 13 }}>{p}</li>)}
                      </ul>
                    </div>
                  )}
                  {result.praise_points?.length > 0 && (
                    <div style={{ padding: 18, background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
                      <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 11, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.06em" }}>Praise</div>
                      <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 5 }}>
                        {result.praise_points.map((p, i) => <li key={i} style={{ color: "#15803d", fontSize: 13 }}>{p}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {result.competitor_mentions?.length > 0 && (
                    <div style={{ padding: 18, background: "white", borderRadius: 10, border: "1px solid #e8e8e5" }}>
                      <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 11, color: "#a8a89e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Competitors</div>
                      <div style={{ display: "flex", flexWrap: "wrap" }}>
                        {result.competitor_mentions.map((c, i) => <Tag key={i}>{c}</Tag>)}
                      </div>
                    </div>
                  )}
                  {result.feature_requests?.length > 0 && (
                    <div style={{ padding: 18, background: "white", borderRadius: 10, border: "1px solid #e8e8e5" }}>
                      <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 11, color: "#a8a89e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Feature Requests</div>
                      <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 5 }}>
                        {result.feature_requests.map((f, i) => <li key={i} style={{ fontSize: 13, color: "#6b6b63" }}>{f}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}