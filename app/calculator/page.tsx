"use client";

import { useState } from "react";
import { UploadCSV } from "./components/UploadCSV";
import { PreviewTable } from "./components/PreviewTable";
import { ResultTable } from "./components/ResultTable";
import { normalizeRows } from "../lib/normalizeRows";
import { exportToExcel } from "../lib/exportExcel";
import { ClientSelect } from "./components/ClientSelect";

export default function CalculatorPage() {
    const [rawRows, setRawRows] = useState<any[]>([]);
    const [normalized, setNormalized] = useState<any[]>([]);
    const [clientId, setClientId] = useState<number | null>(null);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    async function calculate() {
      setLoading(true);
    
      const payload = normalized
      .filter(r => !r._parse_error)
      .map(r => ({
        row_id: String(r._order_id),
        from_city: String(r.from_city).trim(),
        to_city: String(r.to_city).trim(),
        service_type_id: Number(r.service_type_id),
        weight: Number(String(r.weight).replace(",", "."))
      }));
    
    
    
    
      const res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: payload,
          clientId
        })
      });
    
      const data = await res.json();
      setResults(data);
      setLoading(false);
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
              setRawRows(rows);
              setNormalized(normalizeRows(rows));
              setResults([]);
            }}
          />

<ClientSelect
    value={clientId}
    onChange={setClientId}
  />
  
  <button
  onClick={calculate}
  disabled={loading}
  className="px-4 py-2 bg-blue-600 text-white rounded"
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
