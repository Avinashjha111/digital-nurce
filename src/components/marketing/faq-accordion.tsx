import { ChevronDown } from "lucide-react";

export function FaqAccordion({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  return (
    <div className="flex w-full flex-col divide-y divide-border rounded-xl border bg-card">
      {items.map((item) => (
        <details key={item.question} className="group px-5 py-4 open:pb-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md">
            {item.question}
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
