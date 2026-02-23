"use client";
import { useState } from "react";

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

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function analyze() {
    if (!url) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>🎯 Sentiment Analyzer</h1>
      <p style={{ color: "#64748b", marginBottom: 32 }}>Paste a Reddit, G2, or Capterra URL to analyze sentiment</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        <input
          type="text"
          placeholder="https://www.reddit.com/r/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && analyze()}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 15,
            outline: "none",
          }}
        />
        <button
          onClick={analyze}
          disabled={loading}
          style={{
            padding: "12px 24px",
            borderRadius: 8,
            border: "none",
            background: loading ? "#94a3b8" : "#6366f1",
            color: "white",
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {error && (
        <div style={{ padding: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#ef4444", marginBottom: 24 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <p>Scraping and analyzing... this takes about 15 seconds</p>
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ padding: 24, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 32 }}>{sentimentEmoji[result.overall_sentiment]}</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, textTransform: "capitalize", color: sentimentColor[result.overall_sentiment] }}>
                  {result.overall_sentiment} — {result.sentiment_score}/10
                </div>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  Source: {result.source_type} · Confidence: {result.confidence}
                </div>
              </div>
            </div>
            <p style={{ color: "#334155", lineHeight: 1.6, margin: 0 }}>{result.summary}</p>
          </div>

          <div style={{ padding: 20, background: "#fefce8", borderRadius: 12, border: "1px solid #fef08a" }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>💬 Key Quote</div>
            <p style={{ margin: 0, fontStyle: "italic", color: "#713f12" }}>"{result.key_quote}"</p>
          </div>

          {result.themes && result.themes.length > 0 && (
            <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>🏷️ Themes</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.themes.map((theme) => (
                  <span
                    key={theme}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 500,
                      background: "#f1f5f9",
                      color: "#334155",
                    }}
                  >
                    {sentimentEmoji[result.sentiment_per_theme && result.sentiment_per_theme[theme]]} {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {result.pain_points && result.pain_points.length > 0 && (
              <div style={{ padding: 20, background: "#fef2f2", borderRadius: 12, border: "1px solid #fecaca" }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>🔴 Pain Points</div>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                  {result.pain_points.map((p, i) => (
                    <li key={i} style={{ color: "#7f1d1d", fontSize: 14 }}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.praise_points && result.praise_points.length > 0 && (
              <div style={{ padding: 20, background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0" }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>🟢 Praise Points</div>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                  {result.praise_points.map((p, i) => (
                    <li key={i} style={{ color: "#14532d", fontSize: 14 }}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {result.competitor_mentions && result.competitor_mentions.length > 0 && (
              <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>⚔️ Competitors Mentioned</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {result.competitor_mentions.map((c, i) => (
                    <span key={i} style={{ padding: "4px 12px", background: "#f1f5f9", borderRadius: 20, fontSize: 13 }}>{c}</span>
                  ))}
                </div>
              </div>
            )}
            {result.feature_requests && result.feature_requests.length > 0 && (
              <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>💡 Feature Requests</div>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                  {result.feature_requests.map((f, i) => (
                    <li key={i} style={{ fontSize: 14, color: "#334155" }}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

        </div>
      )}
    </main>
  );
}