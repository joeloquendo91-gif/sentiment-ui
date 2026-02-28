import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const client_id = searchParams.get("client_id");
  if (!client_id) return Response.json({ error: "client_id required" }, { status: 400 });

  const { data } = await supabase
    .from("insights")
    .select("*")
    .eq("client_id", client_id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  return Response.json(data || null);
}

export async function POST(request) {
  const { client_id, analyses, client_name } = await request.json();
  if (!client_id || !analyses?.length) return Response.json({ error: "client_id and analyses required" }, { status: 400 });

  // Aggregate the data to send to Claude
  const themes = {};
  const pains = {};
  const praise = {};
  const platformSentiment = {};
  const summaries = [];

  analyses.forEach(a => {
    // Themes
    (a.themes || []).forEach(t => { themes[t] = (themes[t] || 0) + 1; });
    // Pains
    (a.pain_points || []).forEach(p => { pains[p] = (pains[p] || 0) + 1; });
    // Praise
    (a.praise_points || []).forEach(p => { praise[p] = (praise[p] || 0) + 1; });
    // Platform sentiment
    const src = a.source_type || "other";
    if (!platformSentiment[src]) platformSentiment[src] = { positive: 0, negative: 0, mixed: 0, neutral: 0, total: 0 };
    platformSentiment[src][a.overall_sentiment] = (platformSentiment[src][a.overall_sentiment] || 0) + 1;
    platformSentiment[src].total++;
    // Summaries
    if (a.summary) summaries.push(`[${src}] ${a.summary}`);
  });

  const topThemes = Object.entries(themes).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, c]) => `${t} (${c}x)`).join(", ");
  const topPains = Object.entries(pains).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([p, c]) => `"${p}" (${c}x)`).join("\n- ");
  const topPraise = Object.entries(praise).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p, c]) => `"${p}" (${c}x)`).join("\n- ");
  const platformSummary = Object.entries(platformSentiment).map(([src, s]) =>
    `${src}: ${s.total} reviews, ${Math.round((s.negative / s.total) * 100)}% negative, ${Math.round((s.positive / s.total) * 100)}% positive`
  ).join("\n");

  const prompt = `You are a healthcare reputation analyst preparing strategic insights for ${client_name || "a hospital client"}.

Here is aggregated patient sentiment data from public review platforms:

PLATFORM BREAKDOWN:
${platformSummary}

TOP THEMES (frequency):
${topThemes}

TOP PAIN POINTS:
- ${topPains}

TOP PRAISE:
- ${topPraise}

ANALYSIS SUMMARIES:
${summaries.slice(0, 6).join("\n\n")}

Generate strategic insights in this EXACT JSON format with no markdown, no code blocks:
{
  "executive_summary": "<3-4 sentence executive summary of the overall sentiment picture and what it means strategically>",
  "recommendations": [
    {
      "platform": "<platform name e.g. Google, Yelp, Reddit, All Platforms>",
      "priority": "high" | "medium" | "low",
      "action": "<specific actionable recommendation in 1-2 sentences>",
      "rationale": "<why this matters based on the data, 1 sentence>"
    }
  ],
  "patient_prompts": [
    {
      "question": "<a real question a patient would search or ask, e.g. 'How long is the ER wait at University Hospital?'>",
      "theme": "<which pain point or theme this reflects>",
      "opportunity": "<what the hospital could do to address this information need, 1 sentence>"
    }
  ]
}

Generate 4-5 recommendations and 5-6 patient prompts. Be specific to the data, not generic. Focus on what is actionable.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].text;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error("Failed to parse Claude response");
  }

  // Save to Supabase
  const { data, error } = await supabase.from("insights").insert({
    client_id,
    recommendations: parsed.recommendations,
    patient_prompts: parsed.patient_prompts,
    summary: parsed.executive_summary,
  }).select().single();

  if (error) throw new Error(error.message);
  return Response.json(data);
}