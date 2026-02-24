// v3
"use client";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const sentimentColor = {
  positive: "#22c55e",
  negative: "#ef4444",
  mixed: "#f59e0b",
  neutral: "#94a3b8",
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyses().then((data) => {
      setAnalyses(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <p>Loading analyses...</p>
        </div>
      </main>
    );
  }

  if (!analyses.length) {
    return (
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px", fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Dashboard</h1>
        <div style={{ textAlign: "center", padding: 48, color: "#64748b", background: "#f8fafc", borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <p>No analyses yet. <a href="/" style={{ color: "#6366f1" }}>Analyze some URLs first</a></p>
        </div>
      </main>
    );
  }

  // Compute stats
  const avgScore = (analyses.reduce((sum, a) => sum + (a.sentiment_score || 0), 0) / analyses.length).toFixed(1);

  const sentimentCounts = analyses.reduce((acc, a) => {
    acc[a.overall_sentiment] = (acc[a.overall_sentiment] || 0) + 1;
    return acc;
  }, {});

  const sentimentPieData = Object.entries(sentimentCounts).map(([name, value]) => ({ name, value }));

  const sourceCounts = analyses.reduce((acc, a) => {
    const s = a.source_type || "other";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const sourceBarData = Object.entries(sourceCounts).map(([name, count]) => ({ name, count }));

  const allCompetitors = analyses
    .flatMap((a) => a.competitor_mentions || [])
    .reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {});

  const topCompetitors = Object.entries(allCompetitors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const allPainPoints = analyses.flatMap((a) => a.pain_points || []);
  const allPraisePoints = analyses.flatMap((a) => a.praise_points || []);

  const allThemes = analyses
    .flatMap((a) => a.themes || [])
    .reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});

  const topThemes = Object.entries(allThemes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px", fontFamily: "sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Sentiment Dashboard</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0" }}>{analyses.length} analyses across {Object.keys(sourceCounts).length} sources</p>
        </div>
        <a href="/" style={{ padding: "10px 20px", background: "#6366f1", color: "white", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
          + Analyze More
        </a>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0", textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#6366f1" }}>{avgScore}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Avg Sentiment Score</div>
        </div>
        <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0", textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#22c55e" }}>{sentimentCounts.positive || 0}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Positive</div>
        </div>
        <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0", textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#f59e0b" }}>{sentimentCounts.mixed || 0}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Mixed</div>
        </div>
        <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0", textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#ef4444" }}>{sentimentCounts.negative || 0}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Negative</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

        {/* Sentiment Pie */}
        <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Sentiment Breakdown</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={sentimentPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {sentimentPieData.map((entry) => (
                  <Cell key={entry.name} fill={sentimentColor[entry.name] || "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Themes Bar */}
        <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Top Themes</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topThemes} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Competitors + Sources Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

        {/* Competitors */}
        {topCompetitors.length > 0 && (
          <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Competitors Mentioned</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topCompetitors.map(([name, count]) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, color: "#334155" }}>{name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#6366f1", background: "#eef2ff", padding: "2px 10px", borderRadius: 20 }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Sources Analyzed</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sourceBarData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pain Points + Praise */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 20, background: "#fef2f2", borderRadius: 12, border: "1px solid #fecaca" }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Top Pain Points</div>
          <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
            {allPainPoints.slice(0, 8).map((p, i) => (
              <li key={i} style={{ color: "#7f1d1d", fontSize: 13 }}>{p}</li>
            ))}
          </ul>
        </div>
        <div style={{ padding: 20, background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0" }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Top Praise Points</div>
          <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
            {allPraisePoints.slice(0, 8).map((p, i) => (
              <li key={i} style={{ color: "#14532d", fontSize: 13 }}>{p}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent Analyses Table */}
      <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Recent Analyses</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ textAlign: "left", padding: "8px 0", color: "#64748b", fontWeight: 600 }}>URL</th>
              <th style={{ textAlign: "left", padding: "8px 0", color: "#64748b", fontWeight: 600 }}>Source</th>
              <th style={{ textAlign: "left", padding: "8px 0", color: "#64748b", fontWeight: 600 }}>Sentiment</th>
              <th style={{ textAlign: "left", padding: "8px 0", color: "#64748b", fontWeight: 600 }}>Score</th>
              <th style={{ textAlign: "left", padding: "8px 0", color: "#64748b", fontWeight: 600 }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {analyses.slice(0, 15).map((a) => (
              <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 0", maxWidth: 280 }}>
                  <a href={a.url} target="_blank" rel="noreferrer" style={{ color: "#6366f1", textDecoration: "none", fontSize: 12 }}>
                    {a.url.replace("https://", "").slice(0, 50)}{a.url.length > 58 ? "..." : ""}
                  </a>
                </td>
                <td style={{ padding: "10px 0", color: "#64748b" }}>{a.source_type}</td>
                <td style={{ padding: "10px 0" }}>
                  <span style={{ color: sentimentColor[a.overall_sentiment], fontWeight: 600, textTransform: "capitalize" }}>
                    {a.overall_sentiment}
                  </span>
                </td>
                <td style={{ padding: "10px 0", fontWeight: 600, color: "#334155" }}>{a.sentiment_score}/10</td>
                <td style={{ padding: "10px 0", color: "#94a3b8" }}>
                  {new Date(a.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </main>
  );
}