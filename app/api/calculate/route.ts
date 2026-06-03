import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CLIENT_CITY_ALIASES: Record<number, Record<string, string>> = {
  4: {
    "namangan":  "Namangan shahri",
    "urganch":   "Urganch shahri",
  },
};

function resolveCity(clientId: number | null, city: string): string {
  if (clientId === null) return city;
  const map = CLIENT_CITY_ALIASES[clientId];
  return map?.[city.toLowerCase().trim()] ?? city;
}

type InputRow = {
  row_id: string;
  client_name: string | null;
  recipient_name: string | null;
  from_city: string;
  to_city: string;
  service_type_id: number;
  weight: number;
  box_count: number;
};

type RpcRow = Omit<InputRow, "client_name" | "recipient_name">;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows: InputRow[] = body.rows ?? [];
    const saveAnalytics: boolean = body.save_analytics === true;
    const filename: string = body.filename ?? "";
    const normalizedRows: any[] = body.normalized_rows ?? [];

    // ── 0. Diagnose which role Supabase is using ───────────────
    const { data: roleData } = await supabase.rpc("get_current_role" as any);
    console.log("DB role:", roleData);

    // ── 1. Resolve client names → IDs ──────────────────────────
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, name");

    if (clientsError) {
      console.error("Failed to fetch clients:", clientsError.message);
      return Response.json({ error: clientsError.message }, { status: 500 });
    }

    const clientMap = new Map<string, number>();
    for (const c of clients ?? []) {
      clientMap.set(c.name.toLowerCase().trim(), c.id);
    }

    // ── 2. Group rows by resolved client_id ────────────────────
    const groups = new Map<number | null, InputRow[]>();

    for (const row of rows) {
      const key = row.client_name
        ? (clientMap.get(row.client_name.toLowerCase().trim()) ?? null)
        : null;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    // ── 3. Call calculate_deliveries once per client group ──────
    // Process null group first so its log lines are never truncated
    const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === null) return -1;
      if (b === null) return 1;
      return 0;
    });

    const settled = await Promise.all(
      sortedGroups.map(async ([clientId, groupRows]) => {
        const rpcRows: RpcRow[] = groupRows.map(r => ({
          row_id:          r.row_id,
          from_city:       resolveCity(clientId, r.from_city),
          to_city:         resolveCity(clientId, r.to_city),
          service_type_id: r.service_type_id,
          weight:          r.weight,
          box_count:       r.box_count,
        }));

        const sample = rpcRows[0];
        const svcs = [...new Set(rpcRows.map(r => r.service_type_id))].join(",");
        console.log(`→ RPC client_id=${clientId} | ${rpcRows.length} rows | svcs=[${svcs}] | first: ${sample?.from_city}→${sample?.to_city} w=${sample?.weight}`);

        const { data, error } = await supabase.rpc("calculate_deliveries", {
          p_rows:      rpcRows,
          p_client_id: clientId,
        });

        const rpcRowMap = new Map(rpcRows.map(r => [r.row_id, r]));
        const errors = (data as any[])?.filter(r => r.error) ?? [];
        const errSummary = errors.slice(0, 3).map(r => {
          const src = rpcRowMap.get(r.row_id);
          return `${r.row_id}:${src?.from_city}→${src?.to_city} svc=${src?.service_type_id} "${r.error}"`;
        }).join(" | ");
        console.log(`← RPC client_id=${clientId} | ok=${((data as any[])?.length ?? 0) - errors.length} err=${errors.length} | ${errSummary}`);

        if (error) {
          console.error(`RPC error client_id=${clientId}:`, error.message);
          return groupRows.map(r => ({
            row_id:      r.row_id,
            total_price: null,
            error:       error.message,
          }));
        }

        // client_id=12: recipient "YGO UB" → fixed price 10,000
        // clients with +10% markup on all prices
        const inputMap = new Map(groupRows.map(r => [r.row_id, r]));
        return ((data as any[]) ?? []).map(result => {
          if (
            clientId === 12 &&
            inputMap.get(result.row_id)?.recipient_name?.toUpperCase() === "YGO UB"
          ) {
            return { ...result, total_price: 10000, error: null };
          }
          if (
            result.total_price != null &&
            [14, 15, 16, 17, 18, 20, 23, 24, 25, 26, 27, 29, 34].includes(clientId as number)
          ) {
            return { ...result, total_price: Math.round(result.total_price * 1.1) };
          }
          if (clientId === 22 && result.total_price != null) {
            return { ...result, total_price: Math.round(result.total_price * 1.15) };
          }
          return result;
        });
      })
    );

    const allResults = settled.flat();

    // ── Save to BI analytics table if requested ────────────────
    if (saveAnalytics && normalizedRows.length > 0) {
      const sessionId = crypto.randomUUID();
      const resultMap = new Map(allResults.map((r: any) => [r.row_id, r]));

      const biRows = normalizedRows.map((norm: any) => {
        const rowId = String(norm._row_idx);
        const res   = resultMap.get(rowId);
        return {
          session_id:         sessionId,
          filename:           filename || null,
          client_id:          clientMap.get((norm._client_name ?? "").toLowerCase().trim()) ?? null,
          client_name:        norm._client_name ?? null,
          order_id:           norm._order_id ?? null,
          from_city:          norm.from_city ?? null,
          to_city:            norm.to_city ?? null,
          weight:             norm.weight ?? null,
          box_count:          Number(norm.box_count) || null,
          service_type_id:    norm.service_type_id ?? null,
          excel_service_type: norm.excel_service_type ?? null,
          recipient_name:     norm._recipient_name ?? null,
          parse_error:        norm._parse_error ?? null,
          delivery_cost:      res?.total_price ?? null,
          calc_error:         res?.error ?? null,
          raw_row:            norm,
        };
      });

      const orderIdsInBatch = biRows
        .map(r => r.order_id)
        .filter((id): id is string => id != null && id !== "");

      if (orderIdsInBatch.length > 0) {
        const { error: delError } = await supabase
          .from("bi_results")
          .delete()
          .in("order_id", orderIdsInBatch);
        if (delError) console.error("BI delete error:", delError.message);
      }

      const biRowsWithTs = biRows.map(r => ({ ...r, updated_at: new Date().toISOString() }));

      const { error: biError } = await supabase
        .from("bi_results")
        .insert(biRowsWithTs);
      if (biError) {
        console.error("BI insert error:", biError.message);
      } else {
        console.log(`BI inserted ${biRows.length} rows, session=${sessionId}`);
      }
    }

    return Response.json(allResults);
  } catch (err: any) {
    console.error("calculate route unhandled error:", err);
    return Response.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
