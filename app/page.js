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

function ResultCard({ result }) {
  const [expanded, setExpanded] = useState(false);

  if (result.error) {
    return (
      <div style={{ padding: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>Failed</div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>{result.url}</div>
        <div style={{ fontSize: 13, color: "#7f1d1d" }}>{result.error}</div>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: 16, background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
      >
        <span style={{ fontSize: 20 }}>{sentimentEmoji[result.overall_sentiment]}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: sentimentColor[result.overall_sentiment], textTransform: "capitalize" }}>
            {result.overall_sentiment} - {result.sentiment_score}/10
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{result.url}</div>
        </div>
        <span style={{ color: "#94a3b8", fontSize: 12 }}>{expanded ? "collapse" : "expand"}</span>
      </div>

      {expanded && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>{result.summary}</p>

          <div style={{ padding: 12, background: "#fefce8", borderRadius: 8, border: "1px solid #fef08a" }}>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Key Quote</div>
            <p style={{ margin: 0, fontStyle: "italic", color: "#713f12", fontSize: 13 }}>"{result.key_quote}"</p>
          </div>

          {result.themes && result.themes.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Themes</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.themes.map((theme) => (
                  <span key={theme} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, background: "#f1f5f9", color: "#334155" }}>
                    {sentimentEmoji[result.sentiment_per_theme && result.sentiment_per_theme[theme]]} {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {result.pain_points && result.pain_points.length > 0 && (
              <div style={{ padding: 12, background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Pain Points</div>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                  {result.pain_points.map((p, i) => <li key={i} style={{ color: "#7f1d1d", fontSize: 13 }}>{p}</li>)}
                </ul>
              </div>
            )}
            {result.praise_points && result.praise_points.length > 0 && (
              <div style={{ padding: 12, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Praise Points</div>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                  {result.praise_points.map((p, i) => <li key={i} style={{ color: "#14532d", fontSize: 13 }}>{p}</li>)}
                </ul>
              </div>
            )}
          </div>

          {result.competitor_mentions && result.competitor_mentions.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Competitors</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.competitor_mentions.map((c, i) => (
                  <span key={i} style={{ padding: "3px 10px", background: "#f1f5f9", borderRadius: 20, fontSize: 12 }}>{c}</span>
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
  const sentimentCounts = successful.reduce((acc, r) => {
    acc[r.overall_sentiment] = (acc[r.overall_sentiment] || 0) + 1;
    return acc;
  }, {});

  const allCompetitors = [...new Set(successful.flatMap((r) => r.competitor_mentions || []))];
  const allPainPoints = successful.flatMap((r) => r.pain_points || []).slice(0, 6);

  return (
    <div style={{ padding: 20, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 24 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Batch Summary - {successful.length} URLs analyzed</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <div style={{ padding: 12, background: "white", borderRadius: 8, textAlign: "center", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#6366f1" }}>{avgScore}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Avg Score</div>
        </div>
        {Object.entries(sentimentCounts).map(([sentiment, count]) => (
          <div key={sentiment} style={{ padding: 12, background: "white", borderRadius: 8, textAlign: "center", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: sentimentColor[sentiment] }}>{count}</div>
            <div style={{ fontSize: 12, color: "#64748b", textTransform: "capitalize" }}>{sentiment}</div>
          </div>
        ))}
      </div>

      {allCompetitors.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>All Competitors Mentioned</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {allCompetitors.map((c, i) => (
              <span key={i} style={{ padding: "3px 10px", background: "white", borderRadius: 20, fontSize: 12, border: "1px solid #e2e8f0" }}>{c}</span>
            ))}
          </div>
        </div>
      )}

      {allPainPoints.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Top Pain Points Across All Sources</div>
          <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
            {allPainPoints.map((p, i) => <li key={i} style={{ fontSize: 13, color: "#334155" }}>{p}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState("single");
  const [url, setUrl] = useState("");
  const [batchUrls, setBatchUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [error, setError] = useState(null);

  async function analyzeSingle() {
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

  async function analyzeBatch() {
    const urls = batchUrls.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!urls.length) return;
    setLoading(true);
    setError(null);
    setBatchResults(null);
    setProgress("Analyzing " + urls.length + " URLs...");
    try {
      const res = await fetch("/api/analyze", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBatchResults(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
  <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Sentiment Analyzer</h1>
  <a href="/dashboard" style={{ padding: "10px 20px", background: "#f1f5f9", color: "#334155", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
    View Dashboard →
  </a>
</div>
      <p style={{ color: "#64748b", marginBottom: 24 }}>Analyze sentiment from G2, Capterra, Trustpilot and more</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setMode("single")}
          style={{
            padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
            background: mode === "single" ? "#6366f1" : "#f1f5f9",
            color: mode === "single" ? "white" : "#334155",
            fontWeight: 600, fontSize: 14,
          }}
        >
          Single URL
        </button>
        <button
          onClick={() => setMode("batch")}
          style={{
            padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
            background: mode === "batch" ? "#6366f1" : "#f1f5f9",
            color: mode === "batch" ? "white" : "#334155",
            fontWeight: 600, fontSize: 14,
          }}
        >
          Batch (multiple URLs)
        </button>
      </div>

      {mode === "single" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          <input
            type="text"
            placeholder="https://www.trustpilot.com/review/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyzeSingle()}
            style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 15, outline: "none" }}
          />
          <button
            onClick={analyzeSingle}
            disabled={loading}
            style={{
              padding: "12px 24px", borderRadius: 8, border: "none",
              background: loading ? "#94a3b8" : "#6366f1",
              color: "white", fontSize: 15, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      )}

      {mode === "batch" && (
        <div style={{ marginBottom: 32 }}>
          <textarea
            placeholder={"https://www.trustpilot.com/review/notion.so\nhttps://www.g2.com/products/notion/reviews\nhttps://www.capterra.com/p/notion/reviews/"}
            value={batchUrls}
            onChange={(e) => setBatchUrls(e.target.value)}
            rows={6}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>
              {batchUrls.split("\n").filter((u) => u.trim()).length} URLs entered
            </span>
            <button
              onClick={analyzeBatch}
              disabled={loading}
              style={{
                padding: "12px 24px", borderRadius: 8, border: "none",
                background: loading ? "#94a3b8" : "#6366f1",
                color: "white", fontSize: 15, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Analyzing..." : "Analyze All"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#ef4444", marginBottom: 24 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <p>{progress || "Scraping and analyzing... this takes about 15 seconds"}</p>
        </div>
      )}

      {batchResults && (
        <div>
          <BatchSummary results={batchResults} />
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Individual Results</div>
          {batchResults.map((r, i) => <ResultCard key={i} result={r} />)}
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ padding: 24, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 32 }}>{sentimentEmoji[result.overall_sentiment]}</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, textTransform: "capitalize", color: sentimentColor[result.overall_sentiment] }}>
                  {result.overall_sentiment} - {result.sentiment_score}/10
                </div>
                <div style={{ color: "#64748b", fontSize: 13 }}>Source: {result.source_type} - Confidence: {result.confidence}</div>
              </div>
            </div>
            <p style={{ color: "#334155", lineHeight: 1.6, margin: 0 }}>{result.summary}</p>
          </div>

          <div style={{ padding: 20, background: "#fefce8", borderRadius: 12, border: "1px solid #fef08a" }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Key Quote</div>
            <p style={{ margin: 0, fontStyle: "italic", color: "#713f12" }}>"{result.key_quote}"</p>
          </div>

          {result.themes && result.themes.length > 0 && (
            <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>Themes</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.themes.map((theme) => (
                  <span key={theme} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 500, background: "#f1f5f9", color: "#334155" }}>
                    {sentimentEmoji[result.sentiment_per_theme && result.sentiment_per_theme[theme]]} {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {result.pain_points && result.pain_points.length > 0 && (
              <div style={{ padding: 20, background: "#fef2f2", borderRadius: 12, border: "1px solid #fecaca" }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>Pain Points</div>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                  {result.pain_points.map((p, i) => <li key={i} style={{ color: "#7f1d1d", fontSize: 14 }}>{p}</li>)}
                </ul>
              </div>
            )}
            {result.praise_points && result.praise_points.length > 0 && (
              <div style={{ padding: 20, background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0" }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>Praise Points</div>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                  {result.praise_points.map((p, i) => <li key={i} style={{ color: "#14532d", fontSize: 14 }}>{p}</li>)}
                </ul>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {result.competitor_mentions && result.competitor_mentions.length > 0 && (
              <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>Competitors Mentioned</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {result.competitor_mentions.map((c, i) => (
                    <span key={i} style={{ padding: "4px 12px", background: "#f1f5f9", borderRadius: 20, fontSize: 13 }}>{c}</span>
                  ))}
                </div>
              </div>
            )}
            {result.feature_requests && result.feature_requests.length > 0 && (
              <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>Feature Requests</div>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                  {result.feature_requests.map((f, i) => <li key={i} style={{ fontSize: 14, color: "#334155" }}>{f}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}