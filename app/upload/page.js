// v4
"use client";
import { useState, useRef, useEffect } from "react";

const C = {
  bg: "#fafaf9", bgCard: "#ffffff", bgMuted: "#f4f4f2",
  border: "#e8e8e5", borderStrong: "#d0d0cb", blue: "#2563eb",
  textPrimary: "#111110", textSecondary: "#6b6b63", textDim: "#a8a89e",
};
const sentimentColor = { positive: "#16a34a", negative: "#dc2626", mixed: "#d97706", neutral: "#6b7280" };
const sentimentBg = { positive: "#f0fdf4", negative: "#fef2f2", mixed: "#fffbeb", neutral: "#f9fafb" };
const sentimentBorder = { positive: "#bbf7d0", negative: "#fecaca", mixed: "#fde68a", neutral: "#e5e7eb" };

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

function detectFileType(rows) {
  if (!rows.length) return "unknown";
  const cols = Object.keys(rows[0]);
  if (["overall_sentiment","sentiment_score","pain_points","themes"].every(c => cols.includes(c))) return "analyses";
  if (["Review Comment","Review Rating"].some(c => cols.includes(c))) return "reviews";
  return "generic";
}

function aggregateAnalyses(rows) {
  const safeJSON = (str) => { try { return JSON.parse(str); } catch { return []; } };
  const scores = rows.map(r => parseFloat(r.sentiment_score)).filter(s => !isNaN(s));
  const avgScore = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length*10)/10 : null;
  const sentimentCounts = { positive:0, negative:0, mixed:0, neutral:0 };
  rows.forEach(r => { if (sentimentCounts[r.overall_sentiment] !== undefined) sentimentCounts[r.overall_sentiment]++; });
  const themeCount = {}; const painCount = {}; const praiseCount = {}; const competitorCount = {}; const sourceScores = {};
  rows.forEach(r => {
    safeJSON(r.themes).forEach(t => { themeCount[t] = (themeCount[t]||0)+1; });
    safeJSON(r.pain_points).forEach(p => { painCount[p] = (painCount[p]||0)+1; });
    safeJSON(r.praise_points).forEach(p => { praiseCount[p] = (praiseCount[p]||0)+1; });
    safeJSON(r.competitor_mentions).forEach(c => { competitorCount[c] = (competitorCount[c]||0)+1; });
    const src = r.source_type || "other";
    const score = parseFloat(r.sentiment_score);
    if (!isNaN(score)) { if (!sourceScores[src]) sourceScores[src] = []; sourceScores[src].push(score); }
  });
  return {
    avgScore, sentimentCounts, total: rows.length,
    topThemes: Object.entries(themeCount).sort((a,b)=>b[1]-a[1]).slice(0,10),
    topPains: Object.entries(painCount).sort((a,b)=>b[1]-a[1]).slice(0,8),
    topPraise: Object.entries(praiseCount).sort((a,b)=>b[1]-a[1]).slice(0,8),
    topCompetitors: Object.entries(competitorCount).sort((a,b)=>b[1]-a[1]).slice(0,8),
    sourceAvgs: Object.entries(sourceScores).map(([src,sc]) => ({ src, avg: Math.round(sc.reduce((a,b)=>a+b,0)/sc.length*10)/10, count: sc.length })).sort((a,b)=>b.avg-a.avg),
  };
}

function computeLocationStats(rows, groupByField) {
  const groups = {};
  rows.forEach(row => {
    const key = (row[groupByField]||"").trim()||"Unknown";
    if (key==="Unknown"||key==="") return;
    if (/^\d{5,}/.test(key)||key.toLowerCase().includes("corporate rollup")) return;
    if (!groups[key]) groups[key] = { name:key, region:row["Region"]||"", division:row["Division"]||"", state:row["State"]||"", city:row["City"]||"", business:row["Business Name"]||"", rows:[], ratings:[], comments:[], sources:{}, ratingDist:{0:0,1:0,2:0,3:0,4:0,5:0} };
    const g = groups[key];
    g.rows.push(row);
    const rating = parseFloat(row["Review Rating"]);
    if (!isNaN(rating)) { g.ratings.push(rating); const bucket=Math.round(Math.min(5,Math.max(0,rating))); g.ratingDist[bucket]=(g.ratingDist[bucket]||0)+1; }
    const comment=(row["Review Comment"]||"").trim();
    if (comment) g.comments.push({ text:comment, rating, date:row["Date Posted On"], source:row["Review Source"] });
    const src=row["Review Source"]||"Other";
    g.sources[src]=(g.sources[src]||0)+1;
  });
  return Object.values(groups).map(g => {
    const avg=g.ratings.length?g.ratings.reduce((a,b)=>a+b,0)/g.ratings.length:null;
    const negative=g.ratings.filter(r=>r<=2).length;
    const pctNegative=g.ratings.length?Math.round((negative/g.ratings.length)*100):0;
    const healthScore=avg!==null?Math.round((avg/5)*85+Math.min(15,g.ratings.length/10)):0;
    return { ...g, avg:avg!==null?Math.round(avg*10)/10:null, total:g.rows.length, ratedCount:g.ratings.length, commentCount:g.comments.length, negative, pctNegative, healthScore, topSource:Object.entries(g.sources).sort((a,b)=>b[1]-a[1])[0]?.[0]||"" };
  }).sort((a,b)=>(a.avg??99)-(b.avg??99));
}

function FreqBar({ label, count, max, color }) {
  const pct = max ? Math.round((count/max)*100) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ fontSize:12, color:C.textSecondary, flex:1, marginRight:8 }}>{label}</span>
        <span style={{ fontSize:11, color:C.textDim, fontFamily:"monospace", minWidth:20, textAlign:"right" }}>{count}</span>
      </div>
      <div style={{ height:5, background:C.bgMuted, borderRadius:3, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color||C.blue, borderRadius:3, transition:"width 0.4s ease" }} />
      </div>
    </div>
  );
}

function HealthBadge({ score }) {
  const color=score>=75?"#16a34a":score>=55?"#d97706":"#dc2626";
  const bg=score>=75?"#f0fdf4":score>=55?"#fffbeb":"#fef2f2";
  const border=score>=75?"#bbf7d0":score>=55?"#fde68a":"#fecaca";
  const label=score>=75?"Healthy":score>=55?"Needs attention":"Critical";
  return <span style={{ padding:"2px 8px", background:bg, border:`1px solid ${border}`, borderRadius:20, fontSize:11, color, fontWeight:600 }}>{label}</span>;
}

function RatingBar({ dist, total }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      {[5,4,3,2,1,0].map(star => {
        const count=dist[star]||0; const pct=total?Math.round((count/total)*100):0;
        const color=star>=4?"#16a34a":star>=3?"#d97706":"#dc2626";
        return (
          <div key={star} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:10, color:C.textDim, width:12, textAlign:"right" }}>{star}*</span>
            <div style={{ flex:1, height:6, background:C.bgMuted, borderRadius:3, overflow:"hidden" }}>
              <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:3 }} />
            </div>
            <span style={{ fontSize:10, color:C.textDim, width:28 }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function LocationRow({ loc, onDeepDive, deepDiveResult, deepDiving }) {
  const [expanded, setExpanded] = useState(false);
  const scoreColor=loc.avg>=4.5?"#16a34a":loc.avg>=3.5?"#d97706":"#dc2626";
  return (
    <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden", marginBottom:8 }}>
      <div onClick={()=>setExpanded(!expanded)} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", cursor:"pointer" }}>
        <div style={{ textAlign:"center", minWidth:48 }}>
          <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:20, fontWeight:700, color:scoreColor, lineHeight:1 }}>{loc.avg??"-"}</div>
          <div style={{ fontSize:9, color:C.textDim, marginTop:2 }}>/ 5.0</div>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:600, fontSize:14, color:C.textPrimary, marginBottom:3 }}>{loc.name}</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {loc.region && <span style={{ fontSize:11, color:C.textDim, fontFamily:"monospace" }}>{loc.region}</span>}
            {loc.state && <span style={{ fontSize:11, color:C.textDim, fontFamily:"monospace" }}>{loc.state}</span>}
            <span style={{ fontSize:11, color:C.textDim, fontFamily:"monospace" }}>{loc.ratedCount} reviews</span>
            {loc.pctNegative>0 && <span style={{ fontSize:11, color:"#dc2626", fontFamily:"monospace" }}>{loc.pctNegative}% negative</span>}
          </div>
        </div>
        <HealthBadge score={loc.healthScore} />
        <button onClick={(e)=>{e.stopPropagation();onDeepDive(loc);}} disabled={deepDiving} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${deepDiveResult?C.blue:C.border}`, background:deepDiveResult?"#eff6ff":"white", color:deepDiveResult?C.blue:C.textSecondary, fontSize:12, fontWeight:500, cursor:deepDiving?"wait":"pointer", fontFamily:"'Geist', sans-serif", whiteSpace:"nowrap" }}>
          {deepDiving?"analyzing...":deepDiveResult?"+ AI Analysis":"Deep Dive"}
        </button>
        <span style={{ color:C.textDim, fontSize:11 }}>{expanded?"^":"v"}</span>
      </div>
      {expanded && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:16, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
          <div>
            <div style={{ fontSize:11, color:C.textDim, fontFamily:"monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Rating distribution</div>
            <RatingBar dist={loc.ratingDist} total={loc.ratedCount} />
          </div>
          <div>
            <div style={{ fontSize:11, color:C.textDim, fontFamily:"monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Stats</div>
            {[["Total",loc.total],["Rated",loc.ratedCount],["Comments",loc.commentCount],["5-star",loc.ratingDist[5]||0],["1-star",(loc.ratingDist[0]||0)+(loc.ratingDist[1]||0)],["Source",loc.topSource]].map(([l,v])=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontSize:12, color:C.textSecondary }}>{l}</span>
                <span style={{ fontSize:12, fontWeight:600, color:C.textPrimary, fontFamily:"monospace" }}>{v}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize:11, color:C.textDim, fontFamily:"monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Recent comments</div>
            {loc.comments.slice(0,3).map((c,i)=>(
              <div key={i} style={{ fontSize:12, color:C.textSecondary, lineHeight:1.5, borderLeft:`2px solid ${C.border}`, paddingLeft:8, marginBottom:8 }}>
                {c.text.slice(0,80)}{c.text.length>80?"...":""}
              </div>
            ))}
          </div>
          {deepDiveResult && (
            <div style={{ gridColumn:"1 / -1", marginTop:8, padding:16, background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10 }}>
              <div style={{ fontSize:11, color:C.blue, fontFamily:"monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>AI Deep Dive</div>
              <p style={{ fontSize:13, color:C.textSecondary, lineHeight:1.75, marginBottom:12 }}>{deepDiveResult.summary}</p>
              {deepDiveResult.key_quote && <div style={{ padding:10, background:"#fffbeb", border:"1px solid #fde68a", borderRadius:6, marginBottom:12 }}><span style={{ fontSize:12, fontStyle:"italic", color:"#78350f" }}>"{deepDiveResult.key_quote}"</span></div>}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                {deepDiveResult.pain_points?.length>0 && <div><div style={{ fontSize:10, color:"#dc2626", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Pain Points</div>{deepDiveResult.pain_points.slice(0,4).map((p,i)=><div key={i} style={{ fontSize:12, color:"#b91c1c", marginBottom:3 }}>- {p}</div>)}</div>}
                {deepDiveResult.praise_points?.length>0 && <div><div style={{ fontSize:10, color:"#16a34a", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Praise</div>{deepDiveResult.praise_points.slice(0,4).map((p,i)=><div key={i} style={{ fontSize:12, color:"#15803d", marginBottom:3 }}>- {p}</div>)}</div>}
                {deepDiveResult.themes?.length>0 && <div><div style={{ fontSize:10, color:C.textDim, fontFamily:"monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Themes</div>{deepDiveResult.themes.slice(0,4).map((t,i)=><div key={i} style={{ fontSize:12, color:C.textSecondary, marginBottom:3 }}>- {t}</div>)}</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AnalysesDashboard({ rows, filename }) {
  const agg = aggregateAnalyses(rows);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthesis, setSynthesis] = useState(null);

  async function runSynthesis() {
    setSynthesizing(true);
    const summaries = rows.map(r => `Source: ${r.source_type||"unknown"} | Score: ${r.sentiment_score}/10 | Sentiment: ${r.overall_sentiment}\nSummary: ${r.summary}\nPain points: ${r.pain_points}\nPraise: ${r.praise_points}`).join("\n\n---\n\n");
    try {
      const res = await fetch("/api/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: summaries, label: filename, source: "analyses_synthesis", reviewCount: rows.length, project_name: "synthesis" }),
      });
      const data = await res.json();
      setSynthesis(data);
    } catch(err) { console.error(err); }
    setSynthesizing(false);
  }

  const maxTheme = agg.topThemes[0]?.[1]||1;
  const maxPain = agg.topPains[0]?.[1]||1;
  const maxPraise = agg.topPraise[0]?.[1]||1;
  const maxComp = agg.topCompetitors[0]?.[1]||1;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
        <div>
          <div style={{ fontFamily:"'Geist Mono', monospace", fontSize:11, color:C.blue, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Analyses Export</div>
          <h1 style={{ fontFamily:"'Libre Baskerville', serif", fontSize:26, fontWeight:700, color:C.textPrimary, letterSpacing:"-0.02em", margin:0 }}>{filename}</h1>
          <div style={{ fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace", marginTop:4 }}>{agg.total} analyses loaded</div>
        </div>
        <button onClick={runSynthesis} disabled={synthesizing} style={{ padding:"10px 20px", background:synthesizing?"#6b7280":"#1a1a1a", color:"white", border:"none", borderRadius:10, fontSize:13, fontWeight:600, cursor:synthesizing?"wait":"pointer", fontFamily:"'Geist', sans-serif" }}>
          {synthesizing?"Synthesizing...":"AI Meta-Synthesis"}
        </button>
      </div>

      {synthesis && (
        <div style={{ padding:20, background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:12, marginBottom:24 }}>
          <div style={{ fontSize:11, color:C.blue, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Executive Summary</div>
          <p style={{ fontSize:14, color:C.textSecondary, lineHeight:1.8, marginBottom:16 }}>{synthesis.summary}</p>
          {synthesis.key_quote && <div style={{ padding:12, background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, marginBottom:16 }}><span style={{ fontSize:13, fontStyle:"italic", color:"#78350f" }}>"{synthesis.key_quote}"</span></div>}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            {synthesis.pain_points?.length>0 && (
              <div style={{ padding:14, background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8 }}>
                <div style={{ fontSize:10, color:"#dc2626", fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Key Pain Points</div>
                {synthesis.pain_points.map((p,i)=><div key={i} style={{ fontSize:13, color:"#b91c1c", marginBottom:4 }}>- {p}</div>)}
              </div>
            )}
            {synthesis.praise_points?.length>0 && (
              <div style={{ padding:14, background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8 }}>
                <div style={{ fontSize:10, color:"#16a34a", fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Key Praise</div>
                {synthesis.praise_points.map((p,i)=><div key={i} style={{ fontSize:13, color:"#15803d", marginBottom:4 }}>- {p}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:12, marginBottom:24 }}>
        <div style={{ padding:18, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:28, fontWeight:700, color:C.blue }}>{agg.avgScore}</div>
          <div style={{ fontSize:11, color:C.textDim, marginTop:4, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.05em" }}>Avg / 10</div>
        </div>
        {Object.entries(agg.sentimentCounts).map(([s,count])=>(
          <div key={s} style={{ padding:14, background:sentimentBg[s]||"#f9fafb", border:`1px solid ${sentimentBorder[s]||"#e5e7eb"}`, borderRadius:12, textAlign:"center" }}>
            <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:24, fontWeight:700, color:sentimentColor[s]||"#6b7280" }}>{count}</div>
            <div style={{ fontSize:11, color:sentimentColor[s]||"#6b7280", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginTop:4 }}>{s}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <div style={{ padding:20, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12 }}>
          <div style={{ fontSize:11, color:C.textDim, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:14 }}>Top Themes</div>
          {agg.topThemes.map(([theme,count])=><FreqBar key={theme} label={theme.replace(/_/g," ")} count={count} max={maxTheme} color={C.blue} />)}
        </div>
        <div style={{ padding:20, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12 }}>
          <div style={{ fontSize:11, color:C.textDim, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:14 }}>Competitor Mentions</div>
          {agg.topCompetitors.length>0
            ? agg.topCompetitors.map(([comp,count])=><FreqBar key={comp} label={comp} count={count} max={maxComp} color="#7c3aed" />)
            : <div style={{ fontSize:13, color:C.textDim }}>None found</div>
          }
          {agg.sourceAvgs.length>0 && (
            <>
              <div style={{ fontSize:11, color:C.textDim, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginTop:20, marginBottom:14 }}>Avg Score by Source</div>
              {agg.sourceAvgs.map(({src,avg,count})=>(
                <div key={src} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <span style={{ fontSize:12, color:C.textSecondary }}>{src} <span style={{ color:C.textDim, fontSize:11 }}>({count})</span></span>
                  <span style={{ fontFamily:"'Libre Baskerville', serif", fontSize:14, fontWeight:700, color:avg>=7?"#16a34a":avg>=5?"#d97706":"#dc2626" }}>{avg}/10</span>
                </div>
              ))}
            </>
          )}
        </div>
        <div style={{ padding:20, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12 }}>
          <div style={{ fontSize:11, color:"#dc2626", fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:14 }}>Pain Points — across all analyses</div>
          {agg.topPains.map(([pain,count])=><FreqBar key={pain} label={pain} count={count} max={maxPain} color="#dc2626" />)}
        </div>
        <div style={{ padding:20, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12 }}>
          <div style={{ fontSize:11, color:"#16a34a", fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:14 }}>Praise — across all analyses</div>
          {agg.topPraise.map(([praise,count])=><FreqBar key={praise} label={praise} count={count} max={maxPraise} color="#16a34a" />)}
        </div>
      </div>

      <div style={{ padding:20, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12 }}>
        <div style={{ fontSize:11, color:C.textDim, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:14 }}>All Analyses</div>
        {rows.map((r,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:i<rows.length-1?`1px solid ${C.border}`:"none" }}>
            <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:16, fontWeight:700, color:sentimentColor[r.overall_sentiment]||C.textDim, minWidth:36 }}>{r.sentiment_score}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, color:C.textPrimary, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {(r.url||"").replace("csv_upload:","").replace("https://","") || "-"}
              </div>
              <div style={{ fontSize:11, color:C.textDim, fontFamily:"monospace", marginTop:2 }}>
                {r.source_type} - {r.overall_sentiment} - {(r.created_at||"").slice(0,10)}
              </div>
            </div>
            <span style={{ padding:"2px 8px", background:sentimentBg[r.overall_sentiment]||"#f9fafb", border:`1px solid ${sentimentBorder[r.overall_sentiment]||"#e5e7eb"}`, borderRadius:20, fontSize:11, color:sentimentColor[r.overall_sentiment]||"#6b7280", fontWeight:600, whiteSpace:"nowrap" }}>
              {r.overall_sentiment}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UploadPage() {
  const [rows, setRows] = useState([]);
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [groupBy, setGroupBy] = useState("");
  const [availableColumns, setAvailableColumns] = useState([]);
  const [stats, setStats] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clients, setClients] = useState([]);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [sortBy, setSortBy] = useState("avg_asc");
  const [deepDiveResults, setDeepDiveResults] = useState({});
  const [deepDiving, setDeepDiving] = useState({});
  const [step, setStep] = useState("upload");

  useEffect(() => { fetchClients(); }, []);

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
  const fileRef = useRef();

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result);
      const detected = detectFileType(parsed);
      setRows(parsed);
      setFileType(detected);
      if (detected === "reviews" || detected === "generic") {
        const cols = parsed.length>0 ? Object.keys(parsed[0]) : [];
        setAvailableColumns(cols);
        const preferred = ["Location","Business Name","Region","Division","State","City"];
        const defaultCol = preferred.find(p=>cols.includes(p))||cols[0]||"";
        setGroupBy(defaultCol);
        setStats(computeLocationStats(parsed, defaultCol));
      }
      setStep("dashboard");
    };
    reader.readAsText(f);
  }

  function handleGroupByChange(col) {
    setGroupBy(col);
    if (rows.length>0) { setStats(computeLocationStats(rows,col)); setDeepDiveResults({}); }
  }

  async function runDeepDive(loc) {
    setDeepDiving(prev=>({...prev,[loc.name]:true}));
    const reviewText = loc.comments.map(c=>`Rating: ${c.rating}/5 | ${c.text}`).join("\n\n").slice(0,12000);
    try {
      const res = await fetch("/api/analyze-text", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ text:reviewText, label:loc.name, source:`csv_${groupBy}`, reviewCount:loc.commentCount, client_id: selectedClientId || undefined }) });
      const data = await res.json();
      setDeepDiveResults(prev=>({...prev,[loc.name]:data}));
    } catch(err) { console.error(err); }
    setDeepDiving(prev=>({...prev,[loc.name]:false}));
  }

  const filtered = stats.filter(s=>s.name.toLowerCase().includes(filterText.toLowerCase())||s.region.toLowerCase().includes(filterText.toLowerCase())||s.state.toLowerCase().includes(filterText.toLowerCase()));
  const sorted = [...filtered].sort((a,b)=>{
    switch(sortBy) {
      case "avg_asc": return (a.avg??99)-(b.avg??99);
      case "avg_desc": return (b.avg??0)-(a.avg??0);
      case "volume": return b.total-a.total;
      case "negative": return b.pctNegative-a.pctNegative;
      default: return 0;
    }
  });
  const totalReviews=stats.reduce((s,l)=>s+l.ratedCount,0);
  const overallAvg=stats.length?Math.round(stats.reduce((s,l)=>s+(l.avg||0)*l.ratedCount,0)/totalReviews*10)/10:0;
  const criticalCount=stats.filter(l=>l.healthScore<55).length;
  const healthyCount=stats.filter(l=>l.healthScore>=75).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fafaf9; }
        .nav-link:hover { border-color: #d0d0cb !important; color: #111110 !important; }
        .drop-zone:hover { border-color: #2563eb !important; background: #eff6ff !important; }
      `}</style>

      <nav style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 48px", borderBottom:"1px solid #e8e8e5", background:"rgba(250,250,249,0.95)", position:"sticky", top:0, zIndex:100, backdropFilter:"blur(8px)", fontFamily:"'Geist', sans-serif" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, background:"#1a1a1a", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:13, fontWeight:700, fontFamily:"'Libre Baskerville', serif" }}>P</div>
          <span style={{ fontFamily:"'Libre Baskerville', serif", fontWeight:700, fontSize:17, letterSpacing:"-0.01em", color:"#111110" }}>Pulse</span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {[["Analyze","/"],["Competitor Research","/clients"],["CSV Upload","/upload"],["Dashboard","/dashboard"]].map(([label,href])=>(
            <a key={href} href={href} className="nav-link" style={{ padding:"7px 16px", border:"1px solid #e8e8e5", borderRadius:8, color:href==="/upload"?"#111110":"#6b6b63", fontWeight:href==="/upload"?600:500, background:href==="/upload"?"white":"transparent", fontSize:13, textDecoration:"none" }}>{label}</a>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth:1100, margin:"0 auto", padding:"40px 24px 80px", fontFamily:"'Geist', sans-serif" }}>

        {step==="upload" && (
          <>
            <div style={{ marginBottom:32 }}>
              <div style={{ fontFamily:"'Geist Mono', monospace", fontSize:11, color:C.blue, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>CSV Upload</div>
              <h1 style={{ fontFamily:"'Libre Baskerville', serif", fontSize:30, fontWeight:700, color:C.textPrimary, letterSpacing:"-0.02em", marginBottom:8 }}>Upload any review CSV</h1>
              <p style={{ fontSize:15, color:C.textSecondary, lineHeight:1.7, maxWidth:560 }}>Drop a raw reviews file for an instant location dashboard, or drop an analyses export to aggregate your intelligence across all sources.</p>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:32 }}>
              {[
                { icon:"", title:"Raw reviews CSV", desc:"BirdEye, Podium, Google export. Instant dashboard grouped by any column.", tags:["Review Rating","Review Comment","Location","Region"] },
                { icon:"", title:"Analyses export", desc:"Your Supabase analyses table. Aggregate themes, pain points, competitors across all runs.", tags:["overall_sentiment","sentiment_score","themes","pain_points"] },
              ].map(card=>(
                <div key={card.title} style={{ padding:20, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontWeight:700, fontSize:14, color:C.textPrimary, marginBottom:6 }}>{card.title}</div>
                  <div style={{ fontSize:13, color:C.textSecondary, lineHeight:1.6, marginBottom:12 }}>{card.desc}</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {card.tags.map(t=><span key={t} style={{ padding:"2px 8px", background:C.bgMuted, border:`1px solid ${C.border}`, borderRadius:20, fontSize:10, color:C.textDim, fontFamily:"'Geist Mono', monospace" }}>{t}</span>)}
                  </div>
                </div>
              ))}
            </div>
            <div className="drop-zone" onClick={()=>fileRef.current?.click()} onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}} style={{ border:"2px dashed #e8e8e5", borderRadius:16, padding:"48px 40px", textAlign:"center", cursor:"pointer", background:C.bgCard, transition:"all 0.2s" }}>
              <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:18, fontWeight:700, color:C.textPrimary, marginBottom:6 }}>Drop your CSV here</div>
              <p style={{ color:C.textSecondary, fontSize:14 }}>Auto-detects file type. No configuration needed.</p>
              <input ref={fileRef} type="file" accept=".csv" style={{ display:"none" }} onChange={(e)=>handleFile(e.target.files[0])} />
            </div>
          </>
        )}

        {step==="dashboard" && fileType==="analyses" && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, gap:8 }}>
              <a href={`/dashboard${selectedClientId ? `?client_id=${selectedClientId}` : ""}`} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 18px", background:"#1a1a1a", borderRadius:9, textDecoration:"none" }}>
                <span style={{ color:"white", fontWeight:600, fontSize:13, fontFamily:"'Geist', sans-serif" }}>View in Dashboard →</span>
              </a>
              <button onClick={()=>{setStep("upload");setRows([]);setFile(null);}} style={{ padding:"7px 14px", border:`1px solid ${C.border}`, borderRadius:8, background:"white", color:C.textSecondary, fontSize:12, cursor:"pointer", fontFamily:"'Geist', sans-serif" }}>New file</button>
            </div>
            <AnalysesDashboard rows={rows} filename={file?.name||"analyses"} />
          </>
        )}

        {step==="dashboard" && (fileType==="reviews"||fileType==="generic") && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
              <div>
                <h1 style={{ fontFamily:"'Libre Baskerville', serif", fontSize:26, fontWeight:700, color:C.textPrimary, letterSpacing:"-0.02em", margin:0 }}>{file?.name}</h1>
                <div style={{ fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace", marginTop:4 }}>{totalReviews.toLocaleString()} reviews - {stats.length} groups - avg {overallAvg} stars</div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  {!showNewClient ? (
                    <select
                      value={selectedClientId}
                      onChange={(e) => {
                        if (e.target.value === "__new__") { setShowNewClient(true); setSelectedClientId(""); }
                        else setSelectedClientId(e.target.value);
                      }}
                      style={{ padding:"7px 10px", borderRadius:8, border:`1px solid ${C.border}`, background:"white", color: selectedClientId ? C.textPrimary : C.textDim, fontSize:12, fontFamily:"'Geist', sans-serif", outline:"none", cursor:"pointer" }}
                    >
                      <option value="">Tag to client...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      <option value="__new__">＋ New client</option>
                    </select>
                  ) : (
                    <div style={{ display:"flex", gap:4 }}>
                      <input autoFocus value={newClientName} onChange={e=>setNewClientName(e.target.value)}
                        onKeyDown={e=>{ if(e.key==="Enter") createClient(); if(e.key==="Escape"){setShowNewClient(false);setNewClientName("");} }}
                        placeholder="Client name..." style={{ padding:"7px 10px", borderRadius:8, border:`1px solid ${C.blue}`, background:"white", color:C.textPrimary, fontSize:12, fontFamily:"'Geist', sans-serif", outline:"none", width:150 }} />
                      <button onClick={createClient} disabled={creatingClient||!newClientName.trim()} style={{ padding:"7px 12px", borderRadius:8, background:C.blue, color:"white", border:"none", fontSize:12, cursor:"pointer" }}>{creatingClient?"...":"Save"}</button>
                      <button onClick={()=>{setShowNewClient(false);setNewClientName("");}} style={{ padding:"7px 8px", borderRadius:8, background:"transparent", color:C.textDim, border:`1px solid ${C.border}`, fontSize:12, cursor:"pointer" }}>✕</button>
                    </div>
                  )}
                </div>
                <a href={`/dashboard${selectedClientId ? `?client_id=${selectedClientId}` : ""}`} style={{ padding:"7px 16px", background:"#1a1a1a", borderRadius:8, color:"white", fontSize:12, fontWeight:600, textDecoration:"none", fontFamily:"'Geist', sans-serif", whiteSpace:"nowrap" }}>View Dashboard →</a>
                <button onClick={()=>{setStep("upload");setRows([]);setStats([]);setFile(null);}} style={{ padding:"7px 14px", border:`1px solid ${C.border}`, borderRadius:8, background:"white", color:C.textSecondary, fontSize:12, cursor:"pointer", fontFamily:"'Geist', sans-serif" }}>New file</button>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginBottom:24 }}>
              {[
                { label:"Overall avg", value:overallAvg+" stars", color:overallAvg>=4.5?"#16a34a":overallAvg>=3.5?"#d97706":"#dc2626" },
                { label:"Total reviews", value:totalReviews.toLocaleString(), color:C.blue },
                { label:"Healthy", value:healthyCount, color:"#16a34a" },
                { label:"Critical", value:criticalCount, color:"#dc2626" },
              ].map(kpi=>(
                <div key={kpi.label} style={{ padding:18, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:26, fontWeight:700, color:kpi.color }}>{kpi.value}</div>
                  <div style={{ fontSize:11, color:C.textDim, marginTop:4, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.05em" }}>{kpi.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace" }}>Group by</span>
                <select value={groupBy} onChange={(e)=>handleGroupByChange(e.target.value)} style={{ padding:"7px 12px", border:`1px solid ${C.border}`, borderRadius:8, background:"white", color:C.textPrimary, fontSize:12, cursor:"pointer", fontFamily:"'Geist', sans-serif", outline:"none", fontWeight:500 }}>
                  {availableColumns.map(col=><option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} style={{ padding:"7px 12px", border:`1px solid ${C.border}`, borderRadius:8, background:"white", color:C.textSecondary, fontSize:12, cursor:"pointer", fontFamily:"'Geist', sans-serif", outline:"none" }}>
                <option value="avg_asc">Worst first</option>
                <option value="avg_desc">Best first</option>
                <option value="negative">Most negative %</option>
                <option value="volume">Most reviews</option>
              </select>
              <input type="text" placeholder="Filter..." value={filterText} onChange={(e)=>setFilterText(e.target.value)} style={{ padding:"7px 12px", border:`1px solid ${C.border}`, borderRadius:8, background:"white", color:C.textPrimary, fontSize:12, fontFamily:"'Geist', sans-serif", outline:"none", width:200 }} />
              <div style={{ marginLeft:"auto", fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace" }}>{sorted.length} of {stats.length} groups</div>
            </div>

            <div>
              {sorted.map(loc=>(
                <LocationRow key={loc.name} loc={loc} onDeepDive={runDeepDive} deepDiveResult={deepDiveResults[loc.name]} deepDiving={!!deepDiving[loc.name]} />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}