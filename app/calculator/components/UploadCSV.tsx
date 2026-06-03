"use client";

import { parseFile } from "../../lib/parseFile";

export function UploadCSV({ onLoad }: { onLoad: (rows: any[], filename: string) => void }) {
  return (
    <div>
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const data = await parseFile(file);
          onLoad(data, file.name);
        }}
      />
    </div>
  );
}
