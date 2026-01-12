"use client";

import { parseCsv } from "../../lib/parseCsv";

export function UploadCSV({ onLoad }: { onLoad: (rows: any[]) => void }) {
  return (
    <div>
      <input
        type="file"
        accept=".csv"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const data = await parseCsv(file);
          onLoad(data);
        }}
      />
    </div>
  );
}
