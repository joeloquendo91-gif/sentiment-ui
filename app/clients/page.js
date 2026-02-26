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

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", industry: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchClients(); }, []);

  async function fetchClients() {
    setLoading(true);
    const { data } = await supabase
      .from("clients")
      .select("*, competitors(id)")
      .order("created_at", { ascending: false });
    setClients(data || []);
    setLoading(false);
  }

  async function createClient_() {
    if (!form.name.trim()) return;
    setSaving(true);
    await supabase.from("clients").insert({
      name: form.name.trim(),
      location: form.location.trim() || null,
      industry: form.industry.trim() || null,
      notes: form.notes.trim() || null,
    });
    setForm({ name: "", location: "", industry: "", notes: "" });
    setShowForm(false);
    setSaving(false);
    fetchClients();
  }

  async function deleteClient(id) {
    if (!confirm("Delete this client and all their competitors?")) return;
    await supabase.from("clients").delete().eq("id", id);
    fetchClients();
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fafaf9; }
        .nav-link:hover { border-color: #d0d0cb !important; color: #111110 !important; }
        .client-card:hover { border-color: #d0d0cb !important; box-shadow: 0 4px 12px rgba(0,0,0,0.06) !important; }
        .btn-primary:hover { background: #1d4ed8 !important; }
        .btn-ghost:hover { border-color: #d0d0cb !important; color: #111110 !important; }
        .delete-btn { opacity: 0; transition: opacity 0.15s; }
        .client-card:hover .delete-btn { opacity: 1; }
      `}</style>

      <nav style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 48px", borderBottom:"1px solid #e8e8e5", background:"rgba(250,250,249,0.95)", position:"sticky", top:0, zIndex:100, backdropFilter:"blur(8px)", fontFamily:"'Geist', sans-serif" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, background:"#1a1a1a", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:13, fontWeight:700, fontFamily:"'Libre Baskerville', serif" }}>P</div>
          <span style={{ fontFamily:"'Libre Baskerville', serif", fontWeight:700, fontSize:17, letterSpacing:"-0.01em", color:"#111110" }}>Pulse</span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {[["Analyze","/"],["Clients","/clients"],["CSV Upload","/upload"],["Dashboard","/dashboard"]].map(([label,href])=>(
            <a key={href} href={href} className="nav-link" style={{ padding:"7px 16px", border:"1px solid #e8e8e5", borderRadius:8, color: href==="/clients"?"#111110":"#6b6b63", fontSize:13, fontWeight: href==="/clients"?600:500, textDecoration:"none", background: href==="/clients"?"white":"transparent" }}>{label}</a>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth:900, margin:"0 auto", padding:"48px 24px 80px", fontFamily:"'Geist', sans-serif" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:40 }}>
          <div>
            <div style={{ fontFamily:"'Geist Mono', monospace", fontSize:11, color:C.blue, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>Client Management</div>
            <h1 style={{ fontFamily:"'Libre Baskerville', serif", fontSize:30, fontWeight:700, color:C.textPrimary, letterSpacing:"-0.02em", marginBottom:8 }}>Clients</h1>
            <p style={{ fontSize:15, color:C.textSecondary, lineHeight:1.7 }}>Create a client to organize competitor analysis and intelligence reports.</p>
          </div>
          <button onClick={()=>setShowForm(!showForm)} className="btn-primary" style={{ padding:"10px 20px", background:C.blue, color:"white", border:"none", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'Geist', sans-serif", transition:"background 0.15s" }}>
            + New Client
          </button>
        </div>

        {/* New client form */}
        {showForm && (
          <div style={{ padding:24, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, marginBottom:24, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:16, fontWeight:700, color:C.textPrimary, marginBottom:20 }}>New client</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              {[
                { key:"name", label:"Client name *", placeholder:"e.g. Aspen Dental Houston" },
                { key:"location", label:"Location", placeholder:"e.g. Houston, TX" },
                { key:"industry", label:"Industry", placeholder:"e.g. Dental, Hospital, Legal" },
              ].map(field=>(
                <div key={field.key} style={{ gridColumn: field.key==="name"?"1 / -1":"auto" }}>
                  <label style={{ fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:6 }}>{field.label}</label>
                  <input
                    value={form[field.key]}
                    onChange={e=>setForm(prev=>({...prev,[field.key]:e.target.value}))}
                    placeholder={field.placeholder}
                    style={{ width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:"'Geist', sans-serif", color:C.textPrimary, background:"white", outline:"none" }}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:6 }}>Notes</label>
              <textarea
                value={form.notes}
                onChange={e=>setForm(prev=>({...prev,notes:e.target.value}))}
                placeholder="Any context about this client..."
                rows={2}
                style={{ width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:"'Geist', sans-serif", color:C.textPrimary, background:"white", outline:"none", resize:"vertical" }}
              />
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={()=>setShowForm(false)} className="btn-ghost" style={{ padding:"8px 16px", border:`1px solid ${C.border}`, borderRadius:8, background:"white", color:C.textSecondary, fontSize:13, cursor:"pointer", fontFamily:"'Geist', sans-serif" }}>Cancel</button>
              <button onClick={createClient_} disabled={saving||!form.name.trim()} className="btn-primary" style={{ padding:"8px 20px", background:saving||!form.name.trim()?"#9ca3af":C.blue, color:"white", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:saving?"wait":"pointer", fontFamily:"'Geist', sans-serif" }}>
                {saving?"Saving...":"Create client"}
              </button>
            </div>
          </div>
        )}

        {/* Client list */}
        {loading ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:C.textDim, fontFamily:"'Geist Mono', monospace", fontSize:12 }}>Loading...</div>
        ) : clients.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0" }}>
            <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:18, color:C.textDim, marginBottom:8 }}>No clients yet</div>
            <p style={{ fontSize:14, color:C.textDim }}>Create your first client to get started.</p>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {clients.map(client=>(
              <a key={client.id} href={`/clients/${client.id}`} style={{ textDecoration:"none" }}>
                <div className="client-card" style={{ display:"flex", alignItems:"center", gap:16, padding:"20px 24px", background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, cursor:"pointer", transition:"all 0.15s", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", position:"relative" }}>
                  <div style={{ width:44, height:44, background:C.bgMuted, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Libre Baskerville', serif", fontSize:18, fontWeight:700, color:C.textSecondary, flexShrink:0 }}>
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:15, color:C.textPrimary, marginBottom:4 }}>{client.name}</div>
                    <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                      {client.location && <span style={{ fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace" }}>{client.location}</span>}
                      {client.industry && <span style={{ fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace" }}>{client.industry}</span>}
                      <span style={{ fontSize:12, color:C.textDim, fontFamily:"'Geist Mono', monospace" }}>{client.competitors?.length||0} competitor{client.competitors?.length!==1?"s":""}</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:13, color:C.textDim }}>View →</span>
                    <button
                      className="delete-btn"
                      onClick={e=>{e.preventDefault();e.stopPropagation();deleteClient(client.id);}}
                      style={{ padding:"4px 10px", border:"1px solid #fecaca", borderRadius:6, background:"#fef2f2", color:"#dc2626", fontSize:11, cursor:"pointer", fontFamily:"'Geist', sans-serif" }}
                    >Delete</button>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </>
  );
}