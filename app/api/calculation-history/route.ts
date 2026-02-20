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

type HistoryPayload = {
  clientId: number | null;
  requestRows: unknown[];
  responseRows: unknown[];
  requestCount: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as HistoryPayload;

    const { error } = await supabase.from("calculator_usage_history").insert({
      client_id: body.clientId,
      request_rows: body.requestRows ?? [],
      response_rows: body.responseRows ?? [],
      request_count: Number(body.requestCount ?? 0)
    });

    if (error) {
      console.error("CALCULATION HISTORY INSERT ERROR:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown history API error";
    return Response.json({ error: message }, { status: 400 });
  }
}
