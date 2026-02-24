export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Firecrawl handles all URLs including Reddit on Vercel

function detectSource(url) {
  if (url.includes("reddit.com")) return "reddit";
  if (url.includes("g2.com")) return "g2";
  if (url.includes("capterra.com")) return "capterra";
  if (url.includes("trustpilot.com")) return "trustpilot";
  return "other";
}

async function scrapeUrl(url) {
  // Reddit has a free JSON API that works if we use a browser user agent
  if (url.includes("reddit.com")) {
    const jsonUrl = url.replace(/\/?$/, ".json") + "?limit=100";
    const res = await fetch(jsonUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
      },
    });
    const text = await res.text();
    if (text.startsWith("<")) throw new Error("Reddit blocked the request");
    const data = JSON.parse(text);
    const post = data[0]?.data?.children[0]?.data;
    const comments = data[1]?.data?.children || [];
    const commentText = comments
      .map((c) => c.data?.body)
      .filter(Boolean)
      .join("\n\n");
    return `POST: ${post?.title}\n\n${post?.selftext}\n\nCOMMENTS:\n${commentText}`;
  }

  // Firecrawl for G2, Capterra, etc.
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Scraping failed: ${data.error}`);
  return data.data?.markdown || "";
}

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
    const { url } = await request.json();
    if (!url) return Response.json({ error: "URL is required" }, { status: 400 });

    const sourceType = detectSource(url);
    const rawText = await scrapeUrl(url);

    if (!rawText || rawText.length < 100) {
      return Response.json({ error: "Not enough content extracted from URL" }, { status: 422 });
    }

    const analysis = await analyzeContent(rawText, sourceType);

    const { error } = await supabase.from("analyses").insert({
      url,
      source_type: sourceType,
      ...analysis,
    });

    if (error) throw new Error(`Supabase error: ${error.message}`);

    return Response.json({ success: true, url, source_type: sourceType, ...analysis });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
export async function PUT(request) {
  try {
    const { urls } = await request.json();
    if (!urls || !urls.length) return Response.json({ error: "URLs are required" }, { status: 400 });

    const results = [];
    for (const url of urls) {
      try {
        const sourceType = detectSource(url);
        const rawText = await scrapeUrl(url);
        if (!rawText || rawText.length < 100) {
          results.push({ url, error: "Not enough content extracted" });
          continue;
        }
        const analysis = await analyzeContent(rawText, sourceType);
        await supabase.from("analyses").insert({ url, source_type: sourceType, ...analysis });
        results.push({ url, source_type: sourceType, ...analysis });
      } catch (err) {
        results.push({ url, error: err.message });
      }
    }

    return Response.json({ success: true, results });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}