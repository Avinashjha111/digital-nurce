import type { Metadata } from "next";
import {
  HeartHandshake,
  MessageCircle,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Container } from "@/components/marketing/container";
import { SectionHeading } from "@/components/marketing/section-heading";

export const metadata: Metadata = {
  title: "About — Digital Nurse",
  description:
    "Digital Nurse is being built to reduce the manual work involved in patient communication and follow-up.",
};

const principles = [
  {
    icon: HeartHandshake,
    title: "Human-first healthcare communication",
  },
  {
    icon: Sparkles,
    title: "AI as an assistant, not a doctor",
  },
  {
    icon: Wrench,
    title: "Simple tools for clinic teams",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp-first patient communication",
  },
  {
    icon: HeartHandshake,
    title: "Practical automation",
  },
];

export default function AboutPage() {
  return (
    <div className="py-16 sm:py-24">
      <Container className="flex flex-col items-center gap-12">
        <SectionHeading
          title="Technology That Helps Clinics Stay Connected With Patients"
          description="Digital Nurse is being built to reduce the manual work involved in patient communication and follow-up."
        />

        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {principles.map(({ icon: Icon, title }) => (
            <div
              key={title}
              className="flex items-center gap-4 rounded-xl border bg-card p-5"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <h3 className="font-medium">{title}</h3>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
