import {
  CheckCheck,
  History,
  MessageCircle,
  RefreshCcw,
  Send,
  Smartphone,
} from "lucide-react";
import { Container } from "@/components/marketing/container";
import { SectionHeading } from "@/components/marketing/section-heading";
import { FlowDiagram } from "@/components/marketing/flow-diagram";

const capabilities = [
  { icon: Send, label: "Send messages" },
  { icon: MessageCircle, label: "Receive replies" },
  { icon: CheckCheck, label: "Track message status" },
  { icon: History, label: "Keep conversation history" },
  { icon: RefreshCcw, label: "Send approved reminders" },
  { icon: Smartphone, label: "Follow up with patients" },
];

export function WhatsappSection() {
  return (
    <section className="border-y bg-muted/30 py-16 sm:py-24">
      <Container className="flex flex-col items-center gap-12">
        <SectionHeading
          eyebrow="WhatsApp"
          title="Meet Patients Where They Already Are — WhatsApp"
          description="Patients do not need to install another app just to receive a reminder or respond to the clinic."
        />

        <div className="grid w-full grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6">
            <p className="mb-6 text-center text-sm font-medium text-muted-foreground">
              Patient replies flow into your inbox
            </p>
            <FlowDiagram
              steps={["Patient", "WhatsApp", "Digital Nurse Inbox"]}
            />
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <p className="mb-6 text-center text-sm font-medium text-muted-foreground">
              Clinic messages reach the patient
            </p>
            <FlowDiagram
              steps={["Digital Nurse", "WhatsApp", "Patient"]}
            />
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {capabilities.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center"
            >
              <Icon className="size-5 text-primary" />
              <p className="text-xs font-medium text-muted-foreground">
                {label}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
