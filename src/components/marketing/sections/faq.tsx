import { Container } from "@/components/marketing/container";
import { SectionHeading } from "@/components/marketing/section-heading";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { faqItems } from "@/components/marketing/faq-data";

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 border-y bg-muted/30 py-16 sm:py-24">
      <Container className="flex flex-col items-center gap-12">
        <SectionHeading eyebrow="FAQ" title="Frequently Asked Questions" />
        <div className="w-full max-w-3xl">
          <FaqAccordion items={faqItems} />
        </div>
      </Container>
    </section>
  );
}
