"use client";

import { useState } from "react";
import { UploadCSV } from "./components/UploadCSV";
import { PreviewTable } from "./components/PreviewTable";
import { ResultTable } from "./components/ResultTable";
import { normalizeRows } from "../lib/normalizeRows";
import { exportToExcel } from "../lib/exportExcel";

export default function CalculatorPage() {
  const [normalized, setNormalized] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function calculate() {
    setLoading(true);

    const payload = normalized
      .filter(r => !r._parse_error)
      .map(r => ({
        row_id: String(r._row_idx),
        client_name: r._client_name ?? null,
        from_city: String(r.from_city).trim(),
        to_city: String(r.to_city).trim(),
        service_type_id: Number(r.service_type_id),
        weight: Number(String(r.weight).replace(",", ".")),
        box_count: Number(r.box_count) || 1,
      }));

    try {
      const res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("API error:", res.status, text);
        alert(`Ошибка сервера ${res.status}. Подробности в консоли.`);
        return;
      }

      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("calculate error:", err);
      alert("Ошибка при расчёте. Подробности в консоли.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* HEADER */}
      <div className="p-4 border-b bg-white">
        <h1 className="text-xl font-semibold">Калькулятор доставки</h1>
      </div>

      {/* ACTION BAR */}
      <div className="p-4 bg-white border-b flex items-center gap-4">
        <UploadCSV
          onLoad={(rows) => {
            setNormalized(normalizeRows(rows));
            setResults([]);
          }}
        />

        <button
          onClick={calculate}
          disabled={loading || normalized.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? "Расчёт..." : "Рассчитать"}
        </button>

        {results.length > 0 && (
          <button
            onClick={() => exportToExcel(normalized, results)}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Экспорт в Excel
          </button>
        )}
      </div>

      {/* TABLE AREA */}
      <div className="flex-1 overflow-hidden">
        {normalized.length > 0 && results.length === 0 && (
          <PreviewTable rows={normalized} />
        )}

        {results.length > 0 && (
          <ResultTable rows={normalized} results={results} />
        )}
      </div>
    </div>
  );
}
