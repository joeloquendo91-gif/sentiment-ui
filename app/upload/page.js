// v4
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

const GROUP_OPTIONS = [
  { value: "region", label: "Region", description: "Broadest view — best starting point" },
  { value: "division", label: "Division", description: "Mid-level grouping" },
  { value: "state", label: "State", description: "Group all locations per state" },
  { value: "city", label: "City", description: "Group all locations per city" },
  { value: "location", label: "Location", description: "Individual location — most granular" },
];

function parseCSV(text) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  function parseAllRows(str) {
    const rows = [];
    let row = [];
    let current = "";
    let inQuotes = false;
    let i = 0;
    while (i < str.length) {
      const ch = str[i];
      if (ch === '"') {
        if (inQuotes && str[i + 1] === '"') { current += '"'; i += 2; continue; }
        inQuotes = !inQuotes; i++; continue;
      }
      if (ch === "," && !inQuotes) { row.push(current); current = ""; i++; continue; }
      if (ch === "\n" && !inQuotes) {
        row.push(current); current = "";
        if (row.some((c) => c.trim())) rows.push(row);
        row = []; i++; continue;
      }
      current += ch; i++;
    }
    row.push(current);
    if (row.some((c) => c.trim())) rows.push(row);
    return rows;
  }

  const allRows = parseAllRows(normalized);
  if (allRows.length < 2) return [];
  const headers = allRows[0].map((h) => h.trim());
  return allRows.slice(1).map((values) => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (values[idx] || "").trim(); });
    return obj;
  });
}

function groupRows(rows, groupBy) {
  const groups = {};
  rows.forEach((row) => {
    let key = "";
    const business = row["Business Name"] || "";

    switch (groupBy) {
      case "region":
        key = row["Region"]?.trim() || "Unknown Region";
        break;
      case "division":
        key = row["Division"]?.trim() || "Unknown Division";
        break;
      case "state":
        key = row["State"] || "Unknown State";
        break;
      case "city":
        key = row["City"]
          ? `${row["City"]}${row["State"] ? ", " + row["State"] : ""}`
          : "Unknown City";
        break;
      case "location":
      default: {
        const loc = row["Location"] || "";
        const city = row["City"] || "";
        const state = row["State"] || "";
        key = loc
          ? `${business} — ${loc}`
          : city || state
          ? `${business} — ${city}${state ? ", " + state : ""}`
          : business || "Unknown Location";
        break;
      }
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });
  return groups;
}

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [groupBy, setGroupBy] = useState("region");
  const [locationGroups, setLocationGroups] = useState({});
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [results, setResults] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentName: "" });
  const [step, setStep] = useState("upload");
  const fileRef = useRef();

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result);
      const groups = groupRows(parsed, groupBy);
      setRows(parsed);
      setLocationGroups(groups);
      setSelectedLocations(Object.keys(groups));
      setStep("preview");
    };
    reader.readAsText(f);
  }

  function handleGroupByChange(newGroupBy) {
    setGroupBy(newGroupBy);
    if (rows.length > 0) {
      const groups = groupRows(rows, newGroupBy);
      setLocationGroups(groups);
      setSelectedLocations([]);
    }
  }

  function toggleLocation(loc) {
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  }

  async function runAnalysis() {
    if (!selectedLocations.length) return;
    setAnalyzing(true);
    setResults([]);
    setStep("results");

    const total = selectedLocations.length;
    const allResults = [];

    for (let i = 0; i < selectedLocations.length; i++) {
      const locationName = selectedLocations[i];
      setProgress({ current: i + 1, total, currentName: locationName });

      const locationRows = locationGroups[locationName];
      const reviewText = locationRows
        .filter((r) => r["Review Comment"]?.trim())
        .map((r) => {
          const parts = [
            r["Review Rating"] ? `Rating: ${r["Review Rating"]}/5` : "",
            r["Review Source"] ? `Source: ${r["Review Source"]}` : "",
            r["Date Posted On"] ? `Date: ${r["Date Posted On"]}` : "",
            r["Review Comment"] || "",
          ].filter(Boolean);
          return parts.join(" | ");
        })
        .join("\n\n");

      if (!reviewText.trim()) {
        allResults.push({ location: locationName, error: "No review text found", count: locationRows.length });
        setResults([...allResults]);
        continue;
      }

      try {
        const res = await fetch("/api/analyze-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: reviewText,
            source: `csv_${groupBy}`,
            label: locationName,
            reviewCount: locationRows.filter((r) => r["Review Comment"]?.trim()).length,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        allResults.push({ location: locationName, count: locationRows.length, ...data });
      } catch (err) {
        allResults.push({ location: locationName, error: err.message, count: locationRows.length });
      }

      setResults([...allResults]);

      // Delay between calls to avoid overloading Claude API
      if (i < selectedLocations.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    setAnalyzing(false);
    setProgress({ current: 0, total: 0, currentName: "" });
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fafaf9; }
        .nav-link:hover { border-color: #d0d0cb !important; color: #111110 !important; }
        .drop-zone { transition: all 0.2s; }
        .drop-zone:hover, .drop-zone.drag-over { border-color: #2563eb !important; background: #eff6ff !important; }
        .loc-row:hover { background: #f8f8f6 !important; }
        .btn-primary { transition: all 0.15s; }
        .btn-primary:hover:not(:disabled) { background: #333 !important; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .group-option { transition: all 0.15s; cursor: pointer; }
        .group-option:hover { border-color: #2563eb !important; }
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

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px", fontFamily: "'Geist', sans-serif" }}>

        {/* Page header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: C.blue, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>CSV Upload</div>
          <h1 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 30, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.02em", marginBottom: 8 }}>
            Analyze reviews by location
          </h1>
          <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.7 }}>
            Upload your review spreadsheet. Choose how to group your data, then run sentiment analysis on each group.
          </p>
        </div>

        {/* Group by selector — always visible once file loaded or on upload step */}
        {(step === "upload" || step === "preview") && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 12 }}>
              Group reviews by
              <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: C.textDim }}>— start broad, drill down later</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {GROUP_OPTIONS.map((opt) => {
                const active = groupBy === opt.value;
                return (
                  <div
                    key={opt.value}
                    className="group-option"
                    onClick={() => handleGroupByChange(opt.value)}
                    style={{
                      padding: "12px 14px",
                      border: `1.5px solid ${active ? C.blue : C.border}`,
                      borderRadius: 10,
                      background: active ? "#eff6ff" : C.bgCard,
                      boxShadow: active ? "0 0 0 3px rgba(37,99,235,0.08)" : "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: active ? C.blue : C.textPrimary, marginBottom: 4 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.4 }}>{opt.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === "upload" && (
          <div
            className="drop-zone"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
            onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("drag-over"); handleFile(e.dataTransfer.files[0]); }}
            style={{ border: "2px dashed #e8e8e5", borderRadius: 16, padding: "56px 40px", textAlign: "center", cursor: "pointer", background: C.bgCard }}
          >
            <div style={{ fontSize: 36, marginBottom: 16 }}>📄</div>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 18, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>Drop your CSV here</div>
            <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: 20 }}>or click to browse</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              {["Business Name", "Region", "Division", "Location", "City", "State", "Review Comment", "Review Rating"].map((col) => (
                <span key={col} style={{ padding: "3px 10px", background: C.bgMuted, border: `1px solid ${C.border}`, borderRadius: 20, fontSize: 11, color: C.textDim, fontFamily: "'Geist Mono', monospace" }}>{col}</span>
              ))}
            </div>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
          </div>
        )}

        {/* STEP 2: Preview */}
        {step === "preview" && (
          <div>
            {/* File info */}
            <div style={{ padding: 16, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 24, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 24 }}>📄</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: C.textPrimary, fontSize: 14 }}>{file?.name}</div>
                <div style={{ fontSize: 12, color: C.textDim, fontFamily: "'Geist Mono', monospace", marginTop: 2 }}>
                  {rows.length} rows · {Object.keys(locationGroups).length} {groupBy} groups detected
                </div>
              </div>
              <button onClick={() => { setStep("upload"); setFile(null); setRows([]); }} style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", color: C.textSecondary, fontSize: 12, cursor: "pointer" }}>
                Change file
              </button>
            </div>

            {/* Location selector */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: C.textPrimary }}>
                  Select groups to analyze
                  <span style={{ marginLeft: 8, fontFamily: "'Geist Mono', monospace", fontSize: 11, color: C.textDim, fontWeight: 400 }}>
                    {selectedLocations.length} of {Object.keys(locationGroups).length} selected
                  </span>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => setSelectedLocations(Object.keys(locationGroups))} style={{ fontSize: 12, color: C.blue, background: "none", border: "none", cursor: "pointer", fontFamily: "'Geist', sans-serif" }}>Select all</button>
                  <button onClick={() => setSelectedLocations([])} style={{ fontSize: 12, color: C.textDim, background: "none", border: "none", cursor: "pointer", fontFamily: "'Geist', sans-serif" }}>Clear</button>
                </div>
              </div>

              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", maxHeight: 400, overflowY: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                {Object.entries(locationGroups).map(([loc, locRows], i, arr) => {
                  const selected = selectedLocations.includes(loc);
                  const reviewCount = locRows.filter((r) => r["Review Comment"]?.trim()).length;
                  const avgRating = locRows.filter((r) => r["Review Rating"]).length
                    ? (locRows.reduce((sum, r) => sum + (parseFloat(r["Review Rating"]) || 0), 0) / locRows.filter((r) => r["Review Rating"]).length).toFixed(1)
                    : null;
                  return (
                    <div
                      key={loc}
                      className="loc-row"
                      onClick={() => toggleLocation(loc)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                        borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
                        cursor: "pointer", background: selected ? "#f0f7ff" : "white",
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 4,
                        border: `1.5px solid ${selected ? C.blue : C.borderStrong}`,
                        background: selected ? C.blue : "white",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, transition: "all 0.1s",
                      }}>
                        {selected && <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary }}>{loc}</div>
                        <div style={{ fontSize: 11, color: C.textDim, fontFamily: "'Geist Mono', monospace", marginTop: 2 }}>
                          {locRows.length} rows · {reviewCount} reviews
                          {avgRating && ` · avg ${avgRating}★`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={runAnalysis}
              disabled={selectedLocations.length === 0}
              style={{ width: "100%", padding: "13px", background: "#1a1a1a", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Geist', sans-serif" }}
            >
              Analyze {selectedLocations.length} {groupBy} group{selectedLocations.length !== 1 ? "s" : ""} →
            </button>
          </div>
        )}

        {/* STEP 3: Results */}
        {step === "results" && (
          <div>
            {analyzing && (
              <div style={{ padding: 20, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: C.blue }}>analyzing {progress.current} / {progress.total}</div>
                  <div style={{ fontSize: 12, color: C.textDim }}>{Math.round((progress.current / progress.total) * 100)}%</div>
                </div>
                <div style={{ height: 4, background: C.bgMuted, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: C.blue, borderRadius: 2, width: `${(progress.current / progress.total) * 100}%`, transition: "width 0.3s ease" }} />
                </div>
                <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 8 }}>Currently: {progress.currentName}</div>
              </div>
            )}

            {results.length > 0 && !analyzing && (
              <div style={{ padding: 20, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.textPrimary, marginBottom: 4 }}>Analysis complete</div>
                  <div style={{ fontSize: 12, color: C.textDim, fontFamily: "'Geist Mono', monospace" }}>
                    {results.filter((r) => !r.error).length} successful · {results.filter((r) => r.error).length} failed
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a href="/dashboard" style={{ padding: "8px 16px", background: C.blue, color: "white", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600, fontFamily: "'Geist', sans-serif" }}>View Dashboard →</a>
                  <button onClick={() => setStep("preview")} style={{ padding: "8px 16px", border: `1px solid ${C.border}`, background: "white", color: C.textSecondary, borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "'Geist', sans-serif" }}>Back</button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {results.map((r, i) => <ResultCard key={i} result={r} />)}
              {analyzing && (
                <div style={{ padding: 24, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, textAlign: "center" }}>
                  <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: C.textDim }}>analyzing {progress.currentName}...</div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function ResultCard({ result }) {
  const [expanded, setExpanded] = useState(false);

  if (result.error) {
    return (
      <div style={{ padding: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12 }}>
        <div style={{ fontWeight: 600, color: "#dc2626", fontSize: 14, marginBottom: 4 }}>{result.location}</div>
        <div style={{ fontSize: 13, color: "#b91c1c" }}>{result.error}</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#ffffff", border: "1px solid #e8e8e5", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div onClick={() => setExpanded(!expanded)} style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20 }}>{sentimentEmoji[result.overall_sentiment]}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: "#111110", fontSize: 14 }}>{result.location}</div>
          <div style={{ fontSize: 12, color: "#a8a89e", marginTop: 2, fontFamily: "'Geist Mono', monospace" }}>
            {result.count} reviews · {result.overall_sentiment} · {result.sentiment_score}/10
          </div>
        </div>
        <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 20, fontWeight: 700, color: sentimentColor[result.overall_sentiment] }}>
          {result.sentiment_score}/10
        </div>
        <span style={{ color: "#a8a89e", fontSize: 11, marginLeft: 8 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid #e8e8e5", paddingTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ margin: 0, color: "#6b6b63", lineHeight: 1.75, fontSize: 14 }}>{result.summary}</p>

          {result.key_quote && (
            <div style={{ padding: 14, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: "#92400e", fontFamily: "'Geist Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Key Quote</div>
              <p style={{ margin: 0, fontStyle: "italic", color: "#78350f", fontSize: 13 }}>"{result.key_quote}"</p>
            </div>
          )}

          {result.themes?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: "#a8a89e", fontFamily: "'Geist Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Themes</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.themes.map((theme) => (
                  <span key={theme} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, background: "#f4f4f2", color: "#6b6b63", border: "1px solid #e8e8e5" }}>
                    {sentimentEmoji[result.sentiment_per_theme?.[theme]]} {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {result.pain_points?.length > 0 && (
              <div style={{ padding: 14, background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
                <div style={{ fontSize: 10, color: "#dc2626", fontFamily: "'Geist Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Pain Points</div>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                  {result.pain_points.map((p, i) => <li key={i} style={{ color: "#b91c1c", fontSize: 13 }}>{p}</li>)}
                </ul>
              </div>
            )}
            {result.praise_points?.length > 0 && (
              <div style={{ padding: 14, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                <div style={{ fontSize: 10, color: "#16a34a", fontFamily: "'Geist Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Praise</div>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                  {result.praise_points.map((p, i) => <li key={i} style={{ color: "#15803d", fontSize: 13 }}>{p}</li>)}
                </ul>
              </div>
            )}
          </div>

          {result.feature_requests?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: "#a8a89e", fontFamily: "'Geist Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Feature Requests</div>
              <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                {result.feature_requests.map((f, i) => <li key={i} style={{ fontSize: 13, color: "#6b6b63" }}>{f}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}