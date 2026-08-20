import { Container } from "@/components/marketing/container";
import { SectionHeading } from "@/components/marketing/section-heading";
import { PricingCard } from "@/components/marketing/pricing-card";

export function PricingPreview() {
  return (
    <section id="pricing" className="scroll-mt-16 py-16 sm:py-24">
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
            cta="Contact Us"
          />
          <PricingCard
            name="Growth"
            price="₹— / month"
            description="For growing clinics."
            cta="Contact Us"
            highlighted
          />
          <PricingCard
            name="Custom"
            price="Talk to us"
            description="For larger organizations/agencies."
            cta="Contact Us"
          />
        </div>
      </Container>
    </section>
  );
}
