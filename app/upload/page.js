// v6
"use client";
import { useState, useRef } from "react";

const C = {
  bg: "#fafaf9",
  bgCard: "#ffffff",
  bgMuted: "#f4f4f2",
  border: "#e8e8e5",
  borderStrong: "#d0d0cb",
  blue: "#2563eb",
  textPrimary: "#111110",
  textSecondary: "#6b6b63",
  textDim: "#a8a89e",
};

// ─── CSV Parser ──────────────────────────────────────────────
function parseCSV(text) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  function parseAllRows(str) {
    const rows = []; let row = []; let current = ""; let inQuotes = false; let i = 0;
    while (i < str.length) {
      const ch = str[i];
      if (ch === '"') {
        if (inQuotes && str[i+1] === '"') { current += '"'; i += 2; continue; }
        inQuotes = !inQuotes; i++; continue;
      }
      if (ch === "," && !inQuotes) { row.push(current); current = ""; i++; continue; }
      if (ch === "\n" && !inQuotes) {
        row.push(current); current = "";
        if (row.some(c => c.trim())) rows.push(row);
        row = []; i++; continue;
      }
      current += ch; i++;
    }
    row.push(current);
    if (row.some(c => c.trim())) rows.push(row);
    return rows;
  }
  const allRows = parseAllRows(normalized);
  if (allRows.length < 2) return [];
  const headers = allRows[0].map(h => h.trim());
  return allRows.slice(1).map(values => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (values[idx] || "").trim(); });
    return obj;
  });
}

// ─── Pure Math Analytics ─────────────────────────────────────
function computeLocationStats(rows, groupByField) {
  const groups = {};

  rows.forEach(row => {
    // Dynamic: use whatever column the user picked
    const key = (row[groupByField] || "").trim() || "Unknown";
    if (key === "Unknown" || key === "") return;
    // Filter noise rows (long numeric IDs, corporate rollup)
    if (/^\d{5,}/.test(key) || key.toLowerCase().includes("corporate rollup")) return;

    if (!groups[key]) {
      groups[key] = {
        name: key,
        region: row["Region"] || "",
        division: row["Division"] || "",
        state: row["State"] || "",
        city: row["City"] || "",
        business: row["Business Name"] || "",
        rows: [],
        ratings: [],
        comments: [],
        sources: {},
        ratingDist: {0:0, 1:0, 2:0, 3:0, 4:0, 5:0},
      };
    }
    const g = groups[key];
    g.rows.push(row);
    const rating = parseFloat(row["Review Rating"]);
    if (!isNaN(rating)) {
      g.ratings.push(rating);
      const bucket = Math.round(Math.min(5, Math.max(0, rating)));
      g.ratingDist[bucket] = (g.ratingDist[bucket] || 0) + 1;
    }
    const comment = (row["Review Comment"] || "").trim();
    if (comment) g.comments.push({ text: comment, rating, date: row["Date Posted On"], source: row["Review Source"] });
    const src = row["Review Source"] || "Other";
    g.sources[src] = (g.sources[src] || 0) + 1;
  });

  // Compute derived stats
  return Object.values(groups).map(g => {
    const avg = g.ratings.length ? g.ratings.reduce((a,b) => a+b, 0) / g.ratings.length : null;
    const negative = g.ratings.filter(r => r <= 2).length;
    const positive = g.ratings.filter(r => r >= 4).length;
    const pctNegative = g.ratings.length ? Math.round((negative / g.ratings.length) * 100) : 0;
    const pctPositive = g.ratings.length ? Math.round((positive / g.ratings.length) * 100) : 0;
    // Health score 0-100: weighted avg + volume bonus
    const healthScore = avg !== null ? Math.round((avg / 5) * 85 + Math.min(15, g.ratings.length / 10)) : 0;
    return {
      ...g,
      avg: avg !== null ? Math.round(avg * 10) / 10 : null,
      total: g.rows.length,
      ratedCount: g.ratings.length,
      commentCount: g.comments.length,
      negative,
      positive,
      pctNegative,
      pctPositive,
      healthScore,
      topSource: Object.entries(g.sources).sort((a,b) => b[1]-a[1])[0]?.[0] || "",
    };
  }).sort((a, b) => (a.avg ?? 99) - (b.avg ?? 99));
}

// ─── Components ──────────────────────────────────────────────
function RatingBar({ dist, total }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {[5,4,3,2,1,0].map(star => {
        const count = dist[star] || 0;
        const pct = total ? Math.round((count/total)*100) : 0;
        const color = star >= 4 ? "#16a34a" : star >= 3 ? "#d97706" : "#dc2626";
        return (
          <div key={star} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: C.textDim, width: 12, textAlign: "right" }}>{star}★</span>
            <div style={{ flex: 1, height: 6, background: C.bgMuted, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 10, color: C.textDim, width: 28 }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function HealthBadge({ score }) {
  const color = score >= 75 ? "#16a34a" : score >= 55 ? "#d97706" : "#dc2626";
  const bg = score >= 75 ? "#f0fdf4" : score >= 55 ? "#fffbeb" : "#fef2f2";
  const border = score >= 75 ? "#bbf7d0" : score >= 55 ? "#fde68a" : "#fecaca";
  const label = score >= 75 ? "Healthy" : score >= 55 ? "Needs attention" : "Critical";
  return (
    <span style={{ padding: "2px 8px", background: bg, border: `1px solid ${border}`, borderRadius: 20, fontSize: 11, color, fontWeight: 600 }}>
      {label}
    </span>
  );
}

function LocationRow({ loc, onDeepDive, deepDiveResult, deepDiving }) {
  const [expanded, setExpanded] = useState(false);
  const scoreColor = loc.avg >= 4.5 ? "#16a34a" : loc.avg >= 3.5 ? "#d97706" : "#dc2626";

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
      {/* Row header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}
      >
        {/* Score */}
        <div style={{ textAlign: "center", minWidth: 48 }}>
          <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 20, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
            {loc.avg ?? "—"}
          </div>
          <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>/ 5.0</div>
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: C.textPrimary, marginBottom: 3 }}>{loc.name}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {loc.region && <span style={{ fontSize: 11, color: C.textDim, fontFamily: "monospace" }}>{loc.region}</span>}
            {loc.state && <span style={{ fontSize: 11, color: C.textDim, fontFamily: "monospace" }}>{loc.state}</span>}
            <span style={{ fontSize: 11, color: C.textDim, fontFamily: "monospace" }}>{loc.ratedCount} reviews</span>
            {loc.pctNegative > 0 && (
              <span style={{ fontSize: 11, color: "#dc2626", fontFamily: "monospace" }}>{loc.pctNegative}% negative</span>
            )}
          </div>
        </div>

        {/* Health badge */}
        <HealthBadge score={loc.healthScore} />

        {/* Deep dive button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDeepDive(loc); }}
          disabled={deepDiving}
          style={{
            padding: "6px 12px", borderRadius: 8,
            border: `1px solid ${deepDiveResult ? C.blue : C.border}`,
            background: deepDiveResult ? "#eff6ff" : "white",
            color: deepDiveResult ? C.blue : C.textSecondary,
            fontSize: 12, fontWeight: 500, cursor: deepDiving ? "wait" : "pointer",
            fontFamily: "'Geist', sans-serif", whiteSpace: "nowrap",
          }}
        >
          {deepDiving ? "analyzing..." : deepDiveResult ? "✓ AI Analysis" : "Deep Dive →"}
        </button>

        <span style={{ color: C.textDim, fontSize: 11 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Expanded stats */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {/* Rating distribution */}
          <div>
            <div style={{ fontSize: 11, color: C.textDim, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Rating distribution</div>
            <RatingBar dist={loc.ratingDist} total={loc.ratedCount} />
          </div>

          {/* Quick stats */}
          <div>
            <div style={{ fontSize: 11, color: C.textDim, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Stats</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                ["Total reviews", loc.total],
                ["With ratings", loc.ratedCount],
                ["With comments", loc.commentCount],
                ["5-star", loc.ratingDist[5] || 0],
                ["1-star or below", (loc.ratingDist[0]||0) + (loc.ratingDist[1]||0)],
                ["Top source", loc.topSource],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: C.textSecondary }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary, fontFamily: "monospace" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent comments preview */}
          <div>
            <div style={{ fontSize: 11, color: C.textDim, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Recent comments</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {loc.comments.slice(0, 3).map((c, i) => (
                <div key={i} style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.5, borderLeft: `2px solid ${C.border}`, paddingLeft: 8 }}>
                  {c.text.slice(0, 80)}{c.text.length > 80 ? "..." : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Claude deep dive result */}
          {deepDiveResult && (
            <div style={{ gridColumn: "1 / -1", marginTop: 8, padding: 16, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: C.blue, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>AI Deep Dive</div>
              <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.75, marginBottom: 12 }}>{deepDiveResult.summary}</p>
              {deepDiveResult.key_quote && (
                <div style={{ padding: 10, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontStyle: "italic", color: "#78350f" }}>"{deepDiveResult.key_quote}"</span>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {deepDiveResult.pain_points?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: "#dc2626", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Pain Points</div>
                    {deepDiveResult.pain_points.slice(0,4).map((p,i) => <div key={i} style={{ fontSize: 12, color: "#b91c1c", marginBottom: 3 }}>· {p}</div>)}
                  </div>
                )}
                {deepDiveResult.praise_points?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: "#16a34a", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Praise</div>
                    {deepDiveResult.praise_points.slice(0,4).map((p,i) => <div key={i} style={{ fontSize: 12, color: "#15803d", marginBottom: 3 }}>· {p}</div>)}
                  </div>
                )}
                {deepDiveResult.themes?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: C.textDim, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Themes</div>
                    {deepDiveResult.themes.slice(0,4).map((t,i) => <div key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 3 }}>· {t}</div>)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function UploadPage() {
  const [rows, setRows] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [file, setFile] = useState(null);
  const [groupBy, setGroupBy] = useState("location");
  const [stats, setStats] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [filterText, setFilterText] = useState("");
  const [sortBy, setSortBy] = useState("avg_asc"); // avg_asc, avg_desc, volume, negative
  const [deepDiveResults, setDeepDiveResults] = useState({});
  const [deepDiving, setDeepDiving] = useState({});
  const [step, setStep] = useState("upload");
  const fileRef = useRef();

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result);
      setRows(parsed);
      // Extract all column names from first row
      const cols = parsed.length > 0 ? Object.keys(parsed[0]) : [];
      setAvailableColumns(cols);
      // Pick a smart default: prefer Location, then first column
      const preferred = ["Location", "Business Name", "Region", "Division", "State", "City"];
      const defaultCol = preferred.find(p => cols.includes(p)) || cols[0] || "";
      setGroupBy(defaultCol);
      const computed = computeLocationStats(parsed, defaultCol);
      setStats(computed);
      setStep("dashboard");
    };
    reader.readAsText(f);
  }

  function handleGroupByChange(col) {
    setGroupBy(col);
    if (rows.length > 0) {
      setStats(computeLocationStats(rows, col));
      setDeepDiveResults({});
    }
  }

  async function runDeepDive(loc) {
    setDeepDiving(prev => ({ ...prev, [loc.name]: true }));
    const reviewText = loc.comments
      .map(c => `Rating: ${c.rating}/5 | ${c.text}`)
      .join("\n\n")
      .slice(0, 12000);

    try {
      const res = await fetch("/api/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: reviewText,
          label: loc.name,
          source: `csv_${groupBy}`,
          reviewCount: loc.commentCount,
          project_name: projectName || "default",
        }),
      });
      const data = await res.json();
      setDeepDiveResults(prev => ({ ...prev, [loc.name]: data }));
    } catch (err) {
      setDeepDiveResults(prev => ({ ...prev, [loc.name]: { error: err.message } }));
    }
    setDeepDiving(prev => ({ ...prev, [loc.name]: false }));
  }

  // Sorting + filtering
  const filtered = stats.filter(s =>
    s.name.toLowerCase().includes(filterText.toLowerCase()) ||
    s.region.toLowerCase().includes(filterText.toLowerCase()) ||
    s.state.toLowerCase().includes(filterText.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "avg_asc":  return (a.avg ?? 99) - (b.avg ?? 99);
      case "avg_desc": return (b.avg ?? 0) - (a.avg ?? 0);
      case "volume":   return b.total - a.total;
      case "negative": return b.pctNegative - a.pctNegative;
      default: return 0;
    }
  });

  // Overview stats
  const totalReviews = stats.reduce((s, l) => s + l.ratedCount, 0);
  const overallAvg = stats.length ? Math.round(stats.reduce((s, l) => s + (l.avg || 0) * l.ratedCount, 0) / totalReviews * 10) / 10 : 0;
  const criticalCount = stats.filter(l => l.healthScore < 55).length;
  const healthyCount = stats.filter(l => l.healthScore >= 75).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fafaf9; }
        .nav-link:hover { border-color: #d0d0cb !important; color: #111110 !important; }
        .drop-zone:hover { border-color: #2563eb !important; background: #eff6ff !important; }
        .sort-btn:hover { border-color: #d0d0cb !important; }
        .group-btn:hover { border-color: #2563eb !important; }
      `}</style>

      {/* NAV */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 48px", borderBottom: "1px solid #e8e8e5", background: "rgba(250,250,249,0.95)", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(8px)", fontFamily: "'Geist', sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "#1a1a1a", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, fontWeight: 700, fontFamily: "'Libre Baskerville', serif" }}>P</div>
          <span style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em", color: "#111110" }}>Pulse</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/" className="nav-link" style={{ padding: "7px 16px", border: "1px solid #e8e8e5", borderRadius: 8, color: "#6b6b63", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>Analyzer</a>
          <a href="/dashboard" className="nav-link" style={{ padding: "7px 16px", border: "1px solid #e8e8e5", borderRadius: 8, color: "#6b6b63", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>Dashboard</a>
        </div>
      </nav>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px", fontFamily: "'Geist', sans-serif" }}>

        {/* UPLOAD STEP */}
        {step === "upload" && (
          <>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: C.blue, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>CSV Upload</div>
              <h1 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 30, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.02em", marginBottom: 8 }}>Instant location dashboard</h1>
              <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.7 }}>Upload your CSV and get an instant dashboard from ratings data. Click any location for an AI deep dive.</p>
            </div>

            <div
              className="drop-zone"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              style={{ border: "2px dashed #e8e8e5", borderRadius: 16, padding: "64px 40px", textAlign: "center", cursor: "pointer", background: C.bgCard, transition: "all 0.2s" }}
            >
              <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
              <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 20, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>Drop your CSV here</div>
              <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: 20 }}>Instant dashboard · no waiting · AI on demand</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                {["Business Name", "Region", "Division", "Location", "City", "State", "Review Comment", "Review Rating"].map(col => (
                  <span key={col} style={{ padding: "3px 10px", background: C.bgMuted, border: `1px solid ${C.border}`, borderRadius: 20, fontSize: 11, color: C.textDim, fontFamily: "'Geist Mono', monospace" }}>{col}</span>
                ))}
              </div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
            </div>
          </>
        )}

        {/* DASHBOARD STEP */}
        {step === "dashboard" && (
          <>
            {/* Top bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 26, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.02em", margin: 0 }}>{file?.name}</h1>
                <div style={{ fontSize: 12, color: C.textDim, fontFamily: "'Geist Mono', monospace", marginTop: 4 }}>
                  {totalReviews.toLocaleString()} reviews · {stats.length} groups · overall avg {overallAvg}★
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Project name..."
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  style={{ padding: "7px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontFamily: "'Geist Mono', monospace", color: C.textPrimary, background: C.bgCard, width: 180, outline: "none" }}
                />
                <button onClick={() => { setStep("upload"); setRows([]); setStats([]); setFile(null); }} style={{ padding: "7px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: "white", color: C.textSecondary, fontSize: 12, cursor: "pointer", fontFamily: "'Geist', sans-serif" }}>
                  New file
                </button>
              </div>
            </div>

            {/* Overview KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Overall avg", value: overallAvg + "★", color: overallAvg >= 4.5 ? "#16a34a" : overallAvg >= 3.5 ? "#d97706" : "#dc2626" },
                { label: "Total reviews", value: totalReviews.toLocaleString(), color: C.blue },
                { label: "Healthy locations", value: healthyCount, color: "#16a34a" },
                { label: "Critical locations", value: criticalCount, color: "#dc2626" },
              ].map(kpi => (
                <div key={kpi.label} style={{ padding: 18, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 26, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                  <div style={{ fontSize: 11, color: C.textDim, marginTop: 4, fontFamily: "'Geist Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
              {/* Group by — dynamic columns from CSV */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: C.textDim, fontFamily: "'Geist Mono', monospace" }}>Group by</span>
                <select
                  value={groupBy}
                  onChange={(e) => handleGroupByChange(e.target.value)}
                  style={{
                    padding: "7px 12px", border: `1px solid ${C.border}`, borderRadius: 8,
                    background: "white", color: C.textPrimary, fontSize: 12, cursor: "pointer",
                    fontFamily: "'Geist', sans-serif", outline: "none", fontWeight: 500,
                  }}
                >
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{
                padding: "7px 12px", border: `1px solid ${C.border}`, borderRadius: 8,
                background: "white", color: C.textSecondary, fontSize: 12, cursor: "pointer",
                fontFamily: "'Geist', sans-serif", outline: "none",
              }}>
                <option value="avg_asc">Worst first</option>
                <option value="avg_desc">Best first</option>
                <option value="negative">Most negative %</option>
                <option value="volume">Most reviews</option>
              </select>

              {/* Search */}
              <input
                type="text"
                placeholder="Filter locations..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                style={{
                  padding: "7px 12px", border: `1px solid ${C.border}`, borderRadius: 8,
                  background: "white", color: C.textPrimary, fontSize: 12,
                  fontFamily: "'Geist', sans-serif", outline: "none", width: 200,
                }}
              />

              <div style={{ marginLeft: "auto", fontSize: 12, color: C.textDim, fontFamily: "'Geist Mono', monospace" }}>
                {sorted.length} of {stats.length} groups
              </div>
            </div>

            {/* Location list */}
            <div>
              {sorted.map(loc => (
                <LocationRow
                  key={loc.name}
                  loc={loc}
                  onDeepDive={runDeepDive}
                  deepDiveResult={deepDiveResults[loc.name]}
                  deepDiving={!!deepDiving[loc.name]}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}