import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function GET() {
  const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  const { name, location, industry, notes } = await request.json();
  if (!name) return Response.json({ error: "Name required" }, { status: 400 });
  const { data, error } = await supabase.from("clients").insert({ name, location: location||null, industry: industry||null, notes: notes||null }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}