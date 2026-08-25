"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusToneBadge, type StatusTone } from "@/components/status-tone-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MediaType, MessageSource, MessageStatus } from "@/lib/types";

export type MessageLogRow = {
  id: string;
  patientName: string;
  body: string;
  mediaType: MediaType | null;
  source: MessageSource;
  status: MessageStatus;
  createdAt: string;
};

const SOURCE_LABEL: Record<MessageSource, string> = {
  inbound: "Received from patient",
  manual: "Staff reply",
  template: "Template (sent by agency)",
  reminder: "Medicine reminder",
  follow_up: "Follow-up nudge",
};

const STATUS_TONE: Record<MessageStatus, StatusTone> = {
  queued: "action",
  sent: "info",
  delivered: "success",
  read: "success",
  failed: "danger",
};

function messagePreview(row: MessageLogRow) {
  if (row.mediaType === "image") return row.body ? `📷 ${row.body}` : "📷 Photo";
  if (row.mediaType === "document") return row.body ? `📄 ${row.body}` : "📄 Document";
  if (row.mediaType === "video") return row.body ? `🎥 ${row.body}` : "🎥 Video";
  if (row.mediaType === "audio") return "🎵 Audio";
  return row.body || "—";
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadCsv(clinicName: string, rows: MessageLogRow[]) {
  const header = ["Date & Time", "Patient", "Message", "Type", "Status"];
  const lines = rows.map((row) =>
    [
      formatDateTime(row.createdAt),
      row.patientName,
      messagePreview(row),
      SOURCE_LABEL[row.source],
      row.status,
    ]
      .map(csvEscape)
      .join(",")
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${clinicName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-message-log.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function MessageLogTable({
  clinicName,
  rows,
}: {
  clinicName: string;
  rows: MessageLogRow[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.patientName.toLowerCase().includes(q) || r.body.toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by patient or message..."
            className="pl-8"
          />
        </div>
        <button
          type="button"
          onClick={() => downloadCsv(clinicName, filtered)}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <Download className="size-3.5" />
          Download report (CSV)
        </button>
      </div>

      {filtered.length === 0 ? (
        <ComingSoon
          icon={MessageCircle}
          title="No matching messages"
          milestone={query ? `Nothing matches "${query}".` : "No messages sent or received yet."}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">{row.patientName}</TableCell>
                    <TableCell className="max-w-sm truncate text-sm">{messagePreview(row)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {SOURCE_LABEL[row.source]}
                    </TableCell>
                    <TableCell>
                      <StatusToneBadge tone={STATUS_TONE[row.status]}>{row.status}</StatusToneBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
