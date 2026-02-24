"use client";
import { useState, useEffect } from "react";

const sentimentColor = {
  positive: "#22c55e",
  negative: "#ef4444",
  mixed: "#f59e0b",
  neutral: "#94a3b8",
};

const sentimentEmoji = {
  positive: "🟢",
  negative: "🔴",
  mixed: "🟡",
  neutral: "⚪",
};

function ResultCard({ result }) {
  const [expanded, setExpanded] = useState(false);
  if (result.error) {
    return (
      <div style={{ padding: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>Failed</div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 4 }}>{result.url}</div>
        <div style={{ fontSize: 13, color: "#fca5a5" }}>{result.error}</div>
      </div>
    );
  }
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, marginBottom: 12, overflow: "hidden", background: "rgba(255,255,255,0.03)" }}>
      <div onClick={() => setExpanded(!expanded)} style={{ padding: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20 }}>{sentimentEmoji[result.overall_sentiment]}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: sentimentColor[result.overall_sentiment], textTransform: "capitalize" }}>
            {result.overall_sentiment} — {result.sentiment_score}/10
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{result.url}</div>
        </div>
        <span style={{ color: "#334155", fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.7, fontSize: 14 }}>{result.summary}</p>
          <div style={{ padding: 12, background: "rgba(251,191,36,0.06)", borderRadius: 8, border: "1px solid rgba(251,191,36,0.15)" }}>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.05em" }}>Key Quote</div>
            <p style={{ margin: 0, fontStyle: "italic", color: "#e2e8f0", fontSize: 13 }}>"{result.key_quote}"</p>
          </div>
          {result.themes && result.themes.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Themes</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.themes.map((theme) => (
                  <span key={theme} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, background: "rgba(255,255,255,0.06)", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {sentimentEmoji[result.sentiment_per_theme && result.sentiment_per_theme[theme]]} {theme}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {result.pain_points && result.pain_points.length > 0 && (
              <div style={{ padding: 12, background: "rgba(239,68,68,0.06)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.15)" }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 12, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pain Points</div>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                  {result.pain_points.map((p, i) => <li key={i} style={{ color: "#fca5a5", fontSize: 13 }}>{p}</li>)}
                </ul>
              </div>
            )}
            {result.praise_points && result.praise_points.length > 0 && (
              <div style={{ padding: 12, background: "rgba(34,197,94,0.06)", borderRadius: 8, border: "1px solid rgba(34,197,94,0.15)" }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 12, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.05em" }}>Praise Points</div>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                  {result.praise_points.map((p, i) => <li key={i} style={{ color: "#86efac", fontSize: 13 }}>{p}</li>)}
                </ul>
              </div>
            )}
          </div>
          {result.competitor_mentions && result.competitor_mentions.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Competitors</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.competitor_mentions.map((c, i) => (
                  <span key={i} style={{ padding: "3px 10px", background: "rgba(99,102,241,0.1)", borderRadius: 20, fontSize: 12, color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.2)" }}>{c}</span>
                ))}
              </div>
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
    <div style={{ padding: 24, background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 24 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: "#e2e8f0" }}>Batch Summary — {successful.length} sources analyzed</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <div style={{ padding: 16, background: "rgba(99,102,241,0.1)", borderRadius: 10, textAlign: "center", border: "1px solid rgba(99,102,241,0.2)" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#818cf8" }}>{avgScore}</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Avg Score</div>
        </div>
        {Object.entries(sentimentCounts).map(([sentiment, count]) => (
          <div key={sentiment} style={{ padding: 16, background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: sentimentColor[sentiment] }}>{count}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, textTransform: "capitalize" }}>{sentiment}</div>
          </div>
        ))}
      </div>
      {allCompetitors.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Competitors Surfaced</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {allCompetitors.map((c, i) => (
              <span key={i} style={{ padding: "3px 12px", background: "rgba(99,102,241,0.1)", borderRadius: 20, fontSize: 12, color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.2)" }}>{c}</span>
            ))}
          </div>
        </div>
      )}
      {allPainPoints.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Top Pain Points</div>
          <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
            {allPainPoints.map((p, i) => <li key={i} style={{ fontSize: 13, color: "#94a3b8" }}>{p}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

const MOCK_RESULT = {
  url: "trustpilot.com/review/notion.so",
  source_type: "trustpilot",
  overall_sentiment: "mixed",
  sentiment_score: 6,
  confidence: "high",
  summary: "Notion users praise its flexibility and all-in-one workspace but consistently report a steep learning curve and sluggish mobile performance. Long-term users remain loyal while new users cite onboarding friction as a key frustration.",
  key_quote: "Incredibly powerful once you learn it — but that learning curve is a real barrier.",
  themes: ["onboarding", "mobile performance", "pricing", "collaboration"],
  sentiment_per_theme: { onboarding: "negative", "mobile performance": "negative", pricing: "positive", collaboration: "positive" },
  pain_points: ["Steep learning curve for new users", "Mobile app feels sluggish", "Database features confusing without tutorials"],
  praise_points: ["Highly flexible workspace", "Great for team wikis and docs", "Reasonable pricing for what you get"],
  competitor_mentions: ["Confluence", "Airtable", "Coda", "Obsidian"],
  feature_requests: ["Better mobile experience", "Simpler onboarding templates", "Offline mode improvements"],
};

export default function Home() {
  const [mode, setMode] = useState("single");
  const [url, setUrl] = useState("");
  const [batchUrls, setBatchUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  async function analyzeSingle() {
    if (!url) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
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
      const res = await fetch("/api/analyze", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls }) });
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #080c14; }
        .fade-in { opacity: 0; transform: translateY(16px); animation: fadeUp 0.6s ease forwards; }
        .fade-in-1 { animation-delay: 0.05s; }
        .fade-in-2 { animation-delay: 0.15s; }
        .fade-in-3 { animation-delay: 0.28s; }
        .fade-in-4 { animation-delay: 0.4s; }
        .fade-in-5 { animation-delay: 0.52s; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
        .input-field { transition: all 0.15s ease; }
        .input-field:focus { outline: none; border-color: rgba(99,102,241,0.5) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .analyze-btn { transition: all 0.15s ease; }
        .analyze-btn:hover:not(:disabled) { background: #4f46e5 !important; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(99,102,241,0.3); }
        .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .mode-btn { transition: all 0.15s ease; }
        .grid-bg {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 0;
          background-image: linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .glow { position: fixed; top: -200px; left: 50%; transform: translateX(-50%); width: 700px; height: 500px; background: radial-gradient(ellipse, rgba(99,102,241,0.1) 0%, transparent 70%); pointer-events: none; z-index: 0; }
        .badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 14px; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25); border-radius: 20px; font-size: 12px; color: #a5b4fc; font-family: 'DM Mono', monospace; }
        .badge-dot { width: 6px; height: 6px; background: #6366f1; border-radius: 50%; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .source-pill { display: inline-flex; align-items: center; padding: 4px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 20px; font-size: 12px; color: #94a3b8; font-family: 'DM Mono', monospace; transition: all 0.15s; }
        .source-pill:hover { background: rgba(255,255,255,0.08); color: #cbd5e1; }
        .arrow-svg { animation: bounce 1.8s ease-in-out infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(6px); } }
        .how-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 28px; transition: all 0.2s; }
        .how-card:hover { background: rgba(99,102,241,0.05); border-color: rgba(99,102,241,0.2); transform: translateY(-2px); }
        .buyer-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 32px; }
        .divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 0; }
        .mock-tag { display: inline-block; padding: 2px 8px; background: rgba(99,102,241,0.15); border-radius: 4px; font-size: 10px; color: #818cf8; font-family: 'DM Mono', monospace; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px; }
      `}</style>

      <div className="grid-bg" />
      <div className="glow" />

      <div style={{ position: "relative", zIndex: 1, fontFamily: "'DM Sans', sans-serif", color: "#e2e8f0" }}>

        {/* Nav */}
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>◈</div>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", color: "#f1f5f9" }}>Pulse</span>
          </div>
          <a href="/dashboard" style={{ padding: "8px 16px", background: "rgba(255,255,255,0.06)", color: "#94a3b8", borderRadius: 8, textDecoration: "none", fontWeight: 500, fontSize: 13, border: "1px solid rgba(255,255,255,0.08)" }}>
            Dashboard →
          </a>
        </nav>

        {/* Hero */}
        {!hasResults && !loading && (
          <>
            <div style={{ maxWidth: 680, margin: "0 auto", padding: "72px 24px 0", textAlign: "center" }}>

              <div className="fade-in fade-in-1" style={{ marginBottom: 20 }}>
                <span className="badge"><span className="badge-dot" />Powered by Claude AI</span>
              </div>

              <h1 className="fade-in fade-in-2" style={{
                fontSize: "clamp(38px, 5.5vw, 60px)", fontFamily: "'DM Serif Display', serif",
                fontWeight: 400, lineHeight: 1.08, letterSpacing: "-0.02em", color: "#f8fafc", marginBottom: 20,
              }}>
                Turn reviews into<br /><em style={{ color: "#818cf8" }}>structured intelligence</em>
              </h1>

              <p className="fade-in fade-in-3" style={{ fontSize: 16, color: "#f1f5f9", lineHeight: 1.75, marginBottom: 32, maxWidth: 480, margin: "0 auto 32px" }}>
                Paste URLs from review sites. Get back competitor mentions, sentiment by theme, pain points, and a brief-ready summary — in seconds.
              </p>

              {/* Source Pills */}
              <div className="fade-in fade-in-4" style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
                {["G2", "Trustpilot", "Capterra", "Product Hunt", "App Store"].map((s) => (
                  <span key={s} className="source-pill">{s}</span>
                ))}
              </div>

              {/* Arrow */}
              <div className="fade-in fade-in-5" style={{ marginBottom: 16 }}>
                <svg className="arrow-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto", display: "block", opacity: 0.4 }}>
                  <path d="M12 5v14M5 12l7 7 7-7" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Analyzer Card */}
            <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 80px" }}>
              <div className="fade-in fade-in-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, padding: 24 }}>

                {/* Mode Toggle */}
                <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "rgba(0,0,0,0.3)", padding: 4, borderRadius: 10, width: "fit-content" }}>
                  {["single", "batch"].map((m) => (
                    <button key={m} className="mode-btn" onClick={() => setMode(m)} style={{
                      padding: "6px 16px", borderRadius: 7, border: "none", cursor: "pointer",
                      background: mode === m ? "rgba(99,102,241,0.25)" : "transparent",
                      color: mode === m ? "#a5b4fc" : "#475569",
                      fontWeight: 500, fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                    }}>
                      {m === "single" ? "Single URL" : "Batch"}
                    </button>
                  ))}
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
                        flex: 1, padding: "12px 16px", borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(0,0,0,0.3)", color: "#e2e8f0", fontSize: 14,
                        fontFamily: "'DM Mono', monospace",
                      }}
                    />
                    <button className="analyze-btn" onClick={analyzeSingle} disabled={loading} style={{
                      padding: "12px 24px", borderRadius: 10, border: "none",
                      background: "#6366f1", color: "white", fontSize: 14, fontWeight: 600,
                      cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
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
                        width: "100%", padding: "12px 16px", borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(0,0,0,0.3)", color: "#e2e8f0", fontSize: 13,
                        fontFamily: "'DM Mono', monospace", resize: "vertical", lineHeight: 1.7,
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: "#334155", fontFamily: "'DM Mono', monospace" }}>
                        {batchUrls.split("\n").filter((u) => u.trim()).length} URLs
                      </span>
                      <button className="analyze-btn" onClick={analyzeBatch} disabled={loading} style={{
                        padding: "10px 20px", borderRadius: 10, border: "none",
                        background: "#6366f1", color: "white", fontSize: 14, fontWeight: 600,
                        cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      }}>
                        Analyze All →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <hr className="divider" />

            {/* How it works */}
            <div style={{ maxWidth: 860, margin: "0 auto", padding: "80px 24px" }}>
              <div style={{ textAlign: "center", marginBottom: 48 }}>
                <div style={{ fontSize: 11, color: "#6366f1", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>How it works</div>
                <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontFamily: "'DM Serif Display', serif", fontWeight: 400, color: "#f1f5f9", lineHeight: 1.2 }}>
                  From raw URLs to a client brief<br />in three steps
                </h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[
                  { step: "01", title: "Paste your URLs", desc: "Drop in links from G2, Trustpilot, Capterra, or any review platform. Single URL or batch up to 10 at once.", icon: "⌘" },
                  { step: "02", title: "AI reads everything", desc: "Claude extracts and classifies every review — themes, sentiment per theme, pain points, praise, and competitor mentions.", icon: "◈" },
                  { step: "03", title: "Get structured intelligence", desc: "A brief-ready summary, key quotes, and a dashboard view your stakeholders can actually act on.", icon: "◎" },
                ].map((item) => (
                  <div key={item.step} className="how-card">
                    <div style={{ fontSize: 24, marginBottom: 16, color: "#6366f1" }}>{item.icon}</div>
                    <div style={{ fontSize: 11, color: "#6366f1", fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>{item.step}</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#f1f5f9", marginBottom: 8 }}>{item.title}</div>
                    <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <hr className="divider" />

            {/* Sample Output */}
            <div style={{ maxWidth: 860, margin: "0 auto", padding: "80px 24px" }}>
              <div style={{ textAlign: "center", marginBottom: 48 }}>
                <div style={{ fontSize: 11, color: "#6366f1", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Sample output</div>
                <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontFamily: "'DM Serif Display', serif", fontWeight: 400, color: "#f1f5f9", lineHeight: 1.2 }}>
                  This is what you get back
                </h2>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28, position: "relative" }}>
                <div className="mock-tag">Example output</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: 28 }}>🟡</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>Mixed — 6/10</div>
                    <div style={{ fontSize: 12, color: "#475569", fontFamily: "'DM Mono', monospace" }}>trustpilot · confidence: high</div>
                  </div>
                </div>
                <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>{MOCK_RESULT.summary}</p>
                <div style={{ padding: 16, background: "rgba(251,191,36,0.06)", borderRadius: 10, border: "1px solid rgba(251,191,36,0.15)", marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: "#fbbf24", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Key Quote</div>
                  <p style={{ margin: 0, fontStyle: "italic", color: "#e2e8f0", fontSize: 14 }}>"{MOCK_RESULT.key_quote}"</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#f87171", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Pain Points</div>
                    <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                      {MOCK_RESULT.pain_points.map((p, i) => <li key={i} style={{ color: "#fca5a5", fontSize: 13 }}>{p}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#4ade80", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Praise</div>
                    <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                      {MOCK_RESULT.praise_points.map((p, i) => <li key={i} style={{ color: "#86efac", fontSize: 13 }}>{p}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#a5b4fc", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Competitors</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {MOCK_RESULT.competitor_mentions.map((c, i) => (
                        <span key={i} style={{ padding: "3px 10px", background: "rgba(99,102,241,0.1)", borderRadius: 20, fontSize: 12, color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.2)" }}>{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <hr className="divider" />

            {/* Who it's for */}
            <div style={{ maxWidth: 860, margin: "0 auto", padding: "80px 24px" }}>
              <div style={{ textAlign: "center", marginBottom: 48 }}>
                <div style={{ fontSize: 11, color: "#6366f1", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Who it's for</div>
                <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontFamily: "'DM Serif Display', serif", fontWeight: 400, color: "#f1f5f9", lineHeight: 1.2 }}>
                  Built for the people who<br />turn data into decisions
                </h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="buyer-card">
                  <div style={{ fontSize: 28, marginBottom: 16 }}>🏢</div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: "#f1f5f9", marginBottom: 8 }}>Agency Consultants</div>
                  <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>Deliver competitive intelligence briefs to clients in hours, not days. Replace manual review reading with structured AI output you can brand and present.</p>
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                    {["Run reports across multiple clients from one tool", "Get brief-ready summaries out of the box", "Surface competitor mentions automatically", "Organize by project per client"].map((item, i) => (
                      <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14, color: "#94a3b8" }}>
                        <span style={{ color: "#6366f1", marginTop: 1 }}>✓</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="buyer-card">
                  <div style={{ fontSize: 28, marginBottom: 16 }}>⚙️</div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: "#f1f5f9", marginBottom: 8 }}>Product Teams</div>
                  <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>Stop guessing what users want. Mine review sites for feature requests, pain points, and competitor comparisons — automatically structured for your next sprint.</p>
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                    {["Extract feature requests from hundreds of reviews", "Track sentiment shifts over time", "Know which competitors are being mentioned and why", "Get per-theme sentiment breakdowns"].map((item, i) => (
                      <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14, color: "#94a3b8" }}>
                        <span style={{ color: "#6366f1", marginTop: 1 }}>✓</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 100px", textAlign: "center" }}>
              <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 24, padding: "56px 40px" }}>
                <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontFamily: "'DM Serif Display', serif", fontWeight: 400, color: "#f1f5f9", lineHeight: 1.2, marginBottom: 16 }}>
                  Ready to try it?
                </h2>
                <p style={{ color: "#64748b", fontSize: 15, marginBottom: 28 }}>Paste your first URL above and see structured intelligence in under 30 seconds.</p>
                <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{
                  padding: "14px 32px", background: "#6366f1", color: "white", border: "none",
                  borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                }}>
                  Analyze a URL →
                </button>
              </div>
            </div>
          </>
        )}

        {/* Analyzer (results mode) */}
        {(hasResults || loading) && (
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>

            <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "rgba(0,0,0,0.3)", padding: 4, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", width: "fit-content" }}>
              {["single", "batch"].map((m) => (
                <button key={m} className="mode-btn" onClick={() => setMode(m)} style={{
                  padding: "6px 16px", borderRadius: 7, border: "none", cursor: "pointer",
                  background: mode === m ? "rgba(99,102,241,0.25)" : "transparent",
                  color: mode === m ? "#a5b4fc" : "#475569",
                  fontWeight: 500, fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                }}>
                  {m === "single" ? "Single URL" : "Batch"}
                </button>
              ))}
            </div>

            {mode === "single" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                <input className="input-field" type="text" placeholder="https://www.g2.com/products/..." value={url}
                  onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyzeSingle()}
                  style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "#e2e8f0", fontSize: 14, fontFamily: "'DM Mono', monospace" }}
                />
                <button className="analyze-btn" onClick={analyzeSingle} disabled={loading} style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: "#6366f1", color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  Analyze →
                </button>
              </div>
            )}

            {mode === "batch" && (
              <div style={{ marginBottom: 24 }}>
                <textarea className="input-field" placeholder="One URL per line..." value={batchUrls} onChange={(e) => setBatchUrls(e.target.value)} rows={4}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "#e2e8f0", fontSize: 13, fontFamily: "'DM Mono', monospace", resize: "vertical", lineHeight: 1.7 }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button className="analyze-btn" onClick={analyzeBatch} disabled={loading} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#6366f1", color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    Analyze All →
                  </button>
                </div>
              </div>
            )}

            {error && <div style={{ padding: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "#fca5a5", marginBottom: 24, fontSize: 14 }}>{error}</div>}

            {loading && (
              <div style={{ textAlign: "center", padding: 64, color: "#334155" }}>
                <div style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: "#6366f1", marginBottom: 8 }}>◈ analyzing</div>
                <p style={{ color: "#475569", fontSize: 14 }}>{progress || "Scraping and analyzing — about 15 seconds"}</p>
              </div>
            )}

            {batchResults && (
              <div>
                <BatchSummary results={batchResults} />
                <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Individual Results</div>
                {batchResults.map((r, i) => <ResultCard key={i} result={r} />)}
              </div>
            )}

            {result && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ padding: 24, background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 28 }}>{sentimentEmoji[result.overall_sentiment]}</span>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, textTransform: "capitalize", color: sentimentColor[result.overall_sentiment] }}>{result.overall_sentiment} — {result.sentiment_score}/10</div>
                      <div style={{ color: "#475569", fontSize: 12, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{result.source_type} · confidence: {result.confidence}</div>
                    </div>
                  </div>
                  <p style={{ color: "#94a3b8", lineHeight: 1.7, margin: 0, fontSize: 14 }}>{result.summary}</p>
                </div>
                <div style={{ padding: 20, background: "rgba(251,191,36,0.06)", borderRadius: 12, border: "1px solid rgba(251,191,36,0.15)" }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 11, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.05em" }}>Key Quote</div>
                  <p style={{ margin: 0, fontStyle: "italic", color: "#e2e8f0", fontSize: 14 }}>"{result.key_quote}"</p>
                </div>
                {result.themes && result.themes.length > 0 && (
                  <div style={{ padding: 20, background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Themes</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {result.themes.map((theme) => (
                        <span key={theme} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, background: "rgba(255,255,255,0.06)", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.08)" }}>
                          {sentimentEmoji[result.sentiment_per_theme && result.sentiment_per_theme[theme]]} {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {result.pain_points && result.pain_points.length > 0 && (
                    <div style={{ padding: 20, background: "rgba(239,68,68,0.06)", borderRadius: 12, border: "1px solid rgba(239,68,68,0.15)" }}>
                      <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 11, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pain Points</div>
                      <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                        {result.pain_points.map((p, i) => <li key={i} style={{ color: "#fca5a5", fontSize: 13 }}>{p}</li>)}
                      </ul>
                    </div>
                  )}
                  {result.praise_points && result.praise_points.length > 0 && (
                    <div style={{ padding: 20, background: "rgba(34,197,94,0.06)", borderRadius: 12, border: "1px solid rgba(34,197,94,0.15)" }}>
                      <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 11, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.05em" }}>Praise Points</div>
                      <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                        {result.praise_points.map((p, i) => <li key={i} style={{ color: "#86efac", fontSize: 13 }}>{p}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {result.competitor_mentions && result.competitor_mentions.length > 0 && (
                    <div style={{ padding: 20, background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Competitors</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {result.competitor_mentions.map((c, i) => (
                          <span key={i} style={{ padding: "4px 12px", background: "rgba(99,102,241,0.1)", borderRadius: 20, fontSize: 12, color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.2)" }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.feature_requests && result.feature_requests.length > 0 && (
                    <div style={{ padding: 20, background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Feature Requests</div>
                      <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                        {result.feature_requests.map((f, i) => <li key={i} style={{ fontSize: 13, color: "#94a3b8" }}>{f}</li>)}
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