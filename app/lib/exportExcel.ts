import * as XLSX from "xlsx";

export function exportToExcel(original: any[], results: any[]) {
  // row_id (backend) ↔ _order_id (excel)
  const map = new Map(results.map(r => [r.row_id, r]));

  const merged = original.map(row => {
    const res = map.get(row._order_id);

    // 👉 Клонируем строку, НЕ меняя существующие колонки
    return {
      ...row,
      "Стоимость доставки": res?.total_price ?? ""
    };
  });

  const ws = XLSX.utils.json_to_sheet(merged, {
    skipHeader: false
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Результат");

  XLSX.writeFile(wb, "delivery_calculation.xlsx");
}
