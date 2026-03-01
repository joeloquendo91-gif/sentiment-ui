"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";

const C = {
  bg: "#fafaf9", bgCard: "#ffffff", bgMuted: "#f4f4f2",
  border: "#e8e8e5", blue: "#2563eb",
  textPrimary: "#111110", textSecondary: "#6b6b63", textDim: "#a8a89e",
};
const SENTIMENT_COLOR = { positive: "#16a34a", negative: "#dc2626", mixed: "#d97706", neutral: "#6b7280" };
const SENTIMENT_BG = { positive: "#f0fdf4", negative: "#fef2f2", mixed: "#fffbeb", neutral: "#f9fafb" };
const SENTIMENT_BORDER = { positive: "#bbf7d0", negative: "#fecaca", mixed: "#fde68a", neutral: "#e5e7eb" };
const SOURCE_COLOR = { google: "#4285f4", yelp: "#d32323", healthgrades: "#2a7bb5", reddit: "#ff4500", trustpilot: "#00b67a", other: "#6b7280" };

function safeJSON(val) { if (Array.isArray(val)) return val; try { return JSON.parse(val) || []; } catch { return []; } }

function FreqBar({ label, count, max, color }) {
  const pct = max ? Math.round((count/max)*100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:13, color:C.textSecondary }}>{label.replace(/_/g," ")}</span>
        <span style={{ fontSize:12, color:C.textDim, fontFamily:"monospace" }}>{count}</span>
      </div>
      <div style={{ height:6, background:C.bgMuted, borderRadius:3, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color||C.blue, borderRadius:3, transition:"width 0.4s ease" }} />
      </div>
    </div>
  );
}

function SentimentBadge({ sentiment }) {
  return (
    <span style={{ padding:"2px 10px", background:SENTIMENT_BG[sentiment]||"#f9fafb", border:`1px solid ${SENTIMENT_BORDER[sentiment]||"#e5e7eb"}`, borderRadius:20, fontSize:11, color:SENTIMENT_COLOR[sentiment]||"#6b7280", fontWeight:600, whiteSpace:"nowrap" }}>
      {sentiment}
    </span>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div style={{ marginBottom:32 }}>
      <div style={{ marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Libre Baskerville', serif", fontSize:18, fontWeight:700, color:C.textPrimary, margin:0, letterSpacing:"-0.01em" }}>{title}</h2>
        {subtitle && <p style={{ fontSize:13, color:C.textDim, marginTop:4, fontFamily:"'Geist Mono', monospace" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ padding:24, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", ...style }}>
      {children}
    </div>
  );
}

function DashboardInner() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const searchParams = useSearchParams();
  const [analyses, setAnalyses] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { if (selectedClient) fetchClientData(selectedClient); }, [selectedClient]);

  async function fetchClients() {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setClients(list);
      const urlClientId = searchParams.get("client_id");
      if (urlClientId && list.find(c => c.id === urlClientId)) {
        setSelectedClient(urlClientId);
      } else {
        // Don't auto-select — let user choose
        setLoading(false);
      }
    } catch(err) {
      console.error("Failed to fetch clients:", err);
      setLoading(false);
    }
  }

  async function fetchClientData(clientId) {
    setLoading(true);
    try {
      const [analysesRes, competitorsRes, insightsRes] = await Promise.all([
        fetch(`/api/analyses?client_id=${clientId}`),
        fetch(`/api/competitors?client_id=${clientId}`),
        fetch(`/api/insights?client_id=${clientId}`),
      ]);
      const analysesData = await analysesRes.json().catch(()=>[]);
      const competitorsData = await competitorsRes.json().catch(()=>[]);
      const insightsData = await insightsRes.json().catch(()=>null);
      setAnalyses(Array.isArray(analysesData) ? analysesData : []);
      setCompetitors(Array.isArray(competitorsData) ? competitorsData : []);
      setInsights(insightsData);
    } catch(err) {
      console.error("Failed to fetch client data:", err);
    }
    setLoading(false);
  }

  async function generateInsights() {
    if (!selectedClient || !clientAnalyses.length) return;
    setGeneratingInsights(true);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: selectedClient,
          client_name: currentClient?.name,
          analyses: clientAnalyses,
        }),
      });
      const data = await res.json();
      setInsights(data);
    } catch (err) {
      console.error("Failed to generate insights:", err);
    }
    setGeneratingInsights(false);
  }

  // ── Compute aggregates ──────────────────────────────────────
  const clientAnalyses = analyses.filter(a => a.client_id && !a.competitor_id);
  const competitorAnalyses = analyses.filter(a => a.competitor_id);

  const scores = clientAnalyses.map(a => parseFloat(a.sentiment_score)).filter(s => !isNaN(s));
  const avgScore = scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1) : "—";

  const sentimentCounts = { positive:0, negative:0, mixed:0, neutral:0 };
  clientAnalyses.forEach(a => { if (sentimentCounts[a.overall_sentiment]!==undefined) sentimentCounts[a.overall_sentiment]++; });

  // By platform
  const platformData = {};
  clientAnalyses.forEach(a => {
    const src = a.source_type || "other";
    if (!platformData[src]) platformData[src] = { name: src, positive:0, negative:0, mixed:0, neutral:0, total:0, scores:[] };
    platformData[src][a.overall_sentiment] = (platformData[src][a.overall_sentiment]||0)+1;
    platformData[src].total++;
    const s = parseFloat(a.sentiment_score);
    if (!isNaN(s)) platformData[src].scores.push(s);
  });
  const platforms = Object.values(platformData).map(p => ({
    ...p,
    avg: p.scores.length ? Math.round(p.scores.reduce((a,b)=>a+b,0)/p.scores.length*10)/10 : null,
    pctNegative: p.total ? Math.round((p.negative/p.total)*100) : 0,
    pctPositive: p.total ? Math.round((p.positive/p.total)*100) : 0,
  }));

  // Themes
  const themeCount = {};
  clientAnalyses.forEach(a => safeJSON(a.themes).forEach(t => { themeCount[t]=(themeCount[t]||0)+1; }));
  const topThemes = Object.entries(themeCount).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxTheme = topThemes[0]?.[1]||1;

  // Pain + Praise
  const painCount = {};
  const praiseCount = {};
  clientAnalyses.forEach(a => {
    safeJSON(a.pain_points).forEach(p => { painCount[p]=(painCount[p]||0)+1; });
    safeJSON(a.praise_points).forEach(p => { praiseCount[p]=(praiseCount[p]||0)+1; });
  });
  const topPains = Object.entries(painCount).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const topPraise = Object.entries(praiseCount).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const maxPain = topPains[0]?.[1]||1;
  const maxPraise = topPraise[0]?.[1]||1;

  // Key quotes
  const keyQuotes = clientAnalyses.filter(a=>a.key_quote).slice(0,4);

  // Competitor comparison
  const competitorGroups = {};
  competitorAnalyses.forEach(a => {
    const comp = competitors.find(c=>c.id===a.competitor_id);
    if (!comp) return;
    if (!competitorGroups[comp.id]) competitorGroups[comp.id] = { name:comp.name, analyses:[], scores:[], sentiments:{} };
    competitorGroups[comp.id].analyses.push(a);
    const s = parseFloat(a.sentiment_score);
    if (!isNaN(s)) competitorGroups[comp.id].scores.push(s);
    const sent = a.overall_sentiment;
    competitorGroups[comp.id].sentiments[sent]=(competitorGroups[comp.id].sentiments[sent]||0)+1;
  });
  const competitorSummaries = Object.values(competitorGroups).map(g => ({
    ...g,
    avg: g.scores.length ? Math.round(g.scores.reduce((a,b)=>a+b,0)/g.scores.length*10)/10 : null,
    dominant: Object.entries(g.sentiments).sort((a,b)=>b[1]-a[1])[0]?.[0]||"neutral",
  }));

  const sentimentPieData = Object.entries(sentimentCounts).filter(([,v])=>v>0).map(([name,value])=>({name,value}));

  const currentClient = clients.find(c=>c.id===selectedClient);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fafaf9; }
        .nav-link:hover { border-color: #d0d0cb !important; color: #111110 !important; }
        .client-tab:hover { background: #f4f4f2 !important; }
      `}</style>

      {/* NAV */}
      <nav style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 48px", borderBottom:"1px solid #e8e8e5", background:"rgba(250,250,249,0.95)", position:"sticky", top:0, zIndex:100, backdropFilter:"blur(8px)", fontFamily:"'Geist', sans-serif" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, background:"#1a1a1a", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:13, fontWeight:700, fontFamily:"'Libre Baskerville', serif" }}>P</div>
          <span style={{ fontFamily:"'Libre Baskerville', serif", fontWeight:700, fontSize:17, letterSpacing:"-0.01em", color:"#111110" }}>Pulse</span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {[["Analyze","/"],["Competitor Research","/clients"],["CSV Upload","/upload"],["Dashboard","/dashboard"]].map(([label,href])=>(
            <a key={href} href={href} className="nav-link" style={{ padding:"7px 16px", border:"1px solid #e8e8e5", borderRadius:8, color:href==="/dashboard"?"#111110":"#6b6b63", fontSize:13, fontWeight:href==="/dashboard"?600:500, textDecoration:"none", background:href==="/dashboard"?"white":"transparent" }}>{label}</a>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth:1100, margin:"0 auto", padding:"40px 24px 80px", fontFamily:"'Geist', sans-serif" }}>

        {/* Header + client selector */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:32 }}>
          <div>
            <div style={{ fontFamily:"'Geist Mono', monospace", fontSize:11, color:C.blue, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Intelligence Dashboard</div>
            <h1 style={{ fontFamily:"'Libre Baskerville', serif", fontSize:28, fontWeight:700, color:C.textPrimary, letterSpacing:"-0.02em", margin:0 }}>
              {currentClient?.name || "Dashboard"}
            </h1>
            {currentClient && (
              <div style={{ fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace", marginTop:6 }}>
                {currentClient.location} · {currentClient.industry} · {clientAnalyses.length} analyses
              </div>
            )}
          </div>
          {clients.length > 1 && (
            <select value={selectedClient||""} onChange={e=>setSelectedClient(e.target.value)} style={{ padding:"8px 14px", border:`1px solid ${C.border}`, borderRadius:8, background:"white", color:C.textPrimary, fontSize:13, cursor:"pointer", fontFamily:"'Geist', sans-serif", outline:"none" }}>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:C.textDim, fontFamily:"'Geist Mono', monospace", fontSize:12 }}>Loading...</div>
        ) : !selectedClient ? (
          <div style={{ textAlign:"center", padding:"80px 24px" }}>
            <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:26, fontWeight:700, color:C.textPrimary, marginBottom:10 }}>Select a client to get started</div>
            <p style={{ fontSize:14, color:C.textDim, marginBottom:36, maxWidth:400, margin:"0 auto 36px" }}>Choose a client from the dropdown above to load their intelligence dashboard.</p>
            {clients.length === 0 ? (
              <div>
                <p style={{ fontSize:13, color:C.textDim, marginBottom:20 }}>No clients yet. Create one first.</p>
                <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
                  <a href="/clients" style={{ padding:"10px 20px", background:"#1a1a1a", color:"white", borderRadius:8, textDecoration:"none", fontSize:13, fontWeight:600 }}>Competitor Research →</a>
                  <a href="/upload" style={{ padding:"10px 20px", border:`1px solid ${C.border}`, background:"white", color:C.textPrimary, borderRadius:8, textDecoration:"none", fontSize:13, fontWeight:600 }}>CSV Upload →</a>
                </div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:360, margin:"0 auto" }}>
                {clients.map(c=>(
                  <button key={c.id} onClick={()=>setSelectedClient(c.id)} style={{ padding:"14px 20px", background:"white", border:`1px solid ${C.border}`, borderRadius:10, cursor:"pointer", fontFamily:"'Geist', sans-serif", fontSize:14, fontWeight:600, color:C.textPrimary, textAlign:"left", display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", transition:"all 0.15s" }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#2563eb"; e.currentTarget.style.background="#f8faff";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background="white";}}>
                    <span>{c.name}</span>
                    <span style={{ color:C.textDim, fontSize:12 }}>→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : clientAnalyses.length === 0 && competitorAnalyses.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0" }}>
            <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:20, color:C.textDim, marginBottom:8 }}>No data yet for {currentClient?.name}</div>
            <p style={{ fontSize:14, color:C.textDim, marginBottom:24 }}>Scrape competitor URLs or upload a CSV tagged to this client.</p>
            <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
              <a href="/clients" style={{ padding:"9px 18px", background:"#1a1a1a", color:"white", borderRadius:8, textDecoration:"none", fontSize:13, fontWeight:600 }}>Competitor Research →</a>
              <a href="/upload" style={{ padding:"9px 18px", border:`1px solid ${C.border}`, background:"white", color:C.textPrimary, borderRadius:8, textDecoration:"none", fontSize:13, fontWeight:600 }}>CSV Upload →</a>
            </div>
          </div>
        ) : (
          <>
            {/* ── KPIs ── */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:32 }}>
              {[
                { label:"Avg Sentiment Score", value:avgScore+"/10", color:parseFloat(avgScore)>=7?"#16a34a":parseFloat(avgScore)>=5?"#d97706":"#dc2626" },
                { label:"Positive", value:sentimentCounts.positive, color:"#16a34a" },
                { label:"Mixed / Neutral", value:(sentimentCounts.mixed||0)+(sentimentCounts.neutral||0), color:"#d97706" },
                { label:"Negative", value:sentimentCounts.negative, color:"#dc2626" },
              ].map(kpi=>(
                <Card key={kpi.label} style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:28, fontWeight:700, color:kpi.color, lineHeight:1 }}>{kpi.value}</div>
                  <div style={{ fontSize:11, color:C.textDim, marginTop:6, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.05em" }}>{kpi.label}</div>
                </Card>
              ))}
            </div>

            {/* ── Sentiment + Platform ── */}
            <Section title="Sentiment Overview" subtitle="How patients feel across all analyzed sources">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:14 }}>
                <Card>
                  <div style={{ fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:14 }}>Breakdown</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={sentimentPieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} style={{ fontSize:11 }}>
                        {sentimentPieData.map(entry=><Cell key={entry.name} fill={SENTIMENT_COLOR[entry.name]||C.textDim} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontFamily:"'Geist', sans-serif", fontSize:12, border:`1px solid ${C.border}`, borderRadius:8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
                <Card>
                  <div style={{ fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:14 }}>By Platform</div>
                  {platforms.length === 0 ? (
                    <div style={{ fontSize:13, color:C.textDim, padding:"24px 0", textAlign:"center" }}>No platform data yet</div>
                  ) : platforms.map(p=>(
                    <div key={p.name} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                      <div style={{ width:10, height:10, borderRadius:2, background:SOURCE_COLOR[p.name]||"#6b7280", flexShrink:0 }} />
                      <div style={{ minWidth:100, fontSize:13, fontWeight:500, color:C.textPrimary, textTransform:"capitalize" }}>{p.name}</div>
                      <div style={{ flex:1, display:"flex", gap:2, height:18, borderRadius:4, overflow:"hidden" }}>
                        {[["positive","#16a34a"],["mixed","#d97706"],["neutral","#d1d5db"],["negative","#dc2626"]].map(([k,color])=> p[k]>0 && (
                          <div key={k} title={`${k}: ${p[k]}`} style={{ width:`${Math.round((p[k]/p.total)*100)}%`, background:color, transition:"width 0.3s" }} />
                        ))}
                      </div>
                      <div style={{ fontSize:12, color:C.textDim, fontFamily:"monospace", minWidth:50, textAlign:"right" }}>{p.total} reviews</div>
                      {p.avg && <div style={{ fontSize:13, fontFamily:"'Libre Baskerville', serif", fontWeight:700, color:p.avg>=7?"#16a34a":p.avg>=5?"#d97706":"#dc2626", minWidth:40, textAlign:"right" }}>{p.avg}/10</div>}
                    </div>
                  ))}
                </Card>
              </div>
            </Section>

            {/* ── Themes + Pain/Praise ── */}
            <Section title="What Patients Are Talking About" subtitle="Recurring themes and feedback patterns across all sources">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
                <Card>
                  <div style={{ fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:14 }}>Top Themes</div>
                  {topThemes.length===0 ? <div style={{ fontSize:13, color:C.textDim }}>No data yet</div>
                    : topThemes.map(([t,c])=><FreqBar key={t} label={t} count={c} max={maxTheme} color={C.blue} />)}
                </Card>
                <Card style={{ background:"#fef2f2", border:"1px solid #fecaca" }}>
                  <div style={{ fontSize:12, color:"#dc2626", fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:14 }}>Pain Points</div>
                  {topPains.length===0 ? <div style={{ fontSize:13, color:C.textDim }}>No data yet</div>
                    : topPains.map(([p,c])=><FreqBar key={p} label={p} count={c} max={maxPain} color="#dc2626" />)}
                </Card>
                <Card style={{ background:"#f0fdf4", border:"1px solid #bbf7d0" }}>
                  <div style={{ fontSize:12, color:"#16a34a", fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:14 }}>Praise Points</div>
                  {topPraise.length===0 ? <div style={{ fontSize:13, color:C.textDim }}>No data yet</div>
                    : topPraise.map(([p,c])=><FreqBar key={p} label={p} count={c} max={maxPraise} color="#16a34a" />)}
                </Card>
              </div>
            </Section>

            {/* ── Key Quotes ── */}
            {keyQuotes.length > 0 && (
              <Section title="Patient Voices" subtitle="Representative quotes from across all sources">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  {keyQuotes.map((a,i)=>(
                    <Card key={i} style={{ position:"relative" }}>
                      <div style={{ fontSize:32, color:C.border, fontFamily:"Georgia, serif", lineHeight:1, marginBottom:8 }}>"</div>
                      <p style={{ fontSize:14, color:C.textSecondary, lineHeight:1.75, marginBottom:14, fontStyle:"italic" }}>{a.key_quote}</p>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:11, color:C.textDim, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.05em" }}>{a.source_type}</span>
                        <SentimentBadge sentiment={a.overall_sentiment} />
                      </div>
                    </Card>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Competitor Comparison ── */}
            {competitorSummaries.length > 0 && (
              <Section title="Competitor Comparison" subtitle="How competitors are perceived vs your client">
                <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(competitorSummaries.length+1,3)},1fr)`, gap:14 }}>
                  {/* Client card */}
                  <Card style={{ border:`2px solid ${C.blue}`, position:"relative" }}>
                    <div style={{ position:"absolute", top:12, right:12 }}>
                      <span style={{ padding:"2px 8px", background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:20, fontSize:10, color:C.blue, fontWeight:600 }}>YOUR CLIENT</span>
                    </div>
                    <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:22, fontWeight:700, color:C.blue, marginBottom:4 }}>{avgScore}/10</div>
                    <div style={{ fontWeight:600, fontSize:14, color:C.textPrimary, marginBottom:8 }}>{currentClient?.name}</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {Object.entries(sentimentCounts).filter(([,v])=>v>0).map(([s,v])=>(
                        <span key={s} style={{ padding:"2px 8px", background:SENTIMENT_BG[s], border:`1px solid ${SENTIMENT_BORDER[s]}`, borderRadius:20, fontSize:11, color:SENTIMENT_COLOR[s], fontWeight:500 }}>{v} {s}</span>
                      ))}
                    </div>
                  </Card>

                  {/* Competitor cards */}
                  {competitorSummaries.map(comp=>(
                    <Card key={comp.name}>
                      <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:22, fontWeight:700, color:SENTIMENT_COLOR[comp.dominant]||C.textDim, marginBottom:4 }}>{comp.avg||"—"}/10</div>
                      <div style={{ fontWeight:600, fontSize:14, color:C.textPrimary, marginBottom:8 }}>{comp.name}</div>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                        {Object.entries(comp.sentiments).map(([s,v])=>(
                          <span key={s} style={{ padding:"2px 8px", background:SENTIMENT_BG[s], border:`1px solid ${SENTIMENT_BORDER[s]}`, borderRadius:20, fontSize:11, color:SENTIMENT_COLOR[s], fontWeight:500 }}>{v} {s}</span>
                        ))}
                      </div>
                      {comp.analyses[0]?.summary && (
                        <p style={{ fontSize:12, color:C.textSecondary, lineHeight:1.6 }}>{comp.analyses[0].summary.slice(0,120)}...</p>
                      )}
                    </Card>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Insights ── */}
            <Section
              title="Strategic Insights"
              subtitle={insights ? `Generated ${insights.generated_at?.slice(0,10)} · ${(insights.recommendations||[]).length} recommendations · ${(insights.patient_prompts||[]).length} patient prompts` : "AI-generated recommendations and patient concern analysis"}
            >
              {/* Executive summary + generate button */}
              <Card style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:20 }}>
                  <div style={{ flex:1 }}>
                    {insights?.summary ? (
                      <>
                        <div style={{ fontSize:11, color:C.blue, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Executive Summary</div>
                        <p style={{ fontSize:14, color:C.textSecondary, lineHeight:1.8 }}>{insights.summary}</p>
                      </>
                    ) : (
                      <div>
                        <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:16, color:C.textPrimary, marginBottom:4 }}>No insights generated yet</div>
                        <p style={{ fontSize:13, color:C.textDim }}>Generate AI insights to get platform-specific recommendations and patient concern analysis.</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={generateInsights}
                    disabled={generatingInsights || !clientAnalyses.length}
                    style={{ padding:"9px 18px", background: generatingInsights || !clientAnalyses.length ? "#9ca3af" : "#1a1a1a", color:"white", border:"none", borderRadius:9, fontSize:13, fontWeight:600, cursor: generatingInsights ? "wait" : "pointer", fontFamily:"'Geist', sans-serif", whiteSpace:"nowrap", flexShrink:0 }}
                  >
                    {generatingInsights ? "Generating..." : insights ? "↻ Regenerate" : "Generate Insights"}
                  </button>
                </div>
              </Card>

              {insights && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  {/* Recommendations */}
                  <div>
                    <div style={{ fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Recommendations</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {(insights.recommendations||[]).map((r,i)=>(
                        <Card key={i} style={{ padding:16 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                            <span style={{ fontSize:12, fontWeight:600, color:C.textPrimary, fontFamily:"'Geist Mono', monospace" }}>{r.platform}</span>
                            <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:600, fontFamily:"'Geist Mono', monospace",
                              background: r.priority==="high"?"#fef2f2":r.priority==="medium"?"#fffbeb":"#f0fdf4",
                              color: r.priority==="high"?"#dc2626":r.priority==="medium"?"#d97706":"#16a34a",
                              border: `1px solid ${r.priority==="high"?"#fecaca":r.priority==="medium"?"#fde68a":"#bbf7d0"}`
                            }}>{r.priority}</span>
                          </div>
                          <p style={{ fontSize:13, color:C.textPrimary, lineHeight:1.6, marginBottom:6 }}>{r.action}</p>
                          <p style={{ fontSize:12, color:C.textDim, lineHeight:1.5 }}>{r.rationale}</p>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Patient Prompts */}
                  <div>
                    <div style={{ fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Patient Concern Prompts</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {(insights.patient_prompts||[]).map((p,i)=>(
                        <Card key={i} style={{ padding:16 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:C.textPrimary, marginBottom:6, lineHeight:1.5 }}>"{p.question}"</div>
                          <div style={{ fontSize:11, color:C.blue, fontFamily:"'Geist Mono', monospace", marginBottom:6 }}>{p.theme}</div>
                          <p style={{ fontSize:12, color:C.textDim, lineHeight:1.5 }}>{p.opportunity}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Section>
          </>
        )}
      </main>
    </>
  );
}

export default function Dashboard() {
  return <Suspense fallback={<div style={{ padding:80, textAlign:"center", color:"#a8a89e", fontFamily:"'Geist Mono', monospace", fontSize:12 }}>Loading...</div>}><DashboardInner /></Suspense>;
}