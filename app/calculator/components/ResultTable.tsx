export function ResultTable({
    rows,
    results
  }: {
    rows: any[];
    results: any[];
  }) {
    const map = new Map(results.map(r => [r.row_id, r]));
  
    return (
      <div className="h-full overflow-auto bg-white">
        <table className="min-w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-slate-700 text-white">
            <tr>
              <th className="p-3 border border-slate-600 text-left">#</th>
              <th className="p-3 border border-slate-600 text-left">Откуда</th>
              <th className="p-3 border border-slate-600 text-left">Куда</th>
              <th className="p-3 border border-slate-600 text-right">Вес</th>
              <th className="p-3 border border-slate-600 text-right">Цена</th>
              <th className="p-3 border border-slate-600 text-left">Ошибка</th>
            </tr>
          </thead>
  
          <tbody>
            {rows.map((r, idx) => {
              const res = map.get(r._order_id);
              const isError = r._parse_error || res?.error;
  
              return (
                <tr
                  key={r._order_id}
                  className={`
                    ${isError ? "bg-red-50" : idx % 2 === 0 ? "bg-gray-50" : "bg-white"}
                    hover:bg-blue-50
                    text-gray-900
                  `}
                >
                  <td className="p-2 border">{r._order_id}</td>
                  <td className="p-2 border">{r.from_city}</td>
                  <td className="p-2 border">{r.to_city}</td>
                  <td className="p-2 border text-right">{r.weight}</td>
  
                  <td className={`p-2 border text-right font-semibold ${
                    isError ? "text-gray-400" : "text-green-700"
                  }`}>
                    {res?.total_price ?? "-"}
                  </td>
  
                  <td className="p-2 border text-red-700 text-xs">
                    {r._parse_error ?? res?.error ?? ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
  