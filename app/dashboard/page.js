//v2
"use client";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const sentimentColor = {
  positive: "#16a34a",
  negative: "#dc2626",
  mixed: "#d97706",
  neutral: "#6b7280",
};

const C = {
  bg: "#fafaf9",
  bgCard: "#ffffff",
  bgMuted: "#f4f4f2",
  border: "#e8e8e5",
  blue: "#2563eb",
  textPrimary: "#111110",
  textSecondary: "#6b6b63",
  textDim: "#a8a89e",
};

async function fetchAnalyses() {
  const res = await fetch("/api/analyses");
  if (!res.ok) throw new Error("Failed to fetch");
  const text = await res.text();
  if (!text) return [];
  return JSON.parse(text);
}

export default function Dashboard() {
  const [analyses, setAnalyses] = useState([]);
  const [projectFilter, setProjectFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyses()
      .then((data) => setAnalyses(Array.isArray(data) ? data : []))
      .catch(() => setAnalyses([]))
      .finally(() => setLoading(false));
  }, []);

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap');
    * { box-sizing: border-box; }
    body { background: #fafaf9; margin: 0; }
    .nav-link:hover { border-color: #d0d0cb !important; color: #111110 !important; }
    .analyze-btn:hover { background: #333 !important; }
    .row-hover:hover { background: #f8f8f6 !important; }
  `;

  const projects = ["all", ...new Set(analyses.map((a) => a.project_name || "default").filter(Boolean))];
  const filtered = projectFilter === "all" ? analyses : analyses.filter((a) => (a.project_name || "default") === projectFilter);

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <Nav />
        <div style={{ textAlign: "center", padding: "80px 24px", fontFamily: "'Geist', sans-serif" }}>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: C.blue, marginBottom: 8 }}>loading...</div>
          <p style={{ color: C.textDim, fontSize: 14 }}>Fetching your analyses</p>
        </div>
      </>
    );
  }

  if (!analyses.length) {
    return (
      <>
        <style>{styles}</style>
        <Nav />
        <div style={{ maxWidth: 600, margin: "80px auto", textAlign: "center", padding: "0 24px", fontFamily: "'Geist', sans-serif" }}>
          <div style={{ padding: 48, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>📭</div>
            <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 22, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>No analyses yet</h2>
            <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: 24 }}>Analyze some URLs to see your intelligence dashboard.</p>
            <a href="/" style={{ padding: "10px 20px", background: C.textPrimary, color: "white", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 13, fontFamily: "'Geist', sans-serif" }}>
              Analyze URLs →
            </a>
          </div>
        </div>
      </>
    );
  }

  // Compute stats
  const avgScore = (filtered.reduce((sum, a) => sum + (a.sentiment_score || 0), 0) / analyses.length).toFixed(1);

  const sentimentCounts = filtered.reduce((acc, a) => {
    acc[a.overall_sentiment] = (acc[a.overall_sentiment] || 0) + 1;
    return acc;
  }, {});

  const sentimentPieData = Object.entries(sentimentCounts).map(([name, value]) => ({ name, value }));

  const sourceCounts = filtered.reduce((acc, a) => {
    const s = a.source_type || "other";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const sourceBarData = Object.entries(sourceCounts).map(([name, count]) => ({ name, count }));

  const allCompetitors = filtered
    .flatMap((a) => a.competitor_mentions || [])
    .reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {});

  const topCompetitors = Object.entries(allCompetitors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const allPainPoints = filtered.flatMap((a) => a.pain_points || []);
  const allPraisePoints = filtered.flatMap((a) => a.praise_points || []);

  const allThemes = filtered
    .flatMap((a) => a.themes || [])
    .reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});

  const topThemes = Object.entries(allThemes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  return (
    <>
      <style>{styles}</style>
      <Nav />

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 80px", fontFamily: "'Geist', sans-serif" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 30, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.02em", margin: 0 }}>
              Intelligence Dashboard
            </h1>
            <p style={{ color: C.textDim, margin: "6px 0 0", fontSize: 14, fontFamily: "'Geist Mono', monospace" }}>
              {filtered.length} analyses · {Object.keys(sourceCounts).length} sources
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="/upload" style={{ padding: "9px 18px", background: "white", color: C.textPrimary, border: "1px solid #e8e8e5", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 13, fontFamily: "'Geist', sans-serif" }}>
              CSV Upload
            </a>
            <a href="/" className="analyze-btn" style={{ padding: "9px 18px", background: C.textPrimary, color: "white", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 13 }}>
              + Analyze More
            </a>
          </div>
        </div>

        {/* Project filter */}
        {projects.length > 2 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
            {projects.map((p) => (
              <button key={p} onClick={() => setProjectFilter(p)} style={{
                padding: "6px 14px", borderRadius: 20,
                border: "1px solid " + (projectFilter === p ? C.blue : C.border),
                background: projectFilter === p ? "#eff6ff" : "white",
                color: projectFilter === p ? C.blue : C.textSecondary,
                fontSize: 12, fontWeight: 500, cursor: "pointer",
                fontFamily: "'Geist', sans-serif", transition: "all 0.15s",
              }}>
                {p === "all" ? "All projects" : p}
                {p !== "all" && (
                  <span style={{ marginLeft: 6, color: C.textDim, fontSize: 11 }}>
                    ({analyses.filter((a) => (a.project_name || "default") === p).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {projects.length <= 2 && <div style={{ marginBottom: 32 }} />}

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Avg Score", value: avgScore, color: C.blue },
            { label: "Positive", value: sentimentCounts.positive || 0, color: "#16a34a" },
            { label: "Mixed", value: sentimentCounts.mixed || 0, color: "#d97706" },
            { label: "Negative", value: sentimentCounts.negative || 0, color: "#dc2626" },
          ].map((kpi) => (
            <div key={kpi.label} style={{ padding: 20, background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 30, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
              <div style={{ fontSize: 12, color: C.textDim, marginTop: 4, fontFamily: "'Geist Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{ padding: 24, background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14, color: C.textPrimary }}>Sentiment Breakdown</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={sentimentPieData} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {sentimentPieData.map((entry) => (
                    <Cell key={entry.name} fill={sentimentColor[entry.name] || C.textDim} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontFamily: "'Geist', sans-serif", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ padding: 24, background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14, color: C.textPrimary }}>Top Themes</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topThemes} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: C.textSecondary, fontFamily: "'Geist', sans-serif" }} />
                <Tooltip contentStyle={{ fontFamily: "'Geist', sans-serif", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 8 }} />
                <Bar dataKey="count" fill={C.blue} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Competitors + Sources */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {topCompetitors.length > 0 && (
            <div style={{ padding: 24, background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14, color: C.textPrimary }}>Competitors Mentioned</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {topCompetitors.map(([name, count]) => (
                  <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: C.textSecondary }}>{name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.blue, background: "#eff6ff", padding: "2px 10px", borderRadius: 20, border: "1px solid #bfdbfe" }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: 24, background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14, color: C.textPrimary }}>Sources Analyzed</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={sourceBarData}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textSecondary, fontFamily: "'Geist', sans-serif" }} />
                <YAxis tick={{ fontSize: 11, fill: C.textSecondary }} />
                <Tooltip contentStyle={{ fontFamily: "'Geist', sans-serif", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 8 }} />
                <Bar dataKey="count" fill={C.blue} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pain Points + Praise */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{ padding: 24, background: "#fef2f2", borderRadius: 12, border: "1px solid #fecaca" }}>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14, color: "#b91c1c" }}>Top Pain Points</div>
            <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
              {allPainPoints.slice(0, 8).map((p, i) => (
                <li key={i} style={{ color: "#991b1b", fontSize: 13, lineHeight: 1.6 }}>{p}</li>
              ))}
            </ul>
          </div>
          <div style={{ padding: 24, background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0" }}>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14, color: "#15803d" }}>Top Praise Points</div>
            <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
              {allPraisePoints.slice(0, 8).map((p, i) => (
                <li key={i} style={{ color: "#166534", fontSize: 13, lineHeight: 1.6 }}>{p}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recent Analyses Table */}
        <div style={{ background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, background: C.bgMuted }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.textPrimary }}>Recent Analyses</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["URL", "Source", "Sentiment", "Score", "Date"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", color: C.textDim, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Geist Mono', monospace" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 15).map((a) => (
                <tr key={a.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.1s" }}>
                  <td style={{ padding: "12px 16px", maxWidth: 280 }}>
                    <a href={a.url} target="_blank" rel="noreferrer" style={{ color: C.blue, textDecoration: "none", fontSize: 12, fontFamily: "'Geist Mono', monospace" }}>
                      {a.url.replace("https://", "").slice(0, 45)}{a.url.length > 53 ? "..." : ""}
                    </a>
                  </td>
                  <td style={{ padding: "12px 16px", color: C.textDim, fontSize: 12, fontFamily: "'Geist Mono', monospace" }}>{a.source_type}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ color: sentimentColor[a.overall_sentiment], fontWeight: 600, textTransform: "capitalize", fontSize: 13 }}>
                      {a.overall_sentiment}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: C.textPrimary, fontFamily: "'Libre Baskerville', serif" }}>{a.sentiment_score}/10</td>
                  <td style={{ padding: "12px 16px", color: C.textDim, fontSize: 12, fontFamily: "'Geist Mono', monospace" }}>
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </>
  );
}

function Nav() {
  return (
    <nav style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 48px", borderBottom: "1px solid #e8e8e5",
      background: "rgba(250,250,249,0.95)", position: "sticky", top: 0, zIndex: 100,
      backdropFilter: "blur(8px)", fontFamily: "'Geist', sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 28, height: 28, background: "#1a1a1a", borderRadius: 7,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontSize: 13, fontWeight: 700,
          fontFamily: "'Libre Baskerville', serif",
        }}>P</div>
        <span style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em", color: "#111110" }}>Pulse</span>
      </div>
      <a href="/" className="nav-link" style={{
        padding: "7px 16px", border: "1px solid #e8e8e5", borderRadius: 8,
        color: "#6b6b63", fontSize: 13, fontWeight: 500, textDecoration: "none",
        transition: "all 0.15s",
      }}>← Analyzer</a>
    </nav>
  );
}