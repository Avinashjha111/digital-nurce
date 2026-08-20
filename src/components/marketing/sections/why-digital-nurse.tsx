import { Container } from "@/components/marketing/container";
import { SectionHeading } from "@/components/marketing/section-heading";
import { FlowDiagram } from "@/components/marketing/flow-diagram";

const journey = [
  "Patient Message",
  "Appointment",
  "Prescription",
  "Reminder",
  "Follow-Up",
  "Revisit",
];

export function WhyDigitalNurse() {
  return (
    <section className="py-16 sm:py-24">
      <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div className="order-2 rounded-2xl border bg-muted/30 p-6 sm:p-8 lg:order-1">
          <FlowDiagram steps={journey} />
        </div>

        <div className="order-1 flex flex-col gap-6 lg:order-2">
          <SectionHeading
            align="left"
            eyebrow="Why Digital Nurse?"
            title="Not Just Another WhatsApp Marketing Tool"
            description="Most communication tools focus mainly on sending campaigns. Digital Nurse is designed around what happens after a patient interacts with the clinic — prescription instructions, reminders, conversations and follow-ups."
          />
        </div>
      </Container>
    </section>
  );
}
