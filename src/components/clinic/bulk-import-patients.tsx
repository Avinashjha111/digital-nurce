"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Loader2, Download } from "lucide-react";
import { parsePatientCsv, type ParsedPatientRow } from "@/lib/csv-patients";
import { bulkCreatePatients } from "@/lib/actions/patients";
import { Button } from "@/components/ui/button";

const SAMPLE_CSV = "Name,WhatsApp Number\nAsha Verma,+91 98765 43210\n";

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "patient-import-sample.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function BulkImportPatients() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedPatientRow[]>([]);
  const [parseErrors, setParseErrors] = useState<{ row: number; reason: string }[]>([]);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    error: string | null;
    inserted: number;
    skipped: { row: number; reason: string }[];
  } | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setResult(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parsePatientCsv(text);
      setRows(parsed.rows);
      setParseErrors(parsed.errors);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setPending(true);
    try {
      const outcome = await bulkCreatePatients(rows);
      setResult(outcome);
      if (!outcome.error && outcome.inserted > 0) {
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setFileName(null);
    setRows([]);
    setParseErrors([]);
    setResult(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileSpreadsheet className="size-4" />
          Choose CSV file
        </Button>
        <button
          type="button"
          onClick={downloadSampleCsv}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <Download className="size-3.5" />
          Download sample CSV
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Export your patient list from Excel or Google Sheets as CSV first (File → Download →
        CSV). The file needs a name column and a WhatsApp number column.
      </p>

      {fileName && !result && (
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium">{fileName}</p>
          <p className="mt-1 text-muted-foreground">
            {rows.length} valid row{rows.length === 1 ? "" : "s"} found
            {parseErrors.length > 0 &&
              `, ${parseErrors.length} row${parseErrors.length === 1 ? "" : "s"} skipped`}
          </p>

          {rows.length > 0 && (
            <div className="mt-3 max-h-48 overflow-y-auto rounded border">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-1 text-left">Row</th>
                    <th className="px-2 py-1 text-left">Name</th>
                    <th className="px-2 py-1 text-left">WhatsApp Number</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r) => (
                    <tr key={r.row} className="border-t">
                      <td className="px-2 py-1 text-muted-foreground">{r.row}</td>
                      <td className="px-2 py-1">{r.name}</td>
                      <td className="px-2 py-1">{r.whatsapp_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 20 && (
                <p className="p-2 text-center text-muted-foreground">
                  + {rows.length - 20} more
                </p>
              )}
            </div>
          )}

          {parseErrors.length > 0 && (
            <ul className="mt-2 flex flex-col gap-0.5 text-xs text-destructive">
              {parseErrors.slice(0, 10).map((e, i) => (
                <li key={i}>
                  Row {e.row || "?"}: {e.reason}
                </li>
              ))}
            </ul>
          )}

          {rows.length > 0 && (
            <Button type="button" disabled={pending} className="mt-3" onClick={handleImport}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${rows.length} patient${rows.length === 1 ? "" : "s"}`
              )}
            </Button>
          )}
        </div>
      )}

      {result && (
        <div className="rounded-lg border p-3 text-sm">
          {result.error ? (
            <p className="text-destructive">{result.error}</p>
          ) : (
            <>
              <p className="font-medium text-status-success">
                {result.inserted} patient{result.inserted === 1 ? "" : "s"} imported
                successfully.
              </p>
              {result.skipped.length > 0 && (
                <>
                  <p className="mt-2 text-muted-foreground">
                    {result.skipped.length} row{result.skipped.length === 1 ? "" : "s"} skipped:
                  </p>
                  <ul className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                    {result.skipped.slice(0, 10).map((s, i) => (
                      <li key={i}>
                        Row {s.row}: {s.reason}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={reset}>
            Import another file
          </Button>
        </div>
      )}
    </div>
  );
}
