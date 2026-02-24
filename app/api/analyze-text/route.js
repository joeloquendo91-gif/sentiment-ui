export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function analyzeText(text, label) {
  const truncated = text.slice(0, 10000);

  const prompt = `You are a brand sentiment analyst. Analyze the following customer reviews for "${label}" and return ONLY valid JSON with no markdown, no code blocks, no explanation.

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
  "key_quote": "<most representative sentence from the reviews>",
  "summary": "<2-3 sentence stakeholder summary>"
}

Reviews:
---
${truncated}
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
    const { text, label, source, reviewCount } = await request.json();

    if (!text) return Response.json({ error: "Text is required" }, { status: 400 });

    const analysis = await analyzeText(text, label);

    // Save to Supabase — use label as URL for tracking
    const { error } = await supabase.from("analyses").insert({
      url: `csv_upload:${label}`,
      source_type: source || "csv_upload",
      ...analysis,
    });

    if (error) console.error("Supabase error:", error.message);

    return Response.json({
      success: true,
      location: label,
      reviewCount,
      ...analysis,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}