"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const C = {
  bg: "#fafaf9", bgCard: "#ffffff", bgMuted: "#f4f4f2",
  border: "#e8e8e5", blue: "#2563eb",
  textPrimary: "#111110", textSecondary: "#6b6b63", textDim: "#a8a89e",
};
const sentimentColor = { positive:"#16a34a", negative:"#dc2626", mixed:"#d97706", neutral:"#6b7280" };
const sentimentBg = { positive:"#f0fdf4", negative:"#fef2f2", mixed:"#fffbeb", neutral:"#f9fafb" };
const sentimentBorder = { positive:"#bbf7d0", negative:"#fecaca", mixed:"#fde68a", neutral:"#e5e7eb" };

export default function ClientDetailPage({ params }) {
  const { id } = params;
  const [client, setClient] = useState(null);
  const [competitors, setCompetitors] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [showCompForm, setShowCompForm] = useState(false);
  const [compForm, setCompForm] = useState({ name:"", location:"", notes:"" });
  const [savingComp, setSavingComp] = useState(false);

  // Scrape state per competitor
  const [scrapeUrls, setScrapeUrls] = useState({});
  const [scraping, setScraping] = useState({});
  const [scrapeResults, setScrapeResults] = useState({});

  useEffect(() => { fetchAll(); }, [id]);

  async function fetchAll() {
    setLoading(true);
    const [{ data: clientData }, { data: compData }, { data: analysesData }] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase.from("competitors").select("*").eq("client_id", id).order("created_at", { ascending: true }),
      supabase.from("analyses").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    ]);
    setClient(clientData);
    setCompetitors(compData || []);
    setAnalyses(analysesData || []);
    setLoading(false);
  }

  async function addCompetitor() {
    if (!compForm.name.trim()) return;
    setSavingComp(true);
    await supabase.from("competitors").insert({
      client_id: id,
      name: compForm.name.trim(),
      location: compForm.location.trim() || null,
      notes: compForm.notes.trim() || null,
    });
    setCompForm({ name:"", location:"", notes:"" });
    setShowCompForm(false);
    setSavingComp(false);
    fetchAll();
  }

  async function deleteCompetitor(compId) {
    if (!confirm("Delete this competitor and their analyses?")) return;
    await supabase.from("competitors").delete().eq("id", compId);
    fetchAll();
  }

  async function scrapeCompetitor(competitor) {
    const url = scrapeUrls[competitor.id]?.trim();
    if (!url) return;
    setScraping(prev => ({...prev, [competitor.id]: true}));
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          competitor_id: competitor.id,
          client_id: id,
          project_name: client?.name || "default",
        }),
      });
      const data = await res.json();
      setScrapeResults(prev => ({...prev, [competitor.id]: data}));
      setScrapeUrls(prev => ({...prev, [competitor.id]: ""}));
      fetchAll();
    } catch(err) {
      setScrapeResults(prev => ({...prev, [competitor.id]: { error: err.message }}));
    }
    setScraping(prev => ({...prev, [competitor.id]: false}));
  }

  // Group analyses by competitor_id
  const analysesByCompetitor = {};
  analyses.forEach(a => {
    if (a.competitor_id) {
      if (!analysesByCompetitor[a.competitor_id]) analysesByCompetitor[a.competitor_id] = [];
      analysesByCompetitor[a.competitor_id].push(a);
    }
  });

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"'Geist', sans-serif", color:C.textDim, fontSize:13 }}>Loading...</div>
  );

  if (!client) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"'Geist', sans-serif", color:C.textDim, fontSize:13 }}>Client not found.</div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fafaf9; }
        .nav-link:hover { border-color: #d0d0cb !important; color: #111110 !important; }
        .btn-primary:hover { background: #1d4ed8 !important; }
        .btn-ghost:hover { border-color: #d0d0cb !important; }
      `}</style>

      <nav style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 48px", borderBottom:"1px solid #e8e8e5", background:"rgba(250,250,249,0.95)", position:"sticky", top:0, zIndex:100, backdropFilter:"blur(8px)", fontFamily:"'Geist', sans-serif" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, background:"#1a1a1a", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:13, fontWeight:700, fontFamily:"'Libre Baskerville', serif" }}>P</div>
          <span style={{ fontFamily:"'Libre Baskerville', serif", fontWeight:700, fontSize:17, letterSpacing:"-0.01em", color:"#111110" }}>Pulse</span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {[["Analyze","/"],["Clients","/clients"],["CSV Upload","/upload"],["Dashboard","/dashboard"]].map(([label,href])=>(
            <a key={href} href={href} className="nav-link" style={{ padding:"7px 16px", border:"1px solid #e8e8e5", borderRadius:8, color:"#6b6b63", fontSize:13, fontWeight:500, textDecoration:"none" }}>{label}</a>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth:900, margin:"0 auto", padding:"40px 24px 80px", fontFamily:"'Geist', sans-serif" }}>

        {/* Breadcrumb */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:32, fontSize:13, color:C.textDim }}>
          <a href="/clients" style={{ color:C.textDim, textDecoration:"none" }}>Clients</a>
          <span>/</span>
          <span style={{ color:C.textPrimary }}>{client.name}</span>
        </div>

        {/* Client header */}
        <div style={{ padding:24, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, marginBottom:32, boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontFamily:"'Geist Mono', monospace", fontSize:11, color:C.blue, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Client</div>
              <h1 style={{ fontFamily:"'Libre Baskerville', serif", fontSize:26, fontWeight:700, color:C.textPrimary, letterSpacing:"-0.02em", marginBottom:10 }}>{client.name}</h1>
              <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                {client.location && <span style={{ fontSize:13, color:C.textSecondary, fontFamily:"'Geist Mono', monospace" }}>{client.location}</span>}
                {client.industry && <span style={{ fontSize:13, color:C.textSecondary, fontFamily:"'Geist Mono', monospace" }}>{client.industry}</span>}
              </div>
              {client.notes && <p style={{ fontSize:13, color:C.textSecondary, marginTop:10, lineHeight:1.6 }}>{client.notes}</p>}
            </div>
            <div style={{ fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace", textAlign:"right" }}>
              <div>{competitors.length} competitor{competitors.length!==1?"s":""}</div>
              <div>{analyses.length} analys{analyses.length!==1?"es":"is"}</div>
            </div>
          </div>
        </div>

        {/* Competitors section */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <h2 style={{ fontFamily:"'Libre Baskerville', serif", fontSize:20, fontWeight:700, color:C.textPrimary }}>Competitors</h2>
            <p style={{ fontSize:13, color:C.textSecondary, marginTop:4 }}>Scrape any competitor's review page and save the analysis.</p>
          </div>
          <button onClick={()=>setShowCompForm(!showCompForm)} className="btn-primary" style={{ padding:"8px 16px", background:C.blue, color:"white", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'Geist', sans-serif" }}>
            + Add Competitor
          </button>
        </div>

        {/* Add competitor form */}
        {showCompForm && (
          <div style={{ padding:20, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, marginBottom:16, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              {[
                { key:"name", label:"Competitor name *", placeholder:"e.g. Bright Now Dental Houston", full:true },
                { key:"location", label:"Location", placeholder:"e.g. Houston, TX", full:false },
                { key:"notes", label:"Notes", placeholder:"Any context...", full:false },
              ].map(field=>(
                <div key={field.key} style={{ gridColumn:field.full?"1 / -1":"auto" }}>
                  <label style={{ fontSize:11, color:C.textDim, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:5 }}>{field.label}</label>
                  <input value={compForm[field.key]} onChange={e=>setCompForm(prev=>({...prev,[field.key]:e.target.value}))} placeholder={field.placeholder} style={{ width:"100%", padding:"8px 12px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:"'Geist', sans-serif", color:C.textPrimary, outline:"none" }} />
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={()=>setShowCompForm(false)} className="btn-ghost" style={{ padding:"7px 14px", border:`1px solid ${C.border}`, borderRadius:7, background:"white", color:C.textSecondary, fontSize:13, cursor:"pointer", fontFamily:"'Geist', sans-serif" }}>Cancel</button>
              <button onClick={addCompetitor} disabled={savingComp||!compForm.name.trim()} className="btn-primary" style={{ padding:"7px 16px", background:savingComp||!compForm.name.trim()?"#9ca3af":C.blue, color:"white", border:"none", borderRadius:7, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'Geist', sans-serif" }}>
                {savingComp?"Saving...":"Add competitor"}
              </button>
            </div>
          </div>
        )}

        {/* Competitor cards */}
        {competitors.length === 0 ? (
          <div style={{ padding:"48px 0", textAlign:"center", border:`1px dashed ${C.border}`, borderRadius:12, color:C.textDim, fontSize:14 }}>
            No competitors yet — add one above
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:40 }}>
            {competitors.map(comp => {
              const compAnalyses = analysesByCompetitor[comp.id] || [];
              const latest = compAnalyses[0];
              const isScrapingThis = scraping[comp.id];
              const resultForThis = scrapeResults[comp.id];

              return (
                <div key={comp.id} style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
                  {/* Competitor header */}
                  <div style={{ padding:"18px 20px", display:"flex", alignItems:"flex-start", gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                        <span style={{ fontWeight:600, fontSize:15, color:C.textPrimary }}>{comp.name}</span>
                        {latest && (
                          <span style={{ padding:"2px 8px", background:sentimentBg[latest.overall_sentiment]||"#f9fafb", border:`1px solid ${sentimentBorder[latest.overall_sentiment]||"#e5e7eb"}`, borderRadius:20, fontSize:11, color:sentimentColor[latest.overall_sentiment]||"#6b7280", fontWeight:600 }}>
                            {latest.overall_sentiment}
                          </span>
                        )}
                      </div>
                      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                        {comp.location && <span style={{ fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace" }}>{comp.location}</span>}
                        <span style={{ fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace" }}>{compAnalyses.length} analys{compAnalyses.length!==1?"es":"is"}</span>
                        {latest && <span style={{ fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace" }}>Last run {latest.created_at?.slice(0,10)}</span>}
                      </div>
                      {latest?.summary && <p style={{ fontSize:13, color:C.textSecondary, marginTop:8, lineHeight:1.6 }}>{latest.summary}</p>}
                    </div>
                    <button onClick={()=>deleteCompetitor(comp.id)} style={{ padding:"4px 10px", border:"1px solid #fecaca", borderRadius:6, background:"#fef2f2", color:"#dc2626", fontSize:11, cursor:"pointer", fontFamily:"'Geist', sans-serif", flexShrink:0 }}>Remove</button>
                  </div>

                  {/* Scrape row */}
                  <div style={{ padding:"14px 20px", borderTop:`1px solid ${C.border}`, background:C.bgMuted, display:"flex", gap:8, alignItems:"center" }}>
                    <input
                      value={scrapeUrls[comp.id]||""}
                      onChange={e=>setScrapeUrls(prev=>({...prev,[comp.id]:e.target.value}))}
                      placeholder="Paste Yelp, Healthgrades, or other review page URL..."
                      style={{ flex:1, padding:"8px 12px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:"'Geist Mono', monospace", color:C.textPrimary, background:"white", outline:"none" }}
                      onKeyDown={e=>{ if(e.key==="Enter") scrapeCompetitor(comp); }}
                    />
                    <button
                      onClick={()=>scrapeCompetitor(comp)}
                      disabled={isScrapingThis||!scrapeUrls[comp.id]?.trim()}
                      style={{ padding:"8px 16px", background:isScrapingThis||!scrapeUrls[comp.id]?.trim()?"#9ca3af":"#1a1a1a", color:"white", border:"none", borderRadius:7, fontSize:13, fontWeight:600, cursor:isScrapingThis?"wait":"pointer", fontFamily:"'Geist', sans-serif", whiteSpace:"nowrap" }}
                    >
                      {isScrapingThis?"Scraping...":"Scrape →"}
                    </button>
                  </div>

                  {/* Scrape result */}
                  {resultForThis && !resultForThis.error && (
                    <div style={{ padding:"16px 20px", borderTop:`1px solid ${C.border}`, background:"#eff6ff" }}>
                      <div style={{ fontSize:11, color:C.blue, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Latest result</div>
                      <p style={{ fontSize:13, color:C.textSecondary, lineHeight:1.7, marginBottom:10 }}>{resultForThis.summary}</p>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                        {resultForThis.pain_points?.slice(0,3).length>0 && (
                          <div>
                            <div style={{ fontSize:10, color:"#dc2626", fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>Pain Points</div>
                            {resultForThis.pain_points.slice(0,3).map((p,i)=><div key={i} style={{ fontSize:12, color:"#b91c1c", marginBottom:3 }}>- {p}</div>)}
                          </div>
                        )}
                        {resultForThis.praise_points?.slice(0,3).length>0 && (
                          <div>
                            <div style={{ fontSize:10, color:"#16a34a", fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>Praise</div>
                            {resultForThis.praise_points.slice(0,3).map((p,i)=><div key={i} style={{ fontSize:12, color:"#15803d", marginBottom:3 }}>- {p}</div>)}
                          </div>
                        )}
                        {resultForThis.themes?.slice(0,3).length>0 && (
                          <div>
                            <div style={{ fontSize:10, color:C.textDim, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>Themes</div>
                            {resultForThis.themes.slice(0,3).map((t,i)=><div key={i} style={{ fontSize:12, color:C.textSecondary, marginBottom:3 }}>- {t}</div>)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {resultForThis?.error && (
                    <div style={{ padding:"12px 20px", borderTop:`1px solid ${C.border}`, background:"#fef2f2" }}>
                      <span style={{ fontSize:13, color:"#dc2626" }}>Error: {resultForThis.error}</span>
                    </div>
                  )}
                  {resultForThis && !resultForThis.error && (
                    <div style={{ padding:"12px 20px", borderTop:`1px solid ${C.border}`, background:C.bgMuted, display:"flex", justifyContent:"flex-end" }}>
                      <a href="/dashboard" style={{ padding:"7px 16px", background:"#1a1a1a", borderRadius:8, color:"white", fontSize:12, fontWeight:600, textDecoration:"none", fontFamily:"'Geist', sans-serif" }}>View in Dashboard →</a>
                    </div>
                  )}

                  {/* Previous analyses */}
                  {compAnalyses.length > 0 && (
                    <div style={{ padding:"14px 20px", borderTop:`1px solid ${C.border}` }}>
                      <div style={{ fontSize:11, color:C.textDim, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>History</div>
                      {compAnalyses.map((a,i)=>(
                        <div key={a.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:i<compAnalyses.length-1?`1px solid ${C.border}`:"none" }}>
                          <span style={{ fontFamily:"'Libre Baskerville', serif", fontSize:14, fontWeight:700, color:sentimentColor[a.overall_sentiment]||C.textDim, minWidth:24 }}>{a.sentiment_score}</span>
                          <span style={{ fontSize:12, color:C.textSecondary, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{(a.url||"").replace("https://","")}</span>
                          <span style={{ fontSize:11, color:C.textDim, fontFamily:"'Geist Mono', monospace" }}>{a.created_at?.slice(0,10)}</span>
                          <span style={{ padding:"2px 8px", background:sentimentBg[a.overall_sentiment]||"#f9fafb", border:`1px solid ${sentimentBorder[a.overall_sentiment]||"#e5e7eb"}`, borderRadius:20, fontSize:10, color:sentimentColor[a.overall_sentiment]||"#6b7280", fontWeight:600 }}>{a.overall_sentiment}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}