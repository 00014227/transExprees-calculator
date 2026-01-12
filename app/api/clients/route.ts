import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL) {
  throw new Error("SUPABASE_URL is required");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .order("name");

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return Response.json(data);
}
