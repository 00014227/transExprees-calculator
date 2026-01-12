export function PreviewTable({ rows }: { rows: any[] }) {
    return (
      <div className="h-full overflow-auto bg-white">
        <table className="min-w-full text-sm border border-gray-300">
          <thead className="sticky top-0 bg-gray-100 border-b border-gray-300">
            <tr className="text-gray-700 font-semibold">
              <th className="px-3 py-2 border-r">Заказ</th>
              <th className="px-3 py-2 border-r">Откуда</th>
              <th className="px-3 py-2 border-r">Куда</th>
              <th className="px-3 py-2 border-r">Тип</th>
              <th className="px-3 py-2 border-r">Вес</th>
              <th className="px-3 py-2">Ошибка</th>
            </tr>
          </thead>
  
          <tbody>
            {rows.map((r, i) => {
              const hasError = Boolean(r._parse_error);
  
              return (
                <tr
                  key={r._order_id}
                  className={`
                    ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    ${hasError ? "bg-red-50" : ""}
                    hover:bg-blue-50
                  `}
                >
                  <td className="px-3 py-2 border-r font-medium text-gray-800">
                    {r._order_id}
                  </td>
                  <td className="px-3 py-2 border-r text-gray-800">{r.from_city}</td>
                  <td className="px-3 py-2 border-r text-gray-800">{r.to_city}</td>
                  <td className="px-3 py-2 border-r text-center text-gray-800">
                    {r.excel_service_type}
                  </td>
                  <td className="px-3 py-2 border-r text-right text-gray-800">
                    {r.weight}
                  </td>
                  <td className="px-3 py-2 text-red-600 font-medium">
                    {r._parse_error || ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
  