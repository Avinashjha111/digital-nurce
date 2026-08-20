import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function FlowDiagram({
  steps,
  className,
}: {
  steps: string[];
  className?: string;
}) {
  return (
    <ol className={cn("flex flex-col items-center", className)}>
      {steps.map((step, i) => (
        <li key={step} className="flex flex-col items-center">
          <span className="rounded-full border bg-card px-5 py-2.5 text-center text-sm font-medium shadow-sm sm:text-base">
            {step}
          </span>
          {i < steps.length - 1 && (
            <ArrowDown
              className="my-2 size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </li>
      ))}
    </ol>
  );
}
