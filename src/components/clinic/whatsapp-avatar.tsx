import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

// A plain initials circle, like WhatsApp shows for a contact with no
// photo. `tone="light"` for use on the teal header (needs to read against
// dark green); `tone="brand"` for use on white surfaces (list, elsewhere
// in the app).
export function WhatsAppAvatar({
  name,
  tone = "brand",
  className,
}: {
  name: string;
  tone?: "light" | "brand";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        tone === "light" ? "bg-white/20 text-white" : "bg-primary/10 text-primary",
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
