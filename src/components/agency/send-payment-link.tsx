"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Send } from "lucide-react";
import { createPlanPaymentLink, createTopUpPaymentLink } from "@/lib/actions/payment-links";
import { Button } from "@/components/ui/button";
import type { Plan, TopUpPack } from "@/lib/types";

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function LinkItem({
  id,
  label,
  price,
  onSend,
}: {
  id: string;
  label: string;
  price: number;
  onSend: (id: string) => Promise<{ error: string | null; shortUrl?: string }>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSend() {
    setPending(true);
    setError(null);
    try {
      const result = await onSend(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setUrl(result.shortUrl ?? null);
    } finally {
      setPending(false);
    }
  }

  async function handleCopy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(price)}</p>
        </div>
        <Button size="sm" variant="outline" disabled={pending} onClick={handleSend}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          {url ? "Send again" : "Send link"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {url && (
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/70"
        >
          {copied ? <Check className="size-3 shrink-0 text-status-success" /> : <Copy className="size-3 shrink-0" />}
          <span className="min-w-0 flex-1 truncate">{url}</span>
        </button>
      )}
    </div>
  );
}

export function SendPaymentLink({
  clinicId,
  plans,
  topUpPacks,
}: {
  clinicId: string;
  plans: Plan[];
  topUpPacks: TopUpPack[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Plans</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {plans.map((plan) => (
            <LinkItem
              key={plan.id}
              id={plan.id}
              label={plan.name}
              price={plan.price}
              onSend={(id) => createPlanPaymentLink(clinicId, id)}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Top-up packs</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {topUpPacks.map((pack) => (
            <LinkItem
              key={pack.id}
              id={pack.id}
              label={pack.name}
              price={pack.price}
              onSend={(id) => createTopUpPaymentLink(clinicId, id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
