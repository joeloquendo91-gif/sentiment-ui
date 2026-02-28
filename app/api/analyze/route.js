//v3
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function detectSource(url) {
  if (url.includes("reddit.com")) return "reddit";
  if (url.includes("g2.com")) return "g2";
  if (url.includes("capterra.com")) return "capterra";
  if (url.includes("trustpilot.com")) return "trustpilot";
  if (url.includes("yelp.com")) return "yelp";
  if (url.includes("healthgrades.com")) return "healthgrades";
  if (url.includes("zocdoc.com")) return "zocdoc";
  if (url.includes("webmd.com")) return "webmd";
  return "other";
}

// ─── Apify Scrapers (ready but not active until APIFY_API_KEY is set) ────────
// To activate: add APIFY_API_KEY to your Vercel environment variables
// Apify actor IDs for each platform:
//   Yelp:         yelp/yelp-scraper
//   Healthgrades: (use web-scraper with pagination config)
//   Google:       compass/google-maps-reviews-scraper

async function scrapeWithApify(url, sourceType) {
  const APIFY_KEY = process.env.APIFY_API_KEY;
  if (!APIFY_KEY) throw new Error("Apify not configured");

  const actorMap = {
    yelp: "yelp/yelp-scraper",
    healthgrades: "apify/web-scraper",
    google: "compass/google-maps-reviews-scraper",
  };

  const actor = actorMap[sourceType];
  if (!actor) throw new Error(`No Apify actor configured for ${sourceType}`);

  // Start the actor run
  const startRes = await fetch(`https://api.apify.com/v2/acts/${actor}/runs?token=${APIFY_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startUrls: [{ url }],
      maxReviews: 100, // cap at 100 for now
    }),
  });
  const { data: runData } = await startRes.json();
  const runId = runData.id;

  // Poll until finished (max 60 seconds)
  let status = "RUNNING";
  let attempts = 0;
  while (status === "RUNNING" && attempts < 12) {
    await new Promise(r => setTimeout(r, 5000));
    const statusRes = await fetch(`https://api.apify.com/v2/acts/${actor}/runs/${runId}?token=${APIFY_KEY}`);
    const { data } = await statusRes.json();
    status = data.status;
    attempts++;
  }

  if (status !== "SUCCEEDED") throw new Error(`Apify run did not complete: ${status}`);

  // Fetch results
  const resultsRes = await fetch(`https://api.apify.com/v2/acts/${actor}/runs/${runId}/dataset/items?token=${APIFY_KEY}`);
  const items = await resultsRes.json();

  // Flatten reviews into text
  return items
    .map(item => `Rating: ${item.rating || item.stars || "?"}/5\n${item.text || item.review || item.body || ""}`)
    .filter(Boolean)
    .join("\n\n---\n\n");
}

// ─── Firecrawl (current default) ─────────────────────────────────────────────
async function scrapeWithFirecrawl(url) {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Firecrawl error: ${JSON.stringify(data)}`);
  return data.data?.markdown || "";
}

// ─── Main scrape function — auto-selects Apify or Firecrawl ──────────────────
async function scrapeUrl(url, sourceType) {
  // Reddit: use native JSON API (no scraper needed)
  if (url.includes("reddit.com")) {
    const jsonUrl = url.replace(/\/?$/, ".json") + "?limit=100";
    const res = await fetch(jsonUrl, { headers: { "User-Agent": "sentiment-poc/0.1" } });
    const data = await res.json();
    const post = data[0]?.data?.children[0]?.data;
    const comments = data[1]?.data?.children || [];
    const commentText = comments.map(c => c.data?.body).filter(Boolean).join("\n\n");
    return `POST: ${post?.title}\n\n${post?.selftext}\n\nCOMMENTS:\n${commentText}`;
  }

  // Apify-supported sources: use Apify if key is present, otherwise fall back to Firecrawl
  const apifySources = ["yelp", "healthgrades", "google"];
  if (apifySources.includes(sourceType) && process.env.APIFY_API_KEY) {
    try {
      return await scrapeWithApify(url, sourceType);
    } catch (err) {
      console.warn(`Apify failed for ${sourceType}, falling back to Firecrawl:`, err.message);
      return await scrapeWithFirecrawl(url);
    }
  }

  // Default: Firecrawl
  return await scrapeWithFirecrawl(url);
}

// ─── Claude Analysis ──────────────────────────────────────────────────────────
async function analyzeContent(text, sourceType) {
  const truncatedText = text.slice(0, 8000);
  const prompt = `You are a brand sentiment analyst. Analyze the following content from ${sourceType} and return ONLY valid JSON with no markdown, no code blocks, no explanation.

Return this exact structure:
{
  "overall_sentiment": "positive" | "negative" | "mixed" | "neutral",
  "sentiment_score": <number 1-10>,
  "confidence": "high" | "medium" | "low",
  "themes": ["<theme1>", "<theme2>"],
  "sentiment_per_theme": { "<theme>": "positive" | "negative" | "mixed" | "neutral" },
  "pain_points": ["<complaint>"],
  "praise_points": ["<positive>"],
  "competitor_mentions": ["<competitor>"],
  "feature_requests": ["<request>"],
  "key_quote": "<most representative sentence>",
  "summary": "<2-3 sentence stakeholder summary>"
}

Content:
---
${truncatedText}
---`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].text;
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Failed to parse Claude response");
  }
}

export async function POST(request) {
  try {
    const { url, project_name, competitor_id, client_id } = await request.json();
    if (!url) return Response.json({ error: "URL is required" }, { status: 400 });

    const sourceType = detectSource(url);
    const rawText = await scrapeUrl(url, sourceType);

    if (!rawText || rawText.length < 100) {
      return Response.json({ error: "Not enough content extracted from URL" }, { status: 422 });
    }

    const analysis = await analyzeContent(rawText, sourceType);

    const insertData = {
      url,
      source_type: sourceType,
      project_name: project_name || "default",
      ...analysis,
    };
    if (client_id) insertData.client_id = client_id;
    if (competitor_id) insertData.competitor_id = competitor_id;

    const { error } = await supabase.from("analyses").insert(insertData);

    if (error) throw new Error(`Supabase error: ${error.message}`);

    return Response.json({ success: true, url, source_type: sourceType, project_name: project_name || "default", client_id: client_id || null, competitor_id: competitor_id || null, ...analysis });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
export async function PUT(request) {
  try {
    const { urls, project_name, client_id, competitor_id } = await request.json();
    if (!urls?.length) return Response.json({ error: "URLs required" }, { status: 400 });

    const results = [];
    for (const url of urls) {
      try {
        const sourceType = detectSource(url);
        const rawText = await scrapeUrl(url, sourceType);
        if (!rawText || rawText.length < 100) {
          results.push({ url, error: "Not enough content extracted" });
          continue;
        }
        const analysis = await analyzeContent(rawText, sourceType);
        const insertData = {
          url,
          source_type: sourceType,
          project_name: project_name || "default",
          raw_text: rawText.slice(0, 50000),
          ...analysis,
        };
        if (client_id) insertData.client_id = client_id;
        if (competitor_id) insertData.competitor_id = competitor_id;
        await supabase.from("analyses").insert(insertData);
        results.push({ url, source_type: sourceType, ...analysis });
      } catch (err) {
        results.push({ url, error: err.message });
      }
      await new Promise(r => setTimeout(r, 2000));
    }

    return Response.json({ success: true, results });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}