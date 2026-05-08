import * as XLSX from "xlsx";

export function exportToExcel(original: any[], results: any[]) {
  // row_id in results = String(_row_idx) set in page.tsx
  const map = new Map(results.map(r => [r.row_id, r]));

  const merged = original.map(row => {
    const res = map.get(String(row._row_idx));
    return {
      ...row,
      "Стоимость доставки": res?.total_price ?? "",
    };
  });

  const ws = XLSX.utils.json_to_sheet(merged, { skipHeader: false });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Результат");
  XLSX.writeFile(wb, "delivery_calculation.xlsx");
}
