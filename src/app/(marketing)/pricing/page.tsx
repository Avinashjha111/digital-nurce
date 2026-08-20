import type { Metadata } from "next";
import { Container } from "@/components/marketing/container";
import { SectionHeading } from "@/components/marketing/section-heading";
import { PricingCard } from "@/components/marketing/pricing-card";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { faqItems } from "@/components/marketing/faq-data";

export const metadata: Metadata = {
  title: "Pricing — Digital Nurse",
  description:
    "Digital Nurse pricing plans for clinics and agencies. Final pricing may vary based on messaging usage and selected features.",
};

export default function PricingPage() {
  return (
    <div className="py-16 sm:py-24">
      <Container className="flex flex-col items-center gap-12">
        <SectionHeading
          eyebrow="Pricing"
          title="Plans That Grow With Your Clinic"
          description="Final pricing may vary based on messaging usage and selected features."
        />

        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
          <PricingCard
            name="Starter"
            price="₹— / month"
            description="For small clinics."
            features={[
              "WhatsApp patient communication",
              "Prescription upload",
              "AI prescription extraction",
              "Medicine reminders",
            ]}
            cta="Contact Us"
          />
          <PricingCard
            name="Growth"
            price="₹— / month"
            description="For growing clinics."
            features={[
              "Everything in Starter",
              "Follow-up tracking",
              "Appointment requests",
              "Priority support",
            ]}
            cta="Contact Us"
            highlighted
          />
          <PricingCard
            name="Custom"
            price="Talk to us"
            description="For larger organizations/agencies."
            features={[
              "Multi-clinic agency dashboard",
              "Template management",
              "Custom messaging usage",
              "Dedicated support",
            ]}
            cta="Contact Us"
          />
        </div>

        <div className="w-full max-w-3xl">
          <SectionHeading title="Pricing FAQ" className="mb-8" />
          <FaqAccordion items={faqItems.slice(0, 4)} />
        </div>
      </Container>
    </div>
  );
}
