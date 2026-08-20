import {
  CalendarX,
  MessageCircleWarning,
  PhoneCall,
  Pill,
  Users,
} from "lucide-react";
import { Container } from "@/components/marketing/container";
import { SectionHeading } from "@/components/marketing/section-heading";

const problems = [
  {
    icon: CalendarX,
    title: "Missed Follow-Ups",
    description: "Patients forget to return after treatment.",
  },
  {
    icon: PhoneCall,
    title: "Manual Reminders",
    description: "Receptionists repeatedly call or message patients.",
  },
  {
    icon: Pill,
    title: "Prescription Confusion",
    description: "Instructions often have to be manually communicated.",
  },
  {
    icon: MessageCircleWarning,
    title: "Lost WhatsApp Conversations",
    description: "Important patient messages can get buried.",
  },
  {
    icon: Users,
    title: "No Central Visibility",
    description: "Staff may not know which patients need attention.",
  },
];

export function Problem() {
  return (
    <section className="py-16 sm:py-24">
      <Container className="flex flex-col gap-12">
        <SectionHeading title="The Problem Isn't Getting Patients. It's Following Up With Them." />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {problems.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex flex-col gap-3 rounded-xl border bg-card p-5"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <Icon className="size-5" />
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>

        <p className="text-balance text-center text-lg font-medium">
          Digital Nurse brings these patient communication and follow-up
          tasks into one simple workflow.
        </p>
      </Container>
    </section>
  );
}
