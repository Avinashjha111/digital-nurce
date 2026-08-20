import { Building2, Stethoscope } from "lucide-react";
import { Container } from "@/components/marketing/container";
import { SectionHeading } from "@/components/marketing/section-heading";
import { FlowDiagram } from "@/components/marketing/flow-diagram";

const agencyCapabilities = [
  "Manage clinics",
  "Configure WhatsApp",
  "Monitor activity",
  "Manage templates",
  "Support clinic accounts",
  "Monitor reminders and follow-ups",
];

const clinicCapabilities = [
  "Manage patients",
  "View conversations",
  "Upload prescriptions",
  "Review AI extraction",
  "Approve reminders",
  "Manage follow-ups",
  "Handle appointment requests",
];

export function AgencyClinicModel() {
  return (
    <section className="border-y bg-muted/30 py-16 sm:py-24">
      <Container className="flex flex-col items-center gap-12">
        <SectionHeading
          eyebrow="How Teams Use Digital Nurse"
          title="One Platform. Two Workspaces."
        />

        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="size-5" />
              </span>
              <h3 className="text-lg font-semibold">Agency Dashboard</h3>
            </div>
            <ul className="flex flex-col gap-2">
              {agencyCapabilities.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Stethoscope className="size-5" />
              </span>
              <h3 className="text-lg font-semibold">Clinic Workspace</h3>
            </div>
            <ul className="flex flex-col gap-2">
              {clinicCapabilities.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="w-full max-w-md rounded-2xl border bg-card p-6">
          <FlowDiagram
            steps={["Agency Dashboard", "Clinic Workspace", "Patient", "WhatsApp"]}
          />
        </div>
      </Container>
    </section>
  );
}
