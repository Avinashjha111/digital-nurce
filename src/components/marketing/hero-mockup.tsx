import {
  Bell,
  CalendarClock,
  CheckCircle2,
  FileText,
  MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-md rounded-2xl border bg-card p-3 shadow-xl sm:p-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            AK
          </div>
          <div>
            <p className="text-sm font-medium">Abhishek Kumar</p>
            <p className="text-xs text-muted-foreground">Patient · Follow-up due</p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 text-[10px]">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Active
        </Badge>
      </div>

      <div className="flex flex-col gap-2 py-3">
        <div className="flex items-start gap-2 rounded-lg bg-muted p-2.5">
          <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-xs text-foreground sm:text-sm">
            Reminder: Take your Vitamin D tablet after breakfast today.
          </p>
        </div>
        <div className="flex items-start justify-end gap-2 rounded-lg bg-primary/10 p-2.5">
          <p className="text-xs text-foreground sm:text-sm">
            Thank you, taken already 🙏
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 border-t pt-3 sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-lg border p-2">
          <FileText className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium">Prescription</p>
            <p className="text-[10px] text-muted-foreground">Reviewed</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border p-2">
          <Bell className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium">Reminder</p>
            <p className="text-[10px] text-muted-foreground">9:00 AM daily</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border p-2">
          <CalendarClock className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium">Follow-up</p>
            <p className="text-[10px] text-muted-foreground">In 3 days</p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400">
        <CheckCircle2 className="size-3.5 shrink-0" />
        <p className="text-[11px] font-medium">
          AI-extracted instructions approved by Dr. Sharma
        </p>
      </div>
    </div>
  );
}
