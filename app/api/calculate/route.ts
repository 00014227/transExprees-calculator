import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { rows, clientId } = await req.json();

  const { data, error } = await supabase.rpc(
    "calculate_many_deliveries",
    {
      p_rows: rows,          // 👈 массив
      p_client_id: clientId  // 👈 client
    }
  );
  console.log("Datassss",data)
  if (error) {
    console.error("RPC ERROR:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
  console.log("ROWS SENT TO RPC:", JSON.stringify(rows, null, 2));
  console.log("CLIENT:", clientId);
  
  return Response.json(data);
}

