import {
  CalendarCheck2,
  Eye,
  MessageSquareHeart,
  RefreshCcw,
  TrendingDown,
  Workflow,
} from "lucide-react";
import { Container } from "@/components/marketing/container";
import { SectionHeading } from "@/components/marketing/section-heading";

const benefits = [
  { icon: TrendingDown, title: "Save Receptionist Time" },
  { icon: CalendarCheck2, title: "Reduce Missed Follow-Ups" },
  { icon: MessageSquareHeart, title: "Improve Patient Communication" },
  { icon: RefreshCcw, title: "Reduce Manual Prescription Re-entry" },
  { icon: Eye, title: "Improve Team Visibility" },
  { icon: Workflow, title: "Create a Consistent Follow-Up Workflow" },
];

export function Benefits() {
  return (
    <section className="border-y bg-muted/30 py-16 sm:py-24">
      <Container className="flex flex-col gap-12">
        <SectionHeading title="Built to Reduce Manual Patient Follow-Up" />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map(({ icon: Icon, title }) => (
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
    </section>
  );
}
