import Papa from "papaparse";

export type ParsedPatientRow = {
  row: number;
  name: string;
  whatsapp_number: string;
};

export type CsvParseResult = {
  rows: ParsedPatientRow[];
  errors: { row: number; reason: string }[];
};

const NAME_HEADER_ALIASES = ["name", "patient name", "patient_name", "full name"];
const PHONE_HEADER_ALIASES = [
  "whatsapp_number",
  "whatsapp number",
  "whatsapp",
  "phone",
  "phone number",
  "mobile",
  "mobile number",
  "number",
];

function normalizeHeader(header: string) {
  return header.trim().toLowerCase();
}

/** Parses a patient-list CSV (flexible header names) into name/phone rows. */
export function parsePatientCsv(text: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  const headers = parsed.meta.fields ?? [];
  const nameKey = headers.find((h) => NAME_HEADER_ALIASES.includes(h));
  const phoneKey = headers.find((h) => PHONE_HEADER_ALIASES.includes(h));

  if (!nameKey || !phoneKey) {
    return {
      rows: [],
      errors: [
        {
          row: 0,
          reason:
            'CSV must have a name column (e.g. "Name") and a phone column (e.g. "WhatsApp Number").',
        },
      ],
    };
  }

  const rows: ParsedPatientRow[] = [];
  const errors: { row: number; reason: string }[] = [];

  parsed.data.forEach((record, i) => {
    const rowNum = i + 2; // +1 for 1-index, +1 for header row
    const name = (record[nameKey] ?? "").trim();
    const whatsapp_number = (record[phoneKey] ?? "").trim();

    if (!name && !whatsapp_number) return; // blank row, ignore silently

    if (!name) {
      errors.push({ row: rowNum, reason: "Missing name" });
      return;
    }
    if (!whatsapp_number) {
      errors.push({ row: rowNum, reason: "Missing WhatsApp number" });
      return;
    }

    rows.push({ row: rowNum, name, whatsapp_number });
  });

  return { rows, errors };
}
