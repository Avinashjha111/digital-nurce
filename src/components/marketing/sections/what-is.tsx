import { ShieldCheck } from "lucide-react";
import { Container } from "@/components/marketing/container";
import { SectionHeading } from "@/components/marketing/section-heading";

export function WhatIs() {
  return (
    <section className="border-y bg-muted/30 py-16 sm:py-24">
      <Container className="flex flex-col items-center gap-8">
        <SectionHeading
          eyebrow="What Is Digital Nurse?"
          title="Meet Your Clinic's Digital Patient-Care Assistant"
          description="Digital Nurse connects your clinic's patient workflow with WhatsApp. Your team can upload a prescription, review AI-extracted instructions, approve them, schedule reminders and follow up with patients — all from one system."
        />

        <div className="flex max-w-2xl items-start gap-3 rounded-xl border bg-card p-5">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm font-medium sm:text-base">
            AI assists with extracting information from the doctor&apos;s
            prescription. A human reviews and approves the information
            before reminders are created.
          </p>
        </div>
      </Container>
    </section>
  );
}
