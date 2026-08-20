import { ShieldAlert } from "lucide-react";
import { Container } from "@/components/marketing/container";
import { SectionHeading } from "@/components/marketing/section-heading";
import { FlowDiagram } from "@/components/marketing/flow-diagram";

const steps = [
  "Upload Prescription",
  "Gemini AI",
  "Information Extracted",
  "Human Review",
  "Approve",
  "Reminder Schedule",
  "WhatsApp Reminder",
  "Patient",
];

const explainers = [
  { step: "Upload", detail: "Clinic uploads prescription." },
  { step: "Extract", detail: "Gemini extracts clearly visible instructions." },
  { step: "Review", detail: "Doctor/receptionist checks the extraction." },
  { step: "Approve", detail: "Only approved information creates reminders." },
  { step: "Schedule", detail: "System creates reminder times." },
  { step: "Send", detail: "WhatsApp reminder is sent." },
];

export function AiWorkflow() {
  return (
    <section className="py-16 sm:py-24">
      <Container className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
        <div className="flex flex-col gap-8">
          <SectionHeading
            align="left"
            title="From Prescription to Patient Reminder — Without Re-Entering Everything Manually"
          />

          <ol className="flex flex-col gap-4">
            {explainers.map(({ step, detail }, i) => (
              <li key={step} className="flex gap-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <p className="text-sm sm:text-base">
                  <span className="font-semibold">{step}</span> — {detail}
                </p>
              </li>
            ))}
          </ol>

          <div className="flex items-start gap-3 rounded-xl border bg-card p-5">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              Digital Nurse does not diagnose, prescribe, change medication
              or provide independent medical advice. It helps convert
              approved doctor instructions into patient communication and
              reminders.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-muted/30 p-6 sm:p-8">
          <FlowDiagram steps={steps} />
        </div>
      </Container>
    </section>
  );
}
