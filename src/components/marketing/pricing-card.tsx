import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PricingCard({
  name,
  price,
  description,
  features,
  cta,
  href = "/contact",
  highlighted = false,
}: {
  name: string;
  price: string;
  description: string;
  features?: string[];
  cta: string;
  href?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 rounded-2xl border bg-card p-6 sm:p-8",
        highlighted && "border-primary shadow-lg ring-1 ring-primary/20"
      )}
    >
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">{name}</h3>
        <p className="text-3xl font-bold tracking-tight">{price}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {features && (
        <ul className="flex flex-col gap-2.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              {feature}
            </li>
          ))}
        </ul>
      )}

      <Button
        variant={highlighted ? "default" : "outline"}
        className="mt-auto h-10"
        nativeButton={false}
        render={<Link href={href} />}
      >
        {cta}
      </Button>
    </div>
  );
}
