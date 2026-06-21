/**
 * Generate a CSV string from an array of objects and trigger download.
 */
export function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const bom = "\uFEFF"; // BOM for Excel UTF-8 compatibility
  const headerLine = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(",");
  const dataLines = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","));
  const csv = bom + [headerLine, ...dataLines].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
