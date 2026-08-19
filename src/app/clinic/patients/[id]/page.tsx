import { notFound } from "next/navigation";
import {
  User,
  MessageSquare,
  FileText,
  Bell,
  CalendarClock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Patient } from "@/lib/types";

export default async function ClinicPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single<Patient>();

  if (!patient) notFound();

  return (
    <div>
      <PageHeader title={patient.name} description="Patient profile." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Basic Details
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Row label="WhatsApp number" value={patient.whatsapp_number} />
            <Row
              label="Registered"
              value={new Date(patient.created_at).toLocaleDateString()}
            />
          </CardContent>
        </Card>

        <StubSection
          icon={MessageSquare}
          title="Conversation History"
          milestone="WhatsApp messages with this patient land in Milestone 4."
        />
        <StubSection
          icon={FileText}
          title="Prescriptions"
          milestone="Uploaded prescriptions and AI extraction land in Milestones 5-7."
        />
        <StubSection
          icon={Bell}
          title="Reminders"
          milestone="Medicine reminders land in Milestone 8."
        />
        <StubSection
          icon={CalendarClock}
          title="Follow-ups"
          milestone="Follow-ups and appointment requests land in Milestone 9."
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function StubSection({
  icon: Icon,
  title,
  milestone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  milestone: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{milestone}</p>
      </CardContent>
    </Card>
  );
}
