import Link from "next/link";
import { ArrowRight, FileCheck2, Plug, UserPlus2, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/marketing/container";
import { SectionHeading } from "@/components/marketing/section-heading";

const steps = [
  {
    icon: Plug,
    title: "Connect Your Clinic",
    description: "Connect the clinic's WhatsApp setup.",
  },
  {
    icon: UserPlus2,
    title: "Add Patients",
    description: "Create/manage patient profiles.",
  },
  {
    icon: FileCheck2,
    title: "Upload & Approve",
    description: "Upload a prescription and review Gemini's extraction.",
  },
  {
    icon: Workflow,
    title: "Follow Up Automatically",
    description:
      "Approved reminders and follow-ups are scheduled and sent through WhatsApp.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 py-16 sm:py-24">
      <Container className="flex flex-col items-center gap-12">
        <SectionHeading title="Simple for Your Team. Easy for Your Patients." />

        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, description }, i) => (
            <div
              key={title}
              className="relative flex flex-col gap-3 rounded-xl border bg-card p-6"
            >
              <span className="text-xs font-semibold text-muted-foreground">
                Step {i + 1}
              </span>
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>

        <Button
          size="lg"
          className="h-11 px-6 text-base"
          nativeButton={false}
          render={<Link href="/contact" />}
        >
          Start With Digital Nurse
          <ArrowRight className="size-4" />
        </Button>
      </Container>
    </section>
  );
}
