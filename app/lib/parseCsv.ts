import Papa from "papaparse";

export function parseCsv(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: r => resolve(r.data),
      error: reject
    });
  });
}