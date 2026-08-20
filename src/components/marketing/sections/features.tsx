import {
  BrainCircuit,
  CalendarCheck2,
  FileText,
  Inbox,
  ListChecks,
  MessageCircle,
  UploadCloud,
  UserCheck,
  Users,
} from "lucide-react";
import { Container } from "@/components/marketing/container";
import { SectionHeading } from "@/components/marketing/section-heading";

const features = [
  {
    icon: MessageCircle,
    title: "WhatsApp Patient Communication",
    description:
      "Send and receive patient messages through WhatsApp from the clinic workspace.",
  },
  {
    icon: UploadCloud,
    title: "Prescription Upload",
    description:
      "Upload and store the original prescription with the patient record.",
  },
  {
    icon: BrainCircuit,
    title: "AI Prescription Extraction",
    description:
      "Gemini AI helps extract medicine names, dosage, frequency, duration and explicit instructions.",
  },
  {
    icon: UserCheck,
    title: "Human Approval",
    description:
      "Review, edit or reject AI-extracted information before reminders are created.",
  },
  {
    icon: ListChecks,
    title: "Medicine Reminders",
    description:
      "Turn approved prescription instructions into scheduled WhatsApp reminders.",
  },
  {
    icon: CalendarCheck2,
    title: "Follow-Ups",
    description: "Track upcoming and due patient follow-ups.",
  },
  {
    icon: Users,
    title: "Patient Timeline",
    description:
      "View conversations, prescriptions, reminders and follow-ups together.",
  },
  {
    icon: FileText,
    title: "Appointment Requests",
    description:
      "Allow patients to request an appointment after a follow-up message.",
  },
  {
    icon: Inbox,
    title: "WhatsApp Inbox",
    description: "Keep patient conversations organized in one place.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-16 py-16 sm:py-24">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          eyebrow="Features"
          title="Everything Your Clinic Needs to Stay on Top of Patient Care"
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex flex-col gap-3 rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
